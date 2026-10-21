import { createHash, randomUUID } from 'node:crypto';
import { connectLambda, getStore } from '@netlify/blobs';

export const STORE_NAME = 'noosh-community-recipes';
// These endpoints use Netlify's Lambda-compatible handler format. Blobs needs
// the Lambda event's signed context to discover the site and access token.
export const store = (event) => {
  connectLambda(event);
  return getStore({ name: STORE_NAME, consistency: 'strong' });
};
export const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(body) });
export const parseBody = (event) => JSON.parse(event.body || '{}');
export const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
export const decodeRecipeImage = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:image\/(webp|jpeg|png);base64,([a-z\d+/]+=*)$/iu);
  if (!match) return null;
  const bytes = Buffer.from(match[2], 'base64');
  const type = match[1].toLowerCase();
  const valid = type === 'jpeg' ? bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : type === 'png' ? bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
      : bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return valid ? { type, extension: type === 'jpeg' ? 'jpg' : type, base64: match[2], bytes } : null;
};
export const validRecipe = (dish) => {
  const categories = ['ash','polo','khorak','stew','soup','fastfood','kabab','international','dessert'];
  return dish && typeof dish === 'object' && validText(dish.name, 120) && categories.includes(dish.category) &&
    typeof dish.description === 'string' && dish.description.length <= 1000 && Array.isArray(dish.ingredients) && dish.ingredients.length > 0 && dish.ingredients.length <= 60 &&
    dish.ingredients.every((item) => item && validText(item.item, 120) && Number.isFinite(item.amount) && item.amount >= 0 && item.amount <= 100000000 && validText(item.unit, 40)) &&
    Array.isArray(dish.recipeSteps) && dish.recipeSteps.length > 0 && dish.recipeSteps.length <= 60 && dish.recipeSteps.every((step) => validText(step, 1000)) &&
    (!dish.nationality || (typeof dish.nationality === 'string' && dish.nationality.length <= 80)) &&
    (!dish.imageUrl || (typeof dish.imageUrl === 'string' && dish.imageUrl.length <= 2_000_000 && Boolean(decodeRecipeImage(dish.imageUrl))));
};
export const requestKey = (id) => `pending:${id}`;
export const decisionKey = (id) => `decision:${id}`;
export const githubSettings = () => ({ owner: process.env.GITHUB_OWNER || 'hassanalikhany-tech', repo: process.env.GITHUB_REPO || 'noosh-app-gbt', branch: process.env.GITHUB_BRANCH || 'main' });
export const githubHeaders = () => ({ authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'Noosh-Community-Recipes' });

export async function readGithubJson(path) {
  const { owner, repo, branch } = githubSettings();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders() });
  if (response.status === 404) return { value: null, sha: undefined, url };
  if (!response.ok) throw new Error('خواندن فهرست عمومی از GitHub انجام نشد.');
  const data = await response.json();
  let text;
  if (data.encoding === 'base64' && data.content) text = Buffer.from(data.content, 'base64').toString('utf8');
  else {
    const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${data.sha}`;
    const blobResponse = await fetch(blobUrl, { headers: githubHeaders() });
    if (!blobResponse.ok) throw new Error('دریافت نسخهٔ کامل فهرست از GitHub انجام نشد.');
    const blob = await blobResponse.json();
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('ساختار نسخهٔ فعلی GitHub معتبر نیست.');
    text = Buffer.from(blob.content, 'base64').toString('utf8');
  }
  return { value: JSON.parse(text), sha: data.sha, url };
}

export async function writeGithubJson(path, value, message, sha) {
  const { branch } = githubSettings();
  const { url } = await readGithubJson(path);
  const response = await fetch(url, { method: 'PUT', headers: { ...githubHeaders(), 'content-type': 'application/json' }, body: JSON.stringify({ message, content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`).toString('base64'), branch, ...(sha ? { sha } : {}) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 409 ? 'این فهرست هم‌زمان تغییر کرده؛ دوباره تلاش کن.' : 'ثبت رسپی در GitHub انجام نشد.');
  return data.commit?.sha;
}

export const randomRequestId = () => randomUUID();
export const dailyRateKey = (ip, date) => `rate:${createHash('sha256').update(ip).digest('hex').slice(0, 32)}:${date}`;
