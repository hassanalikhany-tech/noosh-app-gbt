import { dailyRateKey, decodeRecipeImage, json, parseBody, randomRequestId, requestKey, store, validRecipe, validText } from './community-recipe-lib.mjs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'روش درخواست پشتیبانی نمی‌شود.' });
  const host = event.headers?.host;
  const origin = event.headers?.origin;
  if (origin && host && new URL(origin).host !== host) return json(403, { error: 'درخواست نامعتبر است.' });
  try {
    const payload = parseBody(event);
    if (payload.website) return json(200, { success: true }); // honeypot
    if (!validText(payload.creatorName, 60)) return json(400, { error: 'نام نمایشی سازنده را وارد کن (حداکثر ۶۰ نویسه).' });
    if (!['lady', 'gentleman', 'none'].includes(payload.creatorTitle)) return json(400, { error: 'عنوان نمایشی معتبر نیست.' });
    if (!validRecipe(payload.dish)) return json(400, { error: 'اطلاعات رسپی کامل یا معتبر نیست؛ رسپی و عکس را بررسی کن.' });
    const image = payload.dish.imageUrl ? decodeRecipeImage(payload.dish.imageUrl) : null;
    if (image && image.bytes.length > 1_200_000) return json(413, { error: 'حجم عکس برای ارسال زیاد است؛ عکس کوچک‌تری انتخاب کن.' });

    const blobs = store(event);
    const ip = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const day = new Date().toISOString().slice(0, 10);
    const rateKey = dailyRateKey(ip, day);
    const previous = Number(await blobs.get(rateKey, { consistency: 'strong' }) || 0);
    if (previous >= 5) return json(429, { error: 'برای جلوگیری از ارسال ناخواسته، امروز بیش از ۵ درخواست از این اتصال پذیرفته نمی‌شود.' });
    await blobs.set(rateKey, String(previous + 1));

    const id = randomRequestId();
    const dish = payload.dish;
    const request = { id, personalDishId: typeof dish.id === 'string' ? dish.id.slice(0, 100) : '', creatorName: payload.creatorName.trim(), creatorTitle: payload.creatorTitle, submittedAt: new Date().toISOString(), dish: { name: dish.name.trim(), category: dish.category, description: dish.description.trim(), ingredients: dish.ingredients.map(({ item, amount, unit }) => ({ item: item.trim(), amount, unit: unit.trim() })), recipeSteps: dish.recipeSteps.map(step => step.trim()), nationality: dish.nationality?.trim() || '', servings: Math.max(1, Math.min(100, Number(dish.servings) || 4)), cookTime: Math.max(0, Math.min(1440, Number(dish.cookTime) || 0)), calories: Math.max(0, Number(dish.calories) || 0), difficulty: typeof dish.difficulty === 'string' ? dish.difficulty.slice(0, 40) : 'متوسط', nature: ['hot','cold','balanced'].includes(dish.nature) ? dish.nature : 'balanced', natureLabel: typeof dish.natureLabel === 'string' ? dish.natureLabel.slice(0, 40) : 'معتدل', mosleh: typeof dish.mosleh === 'string' ? dish.mosleh.slice(0, 200) : '', ...(payload.dish.imageUrl ? { imageData: payload.dish.imageUrl } : {}) } };
    await blobs.set(requestKey(id), JSON.stringify(request));
    return json(200, { success: true, requestId: id });
  } catch (error) {
    console.error('Community recipe submission failed:', error);
    return json(503, { error: 'ارسال امن برای بررسی در دسترس نیست؛ کمی بعد دوباره تلاش کن.' });
  }
};
