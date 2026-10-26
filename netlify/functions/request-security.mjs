/** Reject cross-origin or origin-less state-changing browser requests. */
export const isSameOriginMutation = (event) => {
  const headers = event?.headers || {};
  const origin = headers.origin || headers.Origin;
  const host = headers.host || headers.Host || headers['x-forwarded-host'];
  if (typeof origin !== 'string' || typeof host !== 'string' || !host.trim()) return false;
  try {
    const parsed = new URL(origin);
    const localDevelopmentHost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && localDevelopmentHost)) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return false;
    return parsed.host.toLowerCase() === host.split(',')[0].trim().toLowerCase();
  } catch {
    return false;
  }
};
