import { decisionKey, json, requestKey, store } from './community-recipe-lib.mjs';

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
  const id = event.queryStringParameters?.id;
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/iu.test(id)) return json(400, { error: 'شناسهٔ درخواست معتبر نیست.' });
  try {
    const blobs = store(event);
    const decision = await blobs.get(decisionKey(id), { consistency: 'strong' });
    if (decision) return json(200, JSON.parse(decision));
    const pending = await blobs.get(requestKey(id), { consistency: 'strong' });
    return json(200, { status: pending ? 'pending' : 'unknown' });
  } catch {
    return json(503, { error: 'وضعیت درخواست فعلاً دریافت نشد.' });
  }
};
