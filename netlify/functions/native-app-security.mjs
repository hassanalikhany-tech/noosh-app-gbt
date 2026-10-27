import { json } from './community-recipe-lib.mjs';
import { isSameOriginMutation } from './request-security.mjs';

const NATIVE_ORIGINS = new Set(['https://localhost', 'capacitor://localhost']);

export const isNativeAppOrigin = (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  return typeof origin === 'string' && NATIVE_ORIGINS.has(origin);
};

export const isAllowedPublicAppMutation = (event) => isSameOriginMutation(event) || isNativeAppOrigin(event);

export const publicAppCorsHeaders = (event, methods = 'GET, OPTIONS') => {
  if (!isNativeAppOrigin(event)) return {};
  const origin = event.headers?.origin || event.headers?.Origin;
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': methods,
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
};

export const handleNativePreflight = (event, methods) => {
  if (event?.httpMethod !== 'OPTIONS') return null;
  if (!isNativeAppOrigin(event)) return json(403, { error: 'مبدأ درخواست معتبر نیست.' });
  return { statusCode: 204, headers: publicAppCorsHeaders(event, methods), body: '' };
};

export const publicAppJson = (event, statusCode, body, methods) => {
  const response = json(statusCode, body);
  return { ...response, headers: { ...response.headers, ...publicAppCorsHeaders(event, methods) } };
};
