import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import vm from 'node:vm';
import { parseBody, validRecipe } from '../netlify/functions/community-recipe-lib.mjs';
import { isSameOriginMutation } from '../netlify/functions/request-security.mjs';
import { handler as submit } from '../netlify/functions/community-recipe-submit.mjs';
import { handler as feedback } from '../netlify/functions/feedback.mjs';
import { handler as manage } from '../netlify/functions/admin-manage-dish.mjs';
import { issueSession, isAdminSession } from '../netlify/functions/admin-auth.mjs';
import { recipeQuantityProblem } from '../utils/quantitySanity.mjs';

assert.deepEqual(parseBody({ body: '{"name":"نوش"}' }), { name: 'نوش' });
for (const body of ['null', '[]', '"text"', '{']) assert.throws(() => parseBody({ body }), error => error.statusCode === 400);
assert.throws(() => parseBody({ body: JSON.stringify({ text: 'ش'.repeat(100) }) }, 150), error => error.statusCode === 413);
assert.ok(isSameOriginMutation({ headers: { origin: 'https://noosh.example', host: 'noosh.example' } }));
for (const origin of ['https://evil.example', 'null', 'https://noosh.example.evil.test', 'http://noosh.example']) assert.equal(isSameOriginMutation({ headers: { origin, host: 'noosh.example' } }), false);
const publicEvent = { httpMethod: 'POST', headers: { host: 'noosh.example', origin: 'https://noosh.example' } };
for (const handler of [submit, feedback]) {
  assert.equal((await handler({ ...publicEvent, body: 'null' })).statusCode, 400);
  assert.equal((await handler({ ...publicEvent, body: '{}', headers: { ...publicEvent.headers, origin: 'https://evil.example' } })).statusCode, 403);
}
assert.equal((await feedback({ ...publicEvent, body: 'x'.repeat(31000) })).statusCode, 413);
assert.equal((await feedback({ httpMethod: 'GET', headers: {} })).statusCode, 401);
assert.ok(recipeQuantityProblem({ item: 'برنج', amount: 180, unit: 'پیمانه' }, 4));
assert.equal(recipeQuantityProblem({ item: 'برنج', amount: 2, unit: 'پیمانه' }, 4), '');
assert.equal(recipeQuantityProblem({ item: 'شیر', amount: 30, unit: 'پیمانه' }, 100), '', 'Legitimate large batches scale with their recipe servings');
const recipe = { name: 'خوراک نمونه', category: 'khorak', description: '', ingredients: [{ item: 'برنج', amount: 180, unit: 'پیمانه' }], recipeSteps: ['بپز.'], servings: 4 };
assert.equal(validRecipe(recipe), false);
assert.equal(validRecipe({ ...recipe, ingredients: [{ item: 'برنج', amount: 180, unit: 'گرم' }] }), true);
assert.equal(validRecipe({ ...recipe, calories: Infinity }), false);

// Exercise publication with an in-memory GitHub fixture, never the real repo.
const oldFetch = globalThis.fetch;
const names = ['ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'GITHUB_TOKEN'];
const oldEnv = names.map(key => process.env[key]);
try {
  for (const key of names) process.env[key] = randomBytes(32).toString('hex');
  const catalog = { version: 1, dishes: [{ ...recipe, id: 'recipe-test', ingredients: [{ item: 'برنج', amount: 2, unit: 'پیمانه' }] }], hiddenDishIds: [] };
  let writes = 0;
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === 'PUT') { writes++; return Response.json({ commit: { sha: 'test-commit' } }); }
    return Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(catalog)).toString('base64'), sha: 'catalog-sha' });
  };
  const event = { ...publicEvent, headers: { ...publicEvent.headers, cookie: `__Host-noosh_admin_session=${issueSession()}` } };
  assert.equal(isAdminSession(event), true);
  assert.equal((await manage({ ...event, body: JSON.stringify({ action: 'delete', dishId: 'recipe-test', baseRevision: 'outdated' }) })).statusCode, 409);
  assert.equal(writes, 0, 'An old admin tab cannot overwrite a newer catalog');
  const revision = createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
  const result = await manage({ ...event, body: JSON.stringify({ action: 'delete', dishId: 'recipe-test', baseRevision: revision }) });
  assert.equal(result.statusCode, 200);
  assert.equal(writes, 1);
  assert.match(JSON.parse(result.body).revision, /^[a-f0-9]{64}$/u);
} finally {
  globalThis.fetch = oldFetch;
  names.forEach((key, index) => { if (oldEnv[index] === undefined) delete process.env[key]; else process.env[key] = oldEnv[index]; });
}

const listeners = new Map();
const cache = { match: async () => undefined, keys: async () => [], delete: async () => true, put: async () => { throw new Error('quota'); } };
const context = {
  self: { location: { origin: 'https://noosh.example' }, addEventListener: (name, handler) => listeners.set(name, handler) },
  caches: { open: async () => cache, match: async () => undefined },
  fetch: async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/webp' } }), Response, URL, Set,
};
vm.runInNewContext(await readFile('public/sw.js', 'utf8'), context);
const waits = [];
let response;
listeners.get('fetch')({ request: { method: 'GET', url: 'https://noosh.example/images/recipes/test.webp', destination: 'image' }, respondWith: promise => { response = promise; }, waitUntil: promise => waits.push(promise) });
assert.equal((await response).status, 200, 'Cache quota failure cannot hide a successfully received image');
await Promise.all(waits);
assert.ok(waits.length, 'Background refresh remains attached to the service-worker event');
const html = await readFile('index.html', 'utf8');
const headers = await readFile('public/_headers', 'utf8');
for (const [, inline] of html.matchAll(/<script>([\s\S]*?)<\/script>/gu)) assert.ok(headers.includes(`'sha256-${createHash('sha256').update(inline).digest('base64')}'`), 'Every inline startup script is pinned in the CSP');
assert.ok(!headers.includes("script-src 'self' 'unsafe-inline'"));
console.log('Web reliability checks passed: bounded JSON, origin checks, unauthenticated denial, quantity corruption, stale admin revisions, cache quota and CSP hashes.');
