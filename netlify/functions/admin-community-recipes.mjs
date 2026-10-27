import { isAdminSession } from './admin-auth.mjs';
import { isSameOriginMutation } from './request-security.mjs';
import { decisionKey, decodeRecipeImage, githubSettings, json, parseBody, readGithubJson, requestKey, store, writeGithubJson } from './community-recipe-lib.mjs';

export const handler = async (event) => {
  if (!['GET','POST'].includes(event.httpMethod)) return json(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
  if (event.httpMethod === 'POST' && !isSameOriginMutation(event)) return json(403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' });
  if (!isAdminSession(event)) return json(401, { error: 'نشست مدیریت معتبر نیست؛ دوباره وارد شو.' });
  try {
    const blobs = store(event);
    if (event.httpMethod === 'GET') {
      const cursor = event.queryStringParameters?.cursor;
      const page = await blobs.list({ prefix: 'pending:', limit: 30, ...(cursor ? { cursor } : {}) });
      const requests = await Promise.all(page.blobs.map(async item => {
        const raw = await blobs.get(item.key);
        return raw ? JSON.parse(raw) : null;
      }));
      return json(200, { requests: requests.filter(Boolean).sort((a,b) => b.submittedAt.localeCompare(a.submittedAt)), cursor: page.cursor || null });
    }

    if (!process.env.GITHUB_TOKEN) return json(503, { error: 'دسترسی GitHub در Netlify تنظیم نشده است.' });
    const payload = parseBody(event, 10_000);
    const { id, action } = payload;
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/iu.test(id) || !['approve','reject'].includes(action)) return json(400, { error: 'درخواست مدیریت معتبر نیست.' });
    const key = requestKey(id);
    const raw = await blobs.get(key);
    if (!raw) return json(404, { error: 'این درخواست دیگر در صف بررسی نیست.' });
    const request = JSON.parse(raw);
    if (action === 'reject') {
      if (typeof payload.reason !== 'string' || !payload.reason.trim() || payload.reason.length > 400) return json(400, { error: 'برای رد درخواست، یک دلیل کوتاه برای سازنده بنویس.' });
      const reason = payload.reason.trim();
      await blobs.set(decisionKey(id), JSON.stringify({ status: 'rejected', reason, at: new Date().toISOString() }));
      await blobs.delete(key);
      return json(200, { success: true, status: 'rejected' });
    }

    const { owner, repo, branch } = githubSettings();
    let imageUrl;
    if (request.dish.imageData) {
      const image = decodeRecipeImage(request.dish.imageData);
      if (!image || image.bytes.length > 1_200_000) return json(400, { error: 'فرمت یا حجم عکس درخواست معتبر نیست.' });
      const filePath = `public/community-recipes/${id}.${image.extension}`;
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      const upload = await fetch(url, { method: 'PUT', headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'Noosh-Community-Recipes', 'content-type': 'application/json' }, body: JSON.stringify({ message: `Add community recipe photo ${id}`, content: image.base64, branch }) });
      if (!upload.ok && upload.status !== 422) return json(502, { error: 'بارگذاری عکس در GitHub انجام نشد؛ چیزی به کتابخانه اضافه نشد.' });
      if (upload.status === 422) {
        const existingPhoto = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'Noosh-Community-Recipes' } });
        if (!existingPhoto.ok) return json(502, { error: 'بارگذاری عکس تکراری تشخیص داده شد ولی نسخهٔ قبلی تأیید نشد.' });
      }
      imageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/public/community-recipes/${id}.${image.extension}`;
    }

    const path = 'data/recipes_overrides.json';
    const current = await readGithubJson(path);
    const catalog = current.value && typeof current.value === 'object' ? current.value : { version: 1, dishes: [], hiddenDishIds: [] };
    if (!Array.isArray(catalog.dishes)) catalog.dishes = [];
    const publicDish = { ...request.dish, id: `community-${id}`, isCommunityRecipe: true, creatorName: request.creatorName, creatorTitle: ['lady', 'gentleman', 'none'].includes(request.creatorTitle) ? request.creatorTitle : 'none', hasRealData: true, ...(imageUrl ? { imageUrl } : {}) };
    delete publicDish.imageData;
    delete publicDish.isPersonal;
    catalog.dishes = [...catalog.dishes.filter(item => item.id !== publicDish.id), publicDish];
    const commit = await writeGithubJson(path, catalog, `Publish community recipe: ${publicDish.name}`, current.sha);
    await blobs.set(decisionKey(id), JSON.stringify({ status: 'approved', at: new Date().toISOString(), dishId: publicDish.id }));
    await blobs.delete(key);
    return json(200, { success: true, status: 'published', commit, name: publicDish.name });
  } catch (error) {
    if ([400, 413].includes(error?.statusCode)) return json(error.statusCode, { error: error.message });
    console.error('Admin community recipe action failed:', error);
    return json(502, { error: error instanceof Error ? error.message : 'تغییر در مخزن عمومی انجام نشد؛ درخواست در صف باقی ماند.' });
  }
};
