import { Capacitor } from '@capacitor/core';

const PUBLIC_SITE_ORIGIN = 'https://noosh-app-gbt.netlify.app';

/** Public Netlify endpoints used by the Android WebView need an absolute site URL. */
export const publicFunctionUrl = (name: string, query = '') => {
  const base = Capacitor.isNativePlatform() ? PUBLIC_SITE_ORIGIN : '';
  return `${base}/.netlify/functions/${name}${query}`;
};
