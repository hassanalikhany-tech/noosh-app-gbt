/** Broad upper bounds catch an imported base quantity labelled as cups/spoons.
 * These are corruption checks, not recommended portion sizes. */
export function recipeQuantityProblem(ingredient, servings = 4) {
  const amount = ingredient?.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return 'مقدار ماده باید عددی غیرمنفی و معتبر باشد.';
  const unit = String(ingredient?.unit || '').replace(/[\u200b-\u200d\ufeff\s]/gu, '').toLowerCase();
  const limits = { 'پیمانه': 3, 'پیمانهآمریکایی': 3, cup: 3, cups: 3, 'لیوان': 3, 'استکان': 12.5, 'قاشقغذاخوری': 80, 'قاشق': 80, tbsp: 80, 'قاشقچایخوری': 240, tsp: 240, 'لیتر': 5, l: 5, liter: 5, 'کیلوگرم': 5, kg: 5 };
  const people = Number.isFinite(servings) && servings > 0 ? servings : 4;
  if (['گرم', 'میلی‌گرم'].includes(unit) && amount > 5000 * people) return `مقدار ${ingredient.item} بیش از ۵ کیلوگرم برای هر نفر است؛ مقدار یا واحد رسپی به‌احتمال زیاد اشتباه است.`;
  if (['میلی‌لیتر', 'میلیلیتر', 'میلی لیتر'].includes(unit) && amount > 5000 * people) return `مقدار ${ingredient.item} بیش از ۵ لیتر برای هر نفر است؛ مقدار یا واحد رسپی به‌احتمال زیاد اشتباه است.`;
  if (limits[unit] && amount / people > limits[unit]) return `مقدار ${ingredient.item} نسبت به تعداد نفرات بسیار بزرگ است؛ مقدار و واحد رسپی را بازبینی کنید.`;
  const compactItem = String(ingredient?.item || '').replace(/[\u200b-\u200d\ufeff\s]/gu, '').toLowerCase();
  const compactUnit = unit.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
  const mainFoods = /(?:مرغ|گوشت|ماهی|میگو|تخم.?مرغ|اسفناج|کدو|بادمجان|کلم|بروکلی|گوجه|سیب.?زمینی|هویج|قارچ|برنج|لوبیا|عدس|نخود|پنیر|نان|خمیر|ذرت|فلفل.?دلمه)/u;
  const combined = /(?:\s+(?:و|یا)\s+)|[,،/]/u.test(String(ingredient?.item || ''));
  if (!combined && !compactItem.includes('مایهخمیر') && amount > 0 && amount < 5 && mainFoods.test(compactItem) && /^(?:گرم|میلی.?لیتر|میلیلیتر)$/u.test(compactUnit)) {
    return `مقدار ${ingredient.item} کمتر از ۵ ${ingredient.unit} است و برای این مادهٔ اصلی به‌احتمال زیاد خطای مقدار یا واحد دارد؛ تا اصلاح، از انبار کسر نمی‌شود.`;
  }
  return '';
}
