import { isAdminSession } from './admin-auth.mjs';

const response = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(body) });
const ALLOWED_UNITS = new Set(['کیلوگرم', 'گرم', 'عدد', 'بسته', 'قوطی', 'لیتر', 'میلی‌لیتر', 'پیمانه', 'استکان', 'لیوان', 'قاشق غذاخوری', 'قاشق مرباخوری', 'قاشق چایخوری', 'حبه', 'تکه', 'شاخه', 'ورق', 'حلقه', 'دانه']);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
  const host = event.headers?.host;
  const origin = event.headers?.origin;
  if (origin && host && new URL(origin).host !== host) return response(403, { error: 'درخواست نامعتبر است.' });
  if (!isAdminSession(event)) return response(401, { error: 'نشست مدیریت منقضی شده؛ دوباره وارد شو.' });
  if (!process.env.GITHUB_TOKEN) return response(503, { error: 'دسترسی GitHub در Netlify تنظیم نشده است.' });

  try {
    const payload = JSON.parse(event.body || '{}');
    const units = payload.units;
    if (!units || typeof units !== 'object' || Array.isArray(units) || Object.keys(units).length > 3000) return response(400, { error: 'فهرست واحدهای ارسالی معتبر نیست.' });
    for (const [name, unit] of Object.entries(units)) {
      if (typeof name !== 'string' || name.length < 2 || name.length > 220 || /[\u0000-\u001f<>]/u.test(name) || typeof unit !== 'string' || !ALLOWED_UNITS.has(unit)) {
        return response(400, { error: 'نام یک ماده یا واحد انتخابی معتبر نیست؛ چیزی ثبت نشد.' });
      }
    }

    const owner = process.env.GITHUB_OWNER || 'hassanalikhany-tech';
    const repo = process.env.GITHUB_REPO || 'noosh-app-gbt';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path = 'data/pantry_unit_preferences.json';
    const base = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'Noosh-Admin' };
    const existing = await fetch(`${base}?ref=${encodeURIComponent(branch)}`, { headers });
    let sha;
    if (existing.ok) sha = (await existing.json()).sha;
    else if (existing.status !== 404) return response(502, { error: 'خواندن تنظیم واحدهای فعلی از GitHub انجام نشد.' });
    const content = JSON.stringify({ version: 1, units, updatedAt: new Date().toISOString() }, null, 2) + '\n';
    const committed = await fetch(base, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Update Noosh pantry unit standards', content: Buffer.from(content).toString('base64'), branch, ...(sha ? { sha } : {}) }) });
    const result = await committed.json().catch(() => ({}));
    if (!committed.ok) return response(502, { error: committed.status === 409 ? 'همزمان تنظیم دیگری تغییر کرده؛ صفحه را تازه کن و دوباره ذخیره کن.' : 'ثبت واحدها در GitHub انجام نشد. دسترسی توکن و شاخهٔ main را بررسی کن.' });
    return response(200, { commit: result.commit?.sha, count: Object.keys(units).length, deploy: 'Netlify deploy will start after the GitHub commit.' });
  } catch {
    return response(500, { error: 'ارتباط امن با GitHub انجام نشد؛ تنظیم‌های قبلی دست‌نخورده ماند.' });
  }
};
