import { isAdminSession } from './admin-auth.mjs';
import { applyCatalogAction } from './catalog-management.mjs';
import { json, parseBody, readGithubJson, writeGithubJson } from './community-recipe-lib.mjs';
import { isSameOriginMutation } from './request-security.mjs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
  if (!isSameOriginMutation(event)) return json(403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' });
  if (!isAdminSession(event)) return json(401, { error: 'نشست مدیریت منقضی شده؛ دوباره وارد شو.' });
  if (!process.env.GITHUB_TOKEN) return json(503, { error: 'دسترسی GitHub در Netlify تنظیم نشده است.' });

  try {
    const payload = parseBody(event);
    const path = 'data/recipes_overrides.json';
    const current = await readGithubJson(path);
    const result = applyCatalogAction(current.value, payload);
    if (!result.changed) return json(200, { success: true, changed: false, name: result.name });
    const commit = await writeGithubJson(path, result.catalog, `${payload.action} published recipe: ${result.name || payload.dishId}`, current.sha);
    return json(200, { success: true, changed: true, action: payload.action, name: result.name, commit });
  } catch (error) {
    console.error('Admin catalog change failed:', error);
    const message = error instanceof Error ? error.message : 'ثبت تغییر غذا در GitHub انجام نشد.';
    return json(502, { error: message });
  }
};
