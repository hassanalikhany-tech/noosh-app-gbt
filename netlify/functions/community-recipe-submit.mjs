import { dailyRateKey, decodeRecipeImage, parseBody, randomRequestId, requestKey, store, validRecipe, validText } from './community-recipe-lib.mjs';
import { handleNativePreflight, isAllowedPublicAppMutation, publicAppJson } from './native-app-security.mjs';

export const handler = async (event) => {
  const preflight = handleNativePreflight(event, 'POST, OPTIONS');
  if (preflight) return preflight;
  if (event.httpMethod !== 'POST') return publicAppJson(event, 405, { error: 'روش درخواست پشتیبانی نمی‌شود.' }, 'POST, OPTIONS');
  if (!isAllowedPublicAppMutation(event)) return publicAppJson(event, 403, { error: 'درخواست نامعتبر است؛ صفحه را تازه کنید و دوباره تلاش کنید.' }, 'POST, OPTIONS');
  try {
    const payload = parseBody(event);
    if (payload.website) return publicAppJson(event, 200, { success: true }, 'POST, OPTIONS'); // honeypot
    if (!validText(payload.creatorName, 60)) return publicAppJson(event, 400, { error: 'نام نمایشی سازنده را وارد کن (حداکثر ۶۰ نویسه).' }, 'POST, OPTIONS');
    if (!['lady', 'gentleman', 'none'].includes(payload.creatorTitle)) return publicAppJson(event, 400, { error: 'عنوان نمایشی معتبر نیست.' }, 'POST, OPTIONS');
    if (!validRecipe(payload.dish)) return publicAppJson(event, 400, { error: 'اطلاعات رسپی کامل یا معتبر نیست؛ رسپی و عکس را بررسی کن.' }, 'POST, OPTIONS');
    const image = payload.dish.imageUrl ? decodeRecipeImage(payload.dish.imageUrl) : null;
    if (image && image.bytes.length > 1_200_000) return publicAppJson(event, 413, { error: 'حجم عکس برای ارسال زیاد است؛ عکس کوچک‌تری انتخاب کن.' }, 'POST, OPTIONS');

    const blobs = store(event);
    const ip = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const day = new Date().toISOString().slice(0, 10);
    const rateKey = dailyRateKey(ip, day);
    const previous = Number(await blobs.get(rateKey) || 0);
    if (previous >= 5) return publicAppJson(event, 429, { error: 'برای جلوگیری از ارسال ناخواسته، امروز بیش از ۵ درخواست از این اتصال پذیرفته نمی‌شود.' }, 'POST, OPTIONS');
    await blobs.set(rateKey, String(previous + 1));

    const id = randomRequestId();
    const dish = payload.dish;
    const request = { id, personalDishId: typeof dish.id === 'string' ? dish.id.slice(0, 100) : '', creatorName: payload.creatorName.trim(), creatorTitle: payload.creatorTitle, submittedAt: new Date().toISOString(), dish: { name: dish.name.trim(), category: dish.category, description: dish.description.trim(), ingredients: dish.ingredients.map(({ item, amount, unit }) => ({ item: item.trim(), amount, unit: unit.trim() })), recipeSteps: dish.recipeSteps.map(step => step.trim()), nationality: dish.nationality?.trim() || '', servings: Math.max(1, Math.min(100, Number(dish.servings) || 4)), cookTime: Math.max(0, Math.min(1440, Number(dish.cookTime) || 0)), calories: Math.max(0, Number(dish.calories) || 0), difficulty: typeof dish.difficulty === 'string' ? dish.difficulty.slice(0, 40) : 'متوسط', nature: ['hot','cold','balanced'].includes(dish.nature) ? dish.nature : 'balanced', natureLabel: typeof dish.natureLabel === 'string' ? dish.natureLabel.slice(0, 40) : 'معتدل', mosleh: typeof dish.mosleh === 'string' ? dish.mosleh.slice(0, 200) : '', ...(payload.dish.imageUrl ? { imageData: payload.dish.imageUrl } : {}) } };
    await blobs.set(requestKey(id), JSON.stringify(request));
    return publicAppJson(event, 200, { success: true, requestId: id }, 'POST, OPTIONS');
  } catch (error) {
    if ([400, 413].includes(error?.statusCode)) return publicAppJson(event, error.statusCode, { error: error.message }, 'POST, OPTIONS');
    console.error('Community recipe submission failed:', error);
    return publicAppJson(event, 503, { error: 'ارسال امن برای بررسی در دسترس نیست؛ کمی بعد دوباره تلاش کن.' }, 'POST, OPTIONS');
  }
};
