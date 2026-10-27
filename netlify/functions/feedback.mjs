import { randomUUID } from 'node:crypto';
import { isAdminSession } from './admin-auth.mjs';
import { dailyRateKey, parseBody, store, validText } from './community-recipe-lib.mjs';
import { isSameOriginMutation } from './request-security.mjs';
import { handleNativePreflight, isAllowedPublicAppMutation, publicAppJson } from './native-app-security.mjs';

const STORE_NAME = 'noosh-user-feedback';
const itemKey = (id) => `feedback:${id}`;
const statuses = ['new', 'reviewed', 'to_be_reviewed', 'to_be_followed_up', 'handled', 'informed', 'referred'];
export const handler = async (event) => {
  const preflight = handleNativePreflight(event, 'POST, OPTIONS');
  if (preflight) return preflight;
  const reply = (status, body) => publicAppJson(event, status, body, 'POST, OPTIONS');
  if (!['GET', 'POST', 'PUT'].includes(event.httpMethod)) return reply(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
  if (event.httpMethod === 'POST' && !isAllowedPublicAppMutation(event)) return reply(403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' });
  if (event.httpMethod === 'PUT' && !isSameOriginMutation(event)) return reply(403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' });

  if (event.httpMethod !== 'POST' && !isAdminSession(event)) {
    return reply(401, { error: 'برای مشاهده یا مدیریت بازخوردها باید وارد پنل مدیریت شوید.' });
  }

  try {
    const payload = event.httpMethod === 'GET' ? null : parseBody(event, 30_000);
    const blobs = store(event, STORE_NAME);

    if (event.httpMethod === 'POST') {
      if (payload.website) return reply(200, { success: true }); // Honeypot for basic spam protection.
      if (!['suggestion', 'issue', 'criticism', 'feature_request'].includes(payload.category)) return reply(400, { error: 'موضوع پیام معتبر نیست.' });
      if (!validText(payload.message, 5000)) return reply(400, { error: 'متن پیام را بنویسید؛ حداکثر ۵۰۰۰ نویسه.' });
      const name = typeof payload.userName === 'string' ? payload.userName.trim().slice(0, 80) : '';

      const ip = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      const rateKey = dailyRateKey(ip, new Date().toISOString().slice(0, 10));
      const previous = Number(await blobs.get(rateKey) || 0);
      if (previous >= 5) return reply(429, { error: 'برای جلوگیری از پیام‌های ناخواسته، از این اتصال امروز بیش از ۵ نظر پذیرفته نمی‌شود.' });
      await blobs.set(rateKey, String(previous + 1));

      const id = randomUUID();
      const feedback = {
        id,
        user_id: '',
        user_name: name || 'همراه نوش‌اپ',
        user_mobile: '',
        category: payload.category,
        message: payload.message.trim(),
        status: 'new',
        created_at: Date.now(),
        device: '',
      };
      await blobs.set(itemKey(id), JSON.stringify(feedback));
      return reply(201, { success: true, id });
    }

    if (event.httpMethod === 'GET') {
      const page = await blobs.list({ prefix: 'feedback:', limit: 1000 });
      const feedback = await Promise.all(page.blobs.map(async ({ key }) => {
        const raw = await blobs.get(key);
        return raw ? JSON.parse(raw) : null;
      }));
      return reply(200, { feedback: feedback.filter(Boolean).sort((a, b) => b.created_at - a.created_at) });
    }

    if (typeof payload.id !== 'string' || !/^[0-9a-f-]{36}$/iu.test(payload.id) || !statuses.includes(payload.status)) {
      return reply(400, { error: 'شناسه یا وضعیت بازخورد معتبر نیست.' });
    }
    const key = itemKey(payload.id);
    const raw = await blobs.get(key);
    if (!raw) return reply(404, { error: 'این بازخورد پیدا نشد.' });
    const feedback = JSON.parse(raw);
    const updated = {
      ...feedback,
      status: payload.status,
      ...(typeof payload.assigned_to_name === 'string' ? { assigned_to_name: payload.assigned_to_name.slice(0, 100) } : {}),
      ...(Number.isFinite(payload.assigned_at) ? { assigned_at: payload.assigned_at } : {}),
    };
    await blobs.set(key, JSON.stringify(updated));
    return reply(200, { success: true, feedback: updated });
  } catch (error) {
    if ([400, 413].includes(error?.statusCode)) return reply(error.statusCode, { error: error.message });
    console.error('Feedback request failed:', error);
    return reply(503, { error: 'ارتباط با صف بازخورد برقرار نشد؛ دوباره تلاش کنید.' });
  }
};
