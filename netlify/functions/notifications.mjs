import { randomUUID } from 'node:crypto';
import { isAdminSession } from './admin-auth.mjs';
import { json, parseBody, store, validText } from './community-recipe-lib.mjs';
import { isSameOriginMutation } from './request-security.mjs';

const STORE_NAME = 'noosh-user-notifications';
const prefix = 'notification:';
export const handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return json(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
  if (event.httpMethod === 'POST' && !isSameOriginMutation(event)) return json(403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' });
  const isAdmin = isAdminSession(event);
  const adminScope = event.queryStringParameters?.scope === 'admin';
  if ((event.httpMethod === 'POST' || adminScope) && !isAdmin) return json(401, { error: 'برای مدیریت اعلان‌ها باید وارد پنل مدیریت شوید.' });

  try {
    const blobs = store(event, STORE_NAME);
    if (event.httpMethod === 'GET') {
      const page = await blobs.list({ prefix, limit: 500 });
      const notifications = await Promise.all(page.blobs.map(async ({ key }) => {
        const raw = await blobs.get(key);
        return raw ? JSON.parse(raw) : null;
      }));
      const sorted = notifications.filter(Boolean).sort((a, b) => b.send_time - a.send_time);
      return json(200, { notifications: adminScope ? sorted : sorted.filter(item => item.target_group === 'all') });
    }

    const payload = parseBody(event);
    if (!validText(payload.title, 120) || !validText(payload.message, 5000)) return json(400, { error: 'عنوان و متن اعلان را کامل کنید (حداکثر ۵۰۰۰ نویسه).' });
    // Accounts and recipient lists are intentionally local-only. Public announcements can only go to everyone.
    if (payload.targetGroup && payload.targetGroup !== 'all') return json(400, { error: 'در این نسخه فقط اعلان همگانی برای همهٔ همراهان قابل ارسال است.' });
    const responseKey = typeof payload.sourceFeedbackId === 'string' && /^[0-9a-f-]{36}$/iu.test(payload.sourceFeedbackId)
      ? `feedback-response:${payload.sourceFeedbackId}` : '';
    if (responseKey) {
      const priorId = await blobs.get(responseKey);
      if (priorId) {
        const prior = await blobs.get(`${prefix}${priorId}`);
        if (prior) return json(200, { success: true, notification: JSON.parse(prior), duplicate: true });
      }
    }
    const notification = {
      id: randomUUID(),
      title: payload.title.trim(),
      message: payload.message.trim(),
      target_group: 'all',
      send_time: Date.now(),
      status: 'sent',
      created_by: 'ADMIN',
      ...(typeof payload.sourceFeedbackId === 'string' && /^[0-9a-f-]{36}$/iu.test(payload.sourceFeedbackId) ? { source_feedback_id: payload.sourceFeedbackId } : {}),
    };
    await blobs.set(`${prefix}${notification.id}`, JSON.stringify(notification));
    if (responseKey) await blobs.set(responseKey, notification.id);
    return json(201, { success: true, notification });
  } catch (error) {
    console.error('Notification request failed:', error);
    return json(503, { error: 'ثبت یا دریافت اعلان انجام نشد؛ دوباره تلاش کنید.' });
  }
};
