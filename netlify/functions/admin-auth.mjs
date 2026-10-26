import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isSameOriginMutation } from './request-security.mjs';
import { store } from './community-recipe-lib.mjs';

const COOKIE = '__Host-noosh_admin_session';
const lifetime = 8 * 60 * 60;
const secret = () => process.env.ADMIN_SESSION_SECRET || '';
const sign = (value) => createHmac('sha256', secret()).update(value).digest('base64url');
const cookieValue = (event) => (event.headers?.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
const respond = (statusCode, body, headers = {}) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }, body: JSON.stringify(body) });
const configured = () => Boolean((process.env.ADMIN_PASSWORD || '').length >= 16 && process.env.GITHUB_TOKEN && secret().length >= 32);

export const issueSession = () => {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + lifetime, nonce: randomBytes(12).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

export const isAdminSession = (event) => {
  if (!configured()) return false;
  const token = cookieValue(event);
  if (!token) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Math.floor(Date.now() / 1000); } catch { return false; }
};

const attempts = new Map();
export const handler = async (event) => {
  if (event.httpMethod === 'GET') return respond(200, { configured: configured(), authenticated: isAdminSession(event) });
  if (event.httpMethod === 'DELETE') {
    if (!isSameOriginMutation(event)) return respond(403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' });
    return respond(200, { authenticated: false }, { 'set-cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` });
  }
  if (event.httpMethod !== 'POST') return respond(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' }, { allow: 'GET, POST, DELETE' });
  if (!configured()) return respond(503, { error: 'اتصال امن مدیریت هنوز در تنظیمات Netlify راه‌اندازی نشده است.' });
  if (!isSameOriginMutation(event)) return respond(403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' });
  if (typeof event.body !== 'string' || event.body.length > 4096) return respond(413, { error: 'اندازهٔ درخواست ورود بیش از حد مجاز است.' });
  const ip = event.headers?.['x-nf-client-connection-ip'] || 'unknown';
  const now = Date.now();
  const key = createHash('sha256').update(ip).digest('hex');
  let state = attempts.get(key);
  try {
    const stored = await store(event, 'noosh-admin-auth-limits').get(`login:${key}`);
    if (stored) {
      const persisted = JSON.parse(stored);
      if (persisted.until > now && (!state || persisted.count > state.count)) state = persisted;
    }
  } catch (error) {
    console.error('Admin login rate-limit lookup failed:', error);
    return respond(503, { error: 'سامانهٔ محافظت از ورود در دسترس نیست؛ کمی بعد دوباره تلاش کنید.' });
  }
  if (state && state.until > now && state.count >= 6) return respond(429, { error: 'تعداد تلاش زیاد است؛ کمی بعد دوباره امتحان کن.' });
  const password = (() => { try { return JSON.parse(event.body || '{}').password; } catch { return ''; } })();
  const expected = Buffer.from(process.env.ADMIN_PASSWORD);
  const actual = Buffer.from(typeof password === 'string' ? password : '');
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!match) {
    const nextState = state?.until > now ? { count: state.count + 1, until: state.until } : { count: 1, until: now + 15 * 60 * 1000 };
    attempts.set(key, nextState);
    try { await store(event, 'noosh-admin-auth-limits').set(`login:${key}`, JSON.stringify(nextState)); }
    catch (error) {
      console.error('Admin login rate-limit persistence failed:', error);
      return respond(503, { error: 'سامانهٔ محافظت از ورود در دسترس نیست؛ تلاش ذخیره نشد.' });
    }
    return respond(401, { error: 'رمز مدیریت درست نیست.' });
  }
  attempts.delete(key);
  try { await store(event, 'noosh-admin-auth-limits').delete(`login:${key}`); }
  catch (error) { console.error('Admin login rate-limit reset failed:', error); }
  return respond(200, { authenticated: true }, { 'set-cookie': `${COOKIE}=${issueSession()}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${lifetime}` });
};
