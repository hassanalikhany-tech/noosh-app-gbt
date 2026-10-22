import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({ entryPoints: ['utils/startup.ts'], bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{ name: 'startup-screen-fixtures', setup(builder) {
  builder.onResolve({ filter: /components\/(PantryChef|RecipeModal|Preferences)$/ }, () => ({ path: 'screen', namespace: 'startup-fixture' }));
  builder.onLoad({ filter: /.*/, namespace: 'startup-fixture' }, () => ({ contents: 'export default function Screen() {}' }));
} }] });
const { startStartupScreen, markApplicationReady } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const originals = Object.fromEntries(['window', 'document', 'Image', 'performance'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));

try {
  function fixture(reducedMotion = false, holdImages = false) {
    let now = 1;
    let sequence = 0;
    const timers = new Map();
    const pendingImages = [];
    const classes = new Set(['noosh-starting']);
    const rootAttributes = new Set(['inert', 'aria-hidden']);
    const splashClasses = new Set();
    const splash = { removed: false, classList: { add: value => splashClasses.add(value) }, remove() { this.removed = true; } };
    const status = { textContent: '' };
    const retry = { hidden: true, addEventListener() {} };
    const elements = { 'noosh-startup': splash, root: { removeAttribute: key => rootAttributes.delete(key) }, 'noosh-startup-status': status, 'noosh-startup-retry': retry };
    const events = new EventTarget();
    const fakeWindow = {
      addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events),
      setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { at: now + delay, callback }); return id; }, clearTimeout: id => timers.delete(id),
      matchMedia: () => ({ matches: reducedMotion }), location: { reload() {} },
    };
    Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
    Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { getElementById: id => elements[id], fonts: { ready: Promise.resolve() }, documentElement: { dataset: { nooshStartedAt: '1' }, classList: { remove: value => classes.delete(value) } } } });
    Object.defineProperty(globalThis, 'Image', { configurable: true, value: class { set src(value) { if (holdImages) pendingImages.push(() => this.onload?.()); else queueMicrotask(() => this.onload?.()); } } });
    const advance = milliseconds => {
      const target = now + milliseconds;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a,b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].callback();
      }
      now = target;
    };
    return { splash, splashClasses, rootAttributes, classes, status, retry, advance, releaseImages: () => pendingImages.splice(0).forEach(resolve => resolve()) };
  }

  const fast = fixture();
  startStartupScreen(); markApplicationReady();
  await new Promise(setImmediate);
  fast.advance(7_999);
  assert.equal(fast.splash.removed, false, 'A fast app must still show the requested eight-second introduction');
  assert.ok(fast.rootAttributes.has('inert'), 'The background app must not receive input while covered');
  fast.advance(1);
  assert.ok(fast.splashClasses.has('noosh-startup-leaving'), 'The splash begins dismissing at eight seconds');
  fast.advance(300);
  assert.equal(fast.splash.removed, true);
  assert.equal(fast.rootAttributes.size, 0, 'The ready app becomes interactive and available to screen readers');
  assert.equal(fast.classes.has('noosh-starting'), false, 'Scrolling is restored after the introduction');

  const slow = fixture(true);
  startStartupScreen(); await new Promise(setImmediate);
  slow.advance(8_000);
  assert.equal(slow.splash.removed, false, 'A slow app stays covered instead of exposing incomplete content');
  markApplicationReady(); slow.advance(0);
  assert.equal(slow.splash.removed, true, 'Reduced-motion users skip the closing animation when the app is ready');

  const slowImages = fixture(false, true);
  startStartupScreen(); markApplicationReady(); await new Promise(setImmediate);
  slowImages.advance(20_000);
  assert.equal(slowImages.splashClasses.has('noosh-startup-leaving'), false, 'A ready app must wait beyond eight seconds until its pending startup images finish');
  slowImages.releaseImages(); await new Promise(setImmediate);
  slowImages.advance(300);
  assert.equal(slowImages.splash.removed, true, 'Startup ends after slow images settle and the app is ready');

  const stalled = fixture();
  startStartupScreen(); await new Promise(setImmediate);
  stalled.advance(30_000);
  assert.equal(stalled.retry.hidden, false, 'A stalled startup offers a recovery action instead of an endless silent screen');
  console.log('Startup checks passed: eight-second minimum and slow-image gate, background input lock, ready gate, reduced motion, and stalled-start recovery.');
} finally {
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
