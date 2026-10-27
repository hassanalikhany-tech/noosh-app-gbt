import { isAdminSession } from './admin-auth.mjs';
import { isSameOriginMutation } from './request-security.mjs';
import { parseBody } from './community-recipe-lib.mjs';
import { recipeQuantityProblem } from '../../utils/quantitySanity.mjs';
import { createHash } from 'node:crypto';

const response = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(body) });
const validDish = (dish) => dish && typeof dish.id === 'string' && typeof dish.name === 'string' && ['ash','polo','khorak','stew','soup','fastfood','kabab','international','dessert'].includes(dish.category) && Array.isArray(dish.ingredients) && dish.ingredients.every((item) => item && typeof item.item === 'string' && Number.isFinite(item.amount) && item.amount >= 0 && typeof item.unit === 'string') && Array.isArray(dish.recipeSteps) && dish.recipeSteps.every((step) => typeof step === 'string');

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
  if (!isSameOriginMutation(event)) return response(403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' });
  if (!isAdminSession(event)) return response(401, { error: 'نشست مدیریت منقضی شده؛ دوباره وارد شو.' });
  if (!process.env.GITHUB_TOKEN) return response(503, { error: 'دسترسی GitHub در Netlify تنظیم نشده است.' });
  try {
    const payload = parseBody(event, 5_500_000);
    if (!Array.isArray(payload.dishes) || payload.dishes.length < 600 || payload.dishes.length > 2000 || !payload.dishes.every(validDish)) return response(400, { error: 'فهرست غذاها کامل نیست یا ساختار نامعتبر دارد؛ انتشار لغو شد.' });
    const quantityProblem = payload.dishes.flatMap(dish => dish.ingredients.map(item => recipeQuantityProblem(item, dish.servings))).find(Boolean);
    if (quantityProblem) return response(400, { error: quantityProblem });
    if (!Array.isArray(payload.hiddenDishIds) || !payload.hiddenDishIds.every((id) => typeof id === 'string' && id.length < 180)) return response(400, { error: 'فهرست غذاهای پنهان نامعتبر است.' });
    const owner = process.env.GITHUB_OWNER || 'hassanalikhany-tech';
    const repo = process.env.GITHUB_REPO || 'noosh-app-gbt';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path = 'data/recipes_overrides.json';
    const base = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'Noosh-Admin' };
    const existing = await fetch(`${base}?ref=${encodeURIComponent(branch)}`, { headers });
    let sha;
    let existingCatalog = null;
    if (existing.ok) {
      const file = await existing.json();
      sha = file.sha;
      try {
        let text;
        if (file.encoding === 'base64' && file.content) text = Buffer.from(file.content, 'base64').toString('utf8');
        else {
          const blobResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${file.sha}`, { headers });
          if (!blobResponse.ok) throw new Error('Unable to retrieve catalog blob');
          const blob = await blobResponse.json();
          if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('Invalid catalog blob');
          text = Buffer.from(blob.content, 'base64').toString('utf8');
        }
        existingCatalog = JSON.parse(text);
      } catch { return response(409, { error: 'فهرست فعلی قابل خواندن نیست؛ چیزی نوشته نشد.' }); }
    }
    else if (existing.status !== 404) return response(502, { error: 'خواندن نسخهٔ فعلی GitHub انجام نشد.' });
    const currentRevision = createHash('sha256').update(JSON.stringify(existingCatalog)).digest('hex');
    if (!existingCatalog || payload.baseRevision !== currentRevision) return response(409, { error: 'فهرست عمومی پس از بازشدن این صفحه تغییر کرده است؛ صفحه را تازه کن و دوباره تصمیم‌ها را ثبت کن. هیچ تغییر قبلی بازنویسی نشد.' });
    const dishes = new Map(payload.dishes.map(dish => [dish.id, dish]));
    // An older browser cache must not erase community recipes accepted by an admin.
    for (const dish of existingCatalog?.dishes || []) if (dish?.isCommunityRecipe && !dishes.has(dish.id)) dishes.set(dish.id, dish);
    const catalog = { version: 1, dishes: [...dishes.values()], hiddenDishIds: [...new Set(payload.hiddenDishIds)] };
    const content = JSON.stringify(catalog, null, 2) + '\n';
    const committed = await fetch(base, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Update Noosh recipes from admin panel', content: Buffer.from(content).toString('base64'), branch, ...(sha ? { sha } : {}) }) });
    const result = await committed.json().catch(() => ({}));
    if (!committed.ok) return response(502, { error: committed.status === 409 ? 'همزمان نسخهٔ دیگری تغییر کرده؛ صفحه را تازه کن و دوباره ذخیره کن.' : 'ثبت تغییرات در GitHub انجام نشد. دسترسی توکن و شاخهٔ main را بررسی کن.' });
    return response(200, { commit: result.commit?.sha, revision: createHash('sha256').update(JSON.stringify(catalog)).digest('hex'), count: payload.dishes.length, deploy: 'Netlify deploy will start after the GitHub commit.' });
  } catch (error) {
    if ([400, 413].includes(error?.statusCode)) return response(error.statusCode, { error: error.message });
    return response(500, { error: 'ارتباط امن با GitHub انجام نشد؛ نسخهٔ اصلی دست‌نخورده ماند.' });
  }
};
