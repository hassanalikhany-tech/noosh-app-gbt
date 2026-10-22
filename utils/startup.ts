const MINIMUM_STARTUP_MS = 8_000;
const READY_EVENT = 'noosh-app-ready';

export function markApplicationReady() {
  window.dispatchEvent(new Event(READY_EVENT));
}

export function startStartupScreen() {
  const splash = document.getElementById('noosh-startup');
  const root = document.getElementById('root');
  if (!splash || !root) return;
  const status = document.getElementById('noosh-startup-status');
  const retry = document.getElementById('noosh-startup-retry');
  const startedAt = Number(document.documentElement.dataset.nooshStartedAt) || performance.now();
  let appReady = false;
  let assetsReady = false;
  let minimumElapsed = false;
  let closing = false;

  const dismissIfReady = () => {
    if (closing || !minimumElapsed || !appReady || !assetsReady) return;
    closing = true;
    window.clearTimeout(slowTimer);
    window.removeEventListener(READY_EVENT, onReady);
    splash.classList.add('noosh-startup-leaving');
    window.setTimeout(() => {
      splash.remove();
      root.removeAttribute('inert');
      root.removeAttribute('aria-hidden');
      document.documentElement.classList.remove('noosh-starting');
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
  };
  const onReady = () => { appReady = true; dismissIfReady(); };
  window.addEventListener(READY_EVENT, onReady);
  retry?.addEventListener('click', () => window.location.reload());

  // The real app mounts behind the splash. Warm the first screen and shared
  // recipe dialog as well, without fetching hundreds of off-screen food photos.
  const imageReady = (src: string) => new Promise<void>(resolve => {
    const image = new Image();
    image.onload = image.onerror = () => resolve();
    image.src = src;
  });
  const warmup = Promise.allSettled([
    import('../components/PantryChef'),
    import('../components/RecipeModal'),
    import('../components/Preferences'),
    imageReady('/brand/noosh-logo.png'),
    imageReady('/hero-zereshk-polo.png'),
    imageReady('/hero-chelo-kabab-barg.png'),
    document.fonts?.ready,
  ]);
  void warmup.finally(() => {
    assetsReady = true;
    dismissIfReady();
  });
  window.setTimeout(() => {
    minimumElapsed = true;
    dismissIfReady();
  }, Math.max(0, MINIMUM_STARTUP_MS - (performance.now() - startedAt)));
  const slowTimer = window.setTimeout(() => {
    if (closing) return;
    if (status) status.textContent = 'آماده‌سازی بیشتر از معمول طول کشید؛ اتصال اینترنت را بررسی کنید.';
    if (retry) retry.hidden = false;
  }, Math.max(0, 30_000 - (performance.now() - startedAt)));
}
