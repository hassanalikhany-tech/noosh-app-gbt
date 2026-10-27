import { decisionKey, requestKey, store } from './community-recipe-lib.mjs';
import { handleNativePreflight, publicAppJson } from './native-app-security.mjs';

export const handler = async (event) => {
  const preflight = handleNativePreflight(event, 'GET, OPTIONS');
  if (preflight) return preflight;
  if (event.httpMethod !== 'GET') return publicAppJson(event, 405, { error: 'روش درخواست پشتیبانی نمی‌شود.' }, 'GET, OPTIONS');
  const id = event.queryStringParameters?.id;
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/iu.test(id)) return publicAppJson(event, 400, { error: 'شناسهٔ درخواست معتبر نیست.' }, 'GET, OPTIONS');
  try {
    const blobs = store(event);
    const decision = await blobs.get(decisionKey(id));
    if (decision) return publicAppJson(event, 200, JSON.parse(decision), 'GET, OPTIONS');
    const pending = await blobs.get(requestKey(id));
    return publicAppJson(event, 200, { status: pending ? 'pending' : 'unknown' }, 'GET, OPTIONS');
  } catch (error) {
    console.error('Community recipe status lookup failed:', error);
    return publicAppJson(event, 503, { error: 'وضعیت درخواست فعلاً دریافت نشد.' }, 'GET, OPTIONS');
  }
};
