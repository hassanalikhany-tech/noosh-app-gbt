import { Dish, NatureType, UserProfile, Ingredient, InventoryItem } from '../types';
import { getIngredientCategoryId, getBaseIngredientName } from '../data/pantry';
import PANTRY_UNIT_PREFERENCES from '../data/pantry_unit_preferences.json';
import { recipeQuantityProblem } from './quantitySanity.mjs';

export const isDishProhibited = (dish: Dish, user: UserProfile): boolean => {
  if (!user.dislikedIngredients || user.dislikedIngredients.length === 0) return false;
  if (!dish.ingredients) return false;
  
  const normalizedDisliked = user.dislikedIngredients.map(i => normalizeItemName(i));
  return dish.ingredients.some(ing => {
    const normalizedIng = normalizeItemName(ing.item);
    return normalizedDisliked.some(disliked => 
      normalizedIng.includes(disliked) || disliked.includes(normalizedIng)
    );
  });
};

export const estimateCookTime = (dish: Dish): number => {
  let time = 45; 
  if (dish.category === 'stew' || dish.category === 'ash') time = 120;
  if (dish.category === 'polo') time = 60;
  if (dish.category === 'kabab') time = 40;
  if (dish.category === 'fastfood' || dish.category === 'khorak') time = 30;
  if (dish.category === 'soup') time = 45;
  if (dish.category === 'international') time = 50;
  return time;
};

export const estimateCalories = (dish: Dish): number => {
  let baseCal = 400;
  if (dish.category === 'stew') baseCal = 550;
  if (dish.category === 'polo') baseCal = 650;
  if (dish.category === 'kabab') baseCal = 450;
  if (dish.category === 'khorak') baseCal = 380;
  if (dish.category === 'ash' || dish.category === 'soup') baseCal = 300;
  if (dish.category === 'fastfood') baseCal = 750;
  if (dish.category === 'international') baseCal = 500;
  return baseCal;
};

export const getDifficulty = (dish: Dish): 'آسان' | 'متوسط' | 'سخت' => {
  const time = estimateCookTime(dish);
  if (time < 45) return 'آسان';
  if (time > 90) return 'سخت';
  return 'متوسط';
};

export const getDishNature = (dish: Dish): { type: NatureType; label: string; mosleh: string } => {
  const raw = String(dish.nature || '').trim();
  const type: NatureType = raw === 'hot' || raw === 'گرم' ? 'hot' : raw === 'cold' || raw === 'سرد' ? 'cold' : 'balanced';
  return { type, label: dish.natureLabel || ({ hot: 'گرم', cold: 'سرد', balanced: 'معتدل' }[type]), mosleh: dish.mosleh || '' };
};

export const normalizeItemName = (str: string): string => 
  str.trim()
     .replace(/ی/g, 'ی')
     .replace(/ي/g, 'ی')
     .replace(/ک/g, 'ک')
     .replace(/ك/g, 'ک')
     .replace(/آ/g, 'ا')
     .replace(/\s+/g, '') // Remove all spaces for matching
     .replace(/[\u200B-\u200D\uFEFF]/g, '');

export const isIngredientMatch = (selected: string, ingredient: string): boolean => {
  const s = normalizeItemName(selected);
  const i = normalizeItemName(ingredient);
  
  // Specific fix for Egg (تخم مرغ) vs Chicken (مرغ)
  if ((s === 'مرغ' && i.includes('تخم مرغ')) || (i === 'مرغ' && s.includes('تخم مرغ'))) {
    return false;
  }

  // Specific fix for Water (آب) vs other liquids starting with Water (آبلیمو، آبغوره، ...)
  const waterNorm = normalizeItemName('آب');
  const waterBoilingNorm = normalizeItemName('آب جوش');
  
  if (s === waterNorm || s === waterBoilingNorm) {
    return i === waterNorm || i === waterBoilingNorm;
  }
  if (i === waterNorm || i === waterBoilingNorm) {
    return s === waterNorm || s === waterBoilingNorm;
  }

  if (i.includes(s) || s.includes(i)) return true;
  
  if (s === 'مرغ') {
    if (i.includes('جوجه') || i.includes('سینه') || i.includes('ران') || i.includes('بال') || i.includes('کتف')) {
      return true;
    }
  }

  if (s.includes('مرغ') && (i === 'مرغ' || i.includes('جوجه'))) {
    return true;
  }

  return false;
};

/** Pantry matching is stricter than preference/search matching: near-name foods
 * (for example red beans and pinto beans) must never consume each other's stock. */
export const isInventoryIngredientMatch = (stockName: string, recipeName: string): boolean => {
  const stock = getIngredientIdentity(stockName);
  const recipe = getIngredientIdentity(recipeName);
  if (!stock || !recipe) return false;
  // After safe preparation/parenthetical cleanup, any remaining conjunction is
  // a true compound or alternative and must not partially consume pantry stock.
  if (/\s+(?:یا|و)\s+|[,،/|]/.test(stock) || /\s+(?:یا|و)\s+|[,،/|]/.test(recipe)) return false;
  if (stock === recipe) return true;

  return false;
};

export type QuantityType = 'weight' | 'volume' | 'count' | 'unknown';
export interface BaseQuantity { value: number; type: QuantityType; baseUnit: string; form?: 'raw' | 'prepared'; estimated?: boolean }
interface UnitDefinition { factor: number; type: QuantityType; baseUnit: string }

// Noosh standard: mass -> g, volume -> ml, counts stay in their own unit family.
// One app پیمانه = 250 ml; tablespoon = 15 ml; teaspoon = 5 ml.
export const UNIT_CONVERSIONS: Record<string, UnitDefinition> = {
  'گرم': { factor: 1, type: 'weight', baseUnit: 'g' }, 'میلی‌گرم': { factor: 0.001, type: 'weight', baseUnit: 'g' },
  'کیلوگرم': { factor: 1000, type: 'weight', baseUnit: 'g' }, 'اونس': { factor: 28.349523125, type: 'weight', baseUnit: 'g' },
  'پوند': { factor: 453.59237, type: 'weight', baseUnit: 'g' }, 'مثقال': { factor: 4.608, type: 'weight', baseUnit: 'g' }, 'سیر': { factor: 75, type: 'weight', baseUnit: 'g' },
  'میلی‌لیتر': { factor: 1, type: 'volume', baseUnit: 'ml' }, 'لیتر': { factor: 1000, type: 'volume', baseUnit: 'ml' },
  'پیمانه': { factor: 250, type: 'volume', baseUnit: 'ml' }, 'پیمانه آمریکایی': { factor: 236.5882365, type: 'volume', baseUnit: 'ml' }, 'استکان': { factor: 100, type: 'volume', baseUnit: 'ml' }, 'لیوان': { factor: 250, type: 'volume', baseUnit: 'ml' },
  'قاشق غذاخوری': { factor: 15, type: 'volume', baseUnit: 'ml' }, 'قاشق چایخوری': { factor: 5, type: 'volume', baseUnit: 'ml' }, 'قاشق مرباخوری': { factor: 10, type: 'volume', baseUnit: 'ml' },
  'عدد': { factor: 1, type: 'count', baseUnit: 'count:piece' }, 'حلقه': { factor: 1, type: 'count', baseUnit: 'count:slice' },
  'بسته': { factor: 1, type: 'count', baseUnit: 'count:pack' }, 'قوطی': { factor: 1, type: 'count', baseUnit: 'count:can' }, 'حبه': { factor: 1, type: 'count', baseUnit: 'count:clove' },
  'قطعه': { factor: 1, type: 'count', baseUnit: 'count:portion' }, 'تکه': { factor: 1, type: 'count', baseUnit: 'count:portion' }, 'ورق': { factor: 1, type: 'count', baseUnit: 'count:sheet' }, 'شاخه': { factor: 1, type: 'count', baseUnit: 'count:sprig' }, 'دانه': { factor: 1, type: 'count', baseUnit: 'count:piece' },
};

const cleanUnitText = (unit: string): string => unit.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
const UNIT_ALIASES: Record<string, string> = {
  g: 'گرم', gram: 'گرم', grams: 'گرم', kg: 'کیلوگرم', kilo: 'کیلوگرم', kilogram: 'کیلوگرم', kilograms: 'کیلوگرم', mg: 'میلی‌گرم',
  oz: 'اونس', ounce: 'اونس', ounces: 'اونس', lb: 'پوند', lbs: 'پوند', pound: 'پوند', pounds: 'پوند',
  ml: 'میلی‌لیتر', milliliter: 'میلی‌لیتر', milliliters: 'میلی‌لیتر', millilitre: 'میلی‌لیتر', l: 'لیتر', liter: 'لیتر', liters: 'لیتر', litre: 'لیتر', litres: 'لیتر',
  // English recipe cups are US customary; keep their exact volume internally,
  // then render them as milliliters so the app never presents US measures.
  cup: 'پیمانه آمریکایی', cups: 'پیمانه آمریکایی', 'us cup': 'پیمانه آمریکایی', 'us cups': 'پیمانه آمریکایی', tbsp: 'قاشق غذاخوری', tablespoon: 'قاشق غذاخوری', tablespoons: 'قاشق غذاخوری', tsp: 'قاشق چایخوری', teaspoon: 'قاشق چایخوری', teaspoons: 'قاشق چایخوری',
  piece: 'عدد', pieces: 'عدد', number: 'عدد', each: 'عدد', 'واحد': 'عدد', clove: 'حبه', cloves: 'حبه', pack: 'بسته', package: 'بسته', can: 'قوطی',
};

export const normalizeUnit = (unit: string): string => {
  const u = cleanUnitText(unit);
  if (!u) return 'نامشخص';
  if (/سرپر|سرخالی|نوک|مشت|پنس/.test(u) || /(?:لیوان|استکان|پیمانه|قاشق)\s*(?:بزرگ|کوچک)/.test(u)) return u;
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u];
  if (u.includes('به میزان لازم') || u.includes('به مقدار لازم') || u.includes('دلخواه')) return 'به میزان لازم';
  if (u === 'کیلو') return 'کیلوگرم';
  if (u === 'پیمانه آمریکایی') return 'پیمانه آمریکایی';
  if (/^(کیلوگرم|گرم|میلی‌گرم|اونس|پوند|مثقال|سیر)$/.test(u)) return u;
  if (/^(میلی‌لیتر|میلیلیتر|سی‌سی|cc)$/.test(u)) return 'میلی‌لیتر';
  if (u === 'لیتر') return u;
  if (u.includes('قاشق چایخوری') || u.includes('قاشق مرباخوری کوچک')) return 'قاشق چایخوری';
  if (u.includes('قاشق مرباخوری')) return 'قاشق مرباخوری';
  // In Iranian recipe writing, an unqualified spoon (قاشق) means a regular
  // tablespoon. Keep this explicit in the shared app standard (15 ml).
  if (u.includes('قاشق غذاخوری') || u === 'قاشق' || u.includes('قاشق بزرگ')) return 'قاشق غذاخوری';
  if (u.includes('پیمانه')) return 'پیمانه';
  if (u.includes('استکان')) return 'استکان';
  if (u.includes('لیوان')) return 'لیوان';
  if (u.includes('حبه')) return 'حبه';
  if (u.includes('بسته')) return 'بسته';
  if (u.includes('قوطی')) return 'قوطی';
  if (u.includes('حلقه') || u.includes('ورقه')) return 'حلقه';
  if (u.includes('ورق')) return 'ورق';
  if (u.includes('شاخه')) return 'شاخه';
  if (u.includes('قطعه') || u.includes('تکه')) return 'قطعه';
  if (/عدد|دونه|دانه|بزرگ|متوسط|کوچک/.test(u)) return 'عدد';
  return u;
};

export const getUnitDisplayLabel = (unit: string): string => {
  const normalized = normalizeUnit(unit);
  if (normalized === 'پیمانه آمریکایی') return 'میلی‌لیتر';
  return ['گرم', 'میلی‌گرم', 'کیلوگرم', 'اونس', 'پوند', 'مثقال', 'سیر', 'میلی‌لیتر', 'لیتر', 'پیمانه', 'پیمانه آمریکایی', 'استکان', 'لیوان', 'قاشق غذاخوری', 'قاشق چایخوری', 'قاشق مرباخوری'].includes(normalized)
    ? normalized
    : unit;
};

/** Convert one entered quantity into familiar Iranian kitchen/shopping units. */
export const formatQuantityForDisplay = (amount: number, unit: string, itemName?: string): { amount: number; unit: string; estimated: boolean } => {
  const normalized = normalizeUnit(unit);
  const originalDefinition = UNIT_CONVERSIONS[normalized];
  // Keep recipe counts as counts; the count-to-weight conversion is for stock
  // reconciliation only and must not rewrite how a cook measures ingredients.
  if (originalDefinition?.type === 'count') return { amount, unit: getUnitDisplayLabel(normalized), estimated: false };
  // Preserve familiar Iranian kitchen measures in recipe instructions. Only
  // imported US cups are localized to metric; their volume is not the same as
  // Noosh's 250 ml پیمانه.
  if (originalDefinition?.type === 'volume' && normalized !== 'پیمانه آمریکایی') return { amount, unit: getUnitDisplayLabel(normalized), estimated: false };
  const converted = convertToBase(amount, normalized, itemName);
  if (converted.type === 'weight') {
    const useKg = converted.value >= 1000;
    const displayedAmount = roundQuantity(useKg ? converted.value / 1000 : converted.value, 6);
    return { amount: displayedAmount, unit: useKg ? 'کیلوگرم' : 'گرم', estimated: Boolean(converted.estimated) };
  }
  if (converted.type === 'volume' && normalized === 'پیمانه آمریکایی') {
    const useLiter = converted.value >= 1000;
    const displayedAmount = useLiter ? Math.round((converted.value / 1000) * 1000) / 1000 : Math.round(converted.value);
    return { amount: displayedAmount, unit: useLiter ? 'لیتر' : 'میلی‌لیتر', estimated: false };
  }
  return { amount, unit: getUnitDisplayLabel(normalized), estimated: false };
};

/** Safely preserve the physical quantity when a user changes a pantry unit. */
export const convertAmountBetweenUnits = (amount: number, fromUnit: string, toUnit: string, itemName?: string): { amount: number; estimated: boolean } | null => {
  const conversion = convertIngredientQuantity(amount, fromUnit, toUnit, itemName || '');
  return conversion ? { amount: conversion.amount, estimated: conversion.estimated } : null;
};

// USDA portions are quoted per US cup (236.588 ml). The table is deliberately
// ingredient-specific; where no reliable density exists, volume remains ml.
const US_CUP_ML = 236.5882365;
const VOLUME_MASS_REFERENCES: Array<{ aliases: string[]; gramsPerUsCup: number }> = [
  // FoodData Central/USDA household portions; all recipe and stock amounts use raw ingredients.
  { aliases: ['آرد نخودچی', 'آرد نخود'], gramsPerUsCup: 92 },
  { aliases: ['آرد سوخاری', 'پودر سوخاری'], gramsPerUsCup: 120 },
  { aliases: ['پنیر پارمزان', 'پنیر پارمزان رنده شده'], gramsPerUsCup: 100 },
  { aliases: ['برنج'], gramsPerUsCup: 185 },
  { aliases: ['عدس'], gramsPerUsCup: 192 },
  { aliases: ['لوبیا قرمز'], gramsPerUsCup: 184 }, { aliases: ['لوبیا سفید'], gramsPerUsCup: 202 },
  { aliases: ['لوبیا چیتی'], gramsPerUsCup: 193 },
  { aliases: ['نخود'], gramsPerUsCup: 200 },
  { aliases: ['شیر'], gramsPerUsCup: 244 }, { aliases: ['روغن زیتون'], gramsPerUsCup: 216 },
  { aliases: ['گردو'], gramsPerUsCup: 117 },
  // Common liquids and pastes missing from the original conversion set.
  // These are kitchen-weight estimates; water itself is excluded from stock tracking.
  { aliases: ['خامه ترش'], gramsPerUsCup: 242 },
  { aliases: ['خردل', 'خردل دیژون'], gramsPerUsCup: 236 },
  { aliases: ['رب نارنج'], gramsPerUsCup: 285 },
  { aliases: ['سالسا', 'سس سالسا قرمز'], gramsPerUsCup: 245 },
  { aliases: ['سس مایونز', 'سس مایونز کم چرب', 'سس مایونز گیاهی'], gramsPerUsCup: 225 },
  { aliases: ['طحینه', 'ارده خالص'], gramsPerUsCup: 250 },
  { aliases: ['عصاره سبزیجات', 'عصارهٔ سبزیجات', 'آب گوشت', 'عصاره مرغ', 'آب مرغ', 'عصاره گوشت', 'عصارهٔ استخوان', 'آب گوشت یا عصارهٔ استخوان', 'عصارهٔ مرغ یا عصارهٔ سبزیجات'], gramsPerUsCup: 237 },
  { aliases: ['ماست پرچرب', 'ماست ترش', 'ماست ترش همزده', 'دوغ غلیظ'], gramsPerUsCup: 245 },
  { aliases: ['نعنا داغ'], gramsPerUsCup: 125 },
  { aliases: ['کشک', 'کشک غلیظ', 'کشک ساییده شده محلی', 'کشک ساییده غلیظ'], gramsPerUsCup: 265 },
  { aliases: ['ادویه مجبوس', 'پودر بهارات'], gramsPerUsCup: 90 },
  { aliases: ['سبزی معطر خشک', 'شوید خشک'], gramsPerUsCup: 30 },
  { aliases: ['سبزی کوفته'], gramsPerUsCup: 50 },
  { aliases: ['خلال پوست پرتقال شیرین شده'], gramsPerUsCup: 150 },
  { aliases: ['روغن نباتی', 'روغن مایع', 'روغن گیاهی', 'روغن سرخ کردنی'], gramsPerUsCup: 230 },
  { aliases: ['روغن کرمانشاهی', 'روغن حیوانی', 'روغن محلی', 'کره', 'کره حیوانی', 'دنبه'], gramsPerUsCup: 227 },
  { aliases: ['سویا سس', 'سس سویا', 'سس کچاپ', 'سس باربیکیو', 'سس تند', 'سس خردل', 'سس تارتار'], gramsPerUsCup: 240 },
  { aliases: ['خامه غلیظ', 'خامه پرچرب'], gramsPerUsCup: 238 },
  { aliases: ['خامه ترش برای سرو', 'خامه ترش یا ماست پرچرب'], gramsPerUsCup: 242 },
  { aliases: ['آب گوشت عصاره', 'آب قلم', 'عصاره قلم', 'عصاره', 'آب پرتقال طبیعی', 'آب پرتقال تازه', 'دلستر کلاسیک'], gramsPerUsCup: 237 },
  { aliases: ['آبلیمو', 'آبلیمو تازه', 'ابلیموی ترش و تازه', 'آب لیمو ترش', 'آب نارنج', 'آبغوره', 'سرکه'], gramsPerUsCup: 240 },
  { aliases: ['رب انار', 'رب انار ملس'], gramsPerUsCup: 300 },
  { aliases: ['تمبر هندی', 'تمبر هندی خیس خورده'], gramsPerUsCup: 300 },
  { aliases: ['ماست', 'ماست کم چرب', 'ماست چکیده', 'ماست یونانی', 'ماست چکیده پرچرب'], gramsPerUsCup: 245 },
  { aliases: ['شیر نارگیل'], gramsPerUsCup: 240 },
  { aliases: ['آبگوشت', 'آب مرغ', 'آب گوشت', 'استاک مرغ', 'استاک گوشت', 'عصاره مرغ', 'عصاره گوشت'], gramsPerUsCup: 237 },
  { aliases: ['سس انچیلادا', 'سس قرمز انچیلادا', 'سس سبز انچیلادا', 'سس سالسا', 'سس سالسا قرمز', 'سس سبز', 'سس مخصوص بیبیم باپ', 'سس مخصوص بیبیم‌باپ', 'سس قرمز تند'], gramsPerUsCup: 245 },
  { aliases: ['آب یا آب گوشت', 'آب یا عصاره گوشت', 'آب مرغ یا آب گوشت', 'آب مرغ یا گوشت', 'آب گوشت یا آب'], gramsPerUsCup: 237 },
  { aliases: ['شراب سفید', 'شراب سفید خشک', 'شراب قرمز', 'شراب قرمز خشک', 'آب گازدار', 'آبجو', 'میرین', 'دشی', 'عصاره دود'], gramsPerUsCup: 240 },
  { aliases: ['شیر خشک', 'شیر خشک قنادی'], gramsPerUsCup: 125 },
  { aliases: ['کشک ساییده', 'کشک پاستوریزه'], gramsPerUsCup: 265 },
  { aliases: ['خلال پوست پرتقال', 'خلال پوست پرتقال شیرین شده'], gramsPerUsCup: 150 },
  { aliases: ['سس بشامل', 'سس سفید'], gramsPerUsCup: 245 },
  { aliases: ['سبزی محلی', 'سبزی معطر تازه', 'جعفری تازه', 'گشنیز تازه', 'جعفری خشک', 'گشنیز خرد شده', 'ادویه مخصوص', 'ادویه ترکیبی', 'پودر گل سرخ', 'جوش شیرین'], gramsPerUsCup: 80 },
  { aliases: ['تمر هندی'], gramsPerUsCup: 300 },
  { aliases: ['پودر سوخاری'], gramsPerUsCup: 115 },
  { aliases: ['پاچ باقلا', 'باقلا'], gramsPerUsCup: 170 },
];

// Fallbacks cover common Iranian-market ingredients when the catalogue has no
// item-specific density. A 250 ml Iranian پیمانه is used in the UI; these are
// intentionally approximate and always surfaced as estimates in the ledger.
const VOLUME_CATEGORY_GRAMS_PER_APP_CUP: Record<string, number> = {
  grains: 190, vegetables: 150, proteins: 230, additives: 160,
};

// Count-to-mass conversions are intentionally limited to produce whose
// reference-piece weights are documented in USDA FoodData Central. A recipe
// that says only "1 onion" uses the medium reference piece. Natural produce
// varies, so these values are estimates, not a claim about the user's actual
// onion or potato. Explicit small/large sizes are left unconverted unless a
// matching reference is added here.
const PIECE_MASS_REFERENCES: Array<{ aliases: string[]; gramsPerPiece: number; unit: 'عدد' | 'حبه' }> = [
  { aliases: ['ساقه کرفس'], gramsPerPiece: 40, unit: 'عدد' },
  { aliases: ['پیاز', 'پیاز قرمز', 'پیاز سفید'], gramsPerPiece: 110, unit: 'عدد' },
  { aliases: ['سیب زمینی'], gramsPerPiece: 213, unit: 'عدد' },
  { aliases: ['گوجه فرنگی'], gramsPerPiece: 123, unit: 'عدد' },
  { aliases: ['فلفل دلمه ای'], gramsPerPiece: 119, unit: 'عدد' },
  { aliases: ['کلم بروکلی'], gramsPerPiece: 300, unit: 'عدد' },
  { aliases: ['بادمجان'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['خمیر امپانادا', 'خمیر مخصوص امپانادا'], gramsPerPiece: 35, unit: 'عدد' },
  { aliases: ['خمیر یوفکا'], gramsPerPiece: 25, unit: 'عدد' },
  { aliases: ['هویج'], gramsPerPiece: 61, unit: 'عدد' },
  { aliases: ['سیر'], gramsPerPiece: 3, unit: 'حبه' },
  { aliases: ['مرغ', 'مرغ کامل', 'مرغ درسته', 'مرغ پاک شده'], gramsPerPiece: 2000, unit: 'عدد' },
  { aliases: ['اردک', 'اردک متوسط'], gramsPerPiece: 2000, unit: 'عدد' },
  { aliases: ['تخم مرغ', 'تخم مرغ درشت'], gramsPerPiece: 55, unit: 'عدد' },
  { aliases: ['بادمجان'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['خیار'], gramsPerPiece: 180, unit: 'عدد' },
  { aliases: ['فلفل سبز', 'فلفل سبز تند', 'فلفل تند'], gramsPerPiece: 25, unit: 'عدد' },
  { aliases: ['فلفل قرمز', 'فلفل قرمز تازه'], gramsPerPiece: 20, unit: 'عدد' },
  { aliases: ['قارچ', 'قارچ دکمه ای'], gramsPerPiece: 20, unit: 'عدد' },
  { aliases: ['کدو سبز'], gramsPerPiece: 200, unit: 'عدد' },
  { aliases: ['لیمو', 'لیمو ترش'], gramsPerPiece: 60, unit: 'عدد' },
  { aliases: ['سیب درختی', 'سیب'], gramsPerPiece: 180, unit: 'عدد' },
  { aliases: ['به'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['انار'], gramsPerPiece: 280, unit: 'عدد' },
  { aliases: ['هویج'], gramsPerPiece: 70, unit: 'عدد' },
  { aliases: ['سینه مرغ', 'گوشت سینه مرغ'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['ران مرغ'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['بال مرغ'], gramsPerPiece: 100, unit: 'عدد' },
  { aliases: ['میگو'], gramsPerPiece: 15, unit: 'عدد' },
  { aliases: ['زرده تخم مرغ', 'سفیده تخم مرغ'], gramsPerPiece: 18, unit: 'عدد' },
  // Additional average weights for foods sold by weight but often counted in recipes.
  { aliases: ['بادنجان', 'بادنجان قلمی', 'بادنجان شیرین قلمی', 'بادمجان قلمی'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['آلو', 'آلو خورشتی', 'آلو سیاه', 'آلو بخارا'], gramsPerPiece: 10, unit: 'عدد' },
  { aliases: ['خرما', 'خرمای بدون هسته', 'خرما هسته گرفته'], gramsPerPiece: 8, unit: 'عدد' },
  { aliases: ['برگه زردآلو', 'قیسی', 'برگه زردآلو قیسی'], gramsPerPiece: 8, unit: 'عدد' },
  { aliases: ['آووکادو', 'آووکادو رسیده'], gramsPerPiece: 200, unit: 'عدد' },
  { aliases: ['ترب سفید'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['زبان گوساله'], gramsPerPiece: 1000, unit: 'عدد' },
  { aliases: ['مغز گوسفند'], gramsPerPiece: 150, unit: 'عدد' },
  { aliases: ['کلم برگ', 'کلم برگ متوسط'], gramsPerPiece: 1000, unit: 'عدد' },
  { aliases: ['هلو', 'هلو سفت'], gramsPerPiece: 150, unit: 'عدد' },
  { aliases: ['فلفل چیلی خشک', 'فلفل چیلی قرمز'], gramsPerPiece: 5, unit: 'عدد' },
  { aliases: ['بادیان ستاره ای'], gramsPerPiece: 2, unit: 'عدد' },
  { aliases: ['رزماری'], gramsPerPiece: 2, unit: 'عدد' },
  { aliases: ['پنیر چدار ورقه ای'], gramsPerPiece: 20, unit: 'عدد' },
  { aliases: ['جلبک نوری', 'جلبک نوری ورق خشک', 'جلبک دریایی نوری'], gramsPerPiece: 3, unit: 'عدد' },
  { aliases: ['پوری آماده'], gramsPerPiece: 5, unit: 'عدد' },
  { aliases: ['خمیر اسپرینگ رول'], gramsPerPiece: 12, unit: 'عدد' },
  { aliases: ['خمیر پیتزا', 'خمیر پیتزا آماده', 'خمیر پیتزا سبوس دار'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['نان لواش', 'دوروم', 'پیده'], gramsPerPiece: 60, unit: 'عدد' },
  { aliases: ['سیب درختی سفت'], gramsPerPiece: 180, unit: 'عدد' },
  { aliases: ['میوه به'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['نارنج'], gramsPerPiece: 200, unit: 'عدد' },
  { aliases: ['گالانگال', 'گالانگال تازه', 'زنجبیل', 'زنجبیل تازه'], gramsPerPiece: 25, unit: 'عدد' },
  { aliases: ['لواش', 'نان لواش', 'لواش تازه', 'نان تافتون', 'تافتون'], gramsPerPiece: 60, unit: 'عدد' },
  { aliases: ['پنیر گودا', 'پنیر چدار', 'پنیر کاشار', 'پنیر موزارلا', 'پنیر پارمزان'], gramsPerPiece: 20, unit: 'عدد' },
  { aliases: ['خمیر یوفکا', 'یوفکا', 'خمیر فیلو'], gramsPerPiece: 30, unit: 'عدد' },
  { aliases: ['جلبک دریایی', 'جلبک نوری'], gramsPerPiece: 3, unit: 'عدد' },
];

const getPieceMassReference = (itemName: string | undefined, unit: string) => {
  if (!itemName) return undefined;
  const normalizedUnit = normalizeUnit(unit);
  if (normalizedUnit !== 'عدد' && normalizedUnit !== 'حبه' && normalizedUnit !== 'دانه' && normalizedUnit !== 'قطعه' && normalizedUnit !== 'تکه' && normalizedUnit !== 'شاخه' && normalizedUnit !== 'ورق') return undefined;
  // The actual amount field is authoritative. Imported labels sometimes repeat
  // it ("پیاز ۲ عدد"); strip only a leading/trailing count, never a number in
  // the middle of a compound ingredient.
  const cleanName = itemName
    .replace(/\(([^)]*)\)/g, (whole, note: string) => /(?:^|\s)یا(?:\s|$)|[/|]/.test(note) && !/^(?:مانند|مثل|کاد|ران|فیله|با استخوان|آب.?پز یا خام رنده)/.test(note.trim()) ? whole : ' ')
    .replace(/^\s*(?:حدود\s*)?[0-9۰-۹٠-٩]+(?:\s*\/\s*[0-9۰-۹٠-٩]+)?\s*(?:عدد|دانه|حبه|گرم|کیلو(?:گرم)?|میلی.?لیتر|لیتر|پیمانه|قاشق(?:\s*(?:غذاخوری|چای.?خوری|مرباخوری))?|ورق|بسته|قوطی)\s+/i, '')
    .replace(/\s+[0-9۰-۹٠-٩]+(?:\s*\/\s*[0-9۰-۹٠-٩]+)?\s*(?:عدد|دانه|حبه|گرم|کیلو(?:گرم)?|میلی.?لیتر|لیتر|پیمانه|قاشق(?:\s*(?:غذاخوری|چای.?خوری|مرباخوری))?|ورق|بسته|قوطی)\s*$/i, '')
    .replace(/\s+و\s+(?=(?:خلال|نگینی|نواری|حلقه|ریز|درشت|کاملاً\s+آب.?گرفته|آب.?گرفته|له\s+شده|پوره\s+شده|ریش.?ریش|خرد\s+شده))/g, ' ')
    .replace(/\s+و\s+تازه\s*$/g, ' ')
    .replace(/\s+و\s+با\s+کیفیت\b/g, ' ')
    .replace(/\s+و\s+ریش\s+شده\b/g, ' ')
    .replace(/\s+و\s+با\s+کیفیت\b/g, ' ')
    .replace(/\s+و\s+(?:کاملاً\s+)?آب.?گرفته\b/g, ' ');
  if (/\s+(?:یا|و)\s+|[,،/|]/.test(cleanName)) return undefined;
  const label = cleanName
    .replace(/^\s*[0-9۰-۹٠-٩]+\s*(?:عدد|دونه|دانه|حبه|قطعه)?\s*/,'')
    .replace(/\s*[0-9۰-۹٠-٩]+(?:[.,٫][0-9۰-۹٠-٩]+)?\s*(?:عدد|دونه|دانه|حبه|قطعه)?\s*$/,'');
  if (/[0-9۰-۹٠-٩]/.test(label)) return undefined;
  const normalized = normalizeItemName(label);
  const explicitSize = /بزرگ|درشت|کوچک|ریز/.test(normalized);
  const withoutDescriptors = normalizeItemName(getIngredientIdentity(label));
  const sizedReferences: Record<string, Record<string, number>> = (PANTRY_UNIT_PREFERENCES as { weightEquivalences?: ReferenceOverrides }).weightEquivalences || {};
  const key = getIngredientIdentity(label);
  const sizeKey = /بزرگ|درشت/.test(normalized) ? 'عدد بزرگ' : /کوچک|ریز/.test(normalized) ? 'عدد کوچک' : 'عدد متوسط';
  const adminReference = sizedReferences[key]?.[sizeKey] || (!explicitSize ? sizedReferences[key]?.[normalizedUnit] : undefined);
  if (Number.isFinite(adminReference) && adminReference! > 0) return adminReference;
  const reference = PIECE_MASS_REFERENCES.find(entry => entry.unit === (normalizedUnit === 'حبه' ? 'حبه' : 'عدد') && entry.aliases.some(alias => normalizeItemName(alias) === withoutDescriptors));
  if (!reference) return undefined;
  // "قطعه" and similar are generic; use these only for the explicit whole
  // piece names above. Cloves are only meaningful as garlic cloves.
  if (normalizedUnit === 'حبه' && reference.unit !== 'حبه') return undefined;
  if (normalizedUnit !== 'حبه' && reference.unit === 'حبه') return undefined;
  if (explicitSize) {
    const modifier = /بزرگ|درشت/.test(normalized) ? 1.35 : 0.7;
    return reference.gramsPerPiece * modifier;
  }
  const sizeFactor = /بزرگ|درشت/.test(normalized) ? 1.35 : /کوچک|ریز/.test(normalized) ? 0.65 : 1;
  return roundQuantity(reference.gramsPerPiece * sizeFactor);
};

const getAverageCountGrams = (label: string, unit: string): number | undefined => {
  const normalized = normalizeItemName(label);
  const normalizedUnit = normalizeUnit(unit);
  if (normalizedUnit === 'بسته') return 250;
  if (normalizedUnit === 'قوطی') return 180;
  if (normalizedUnit === 'ورق') return /خمیر|یوفکا|لازانیا|نوری|جلبک/.test(normalized) ? 20 : 15;
  if (normalizedUnit === 'شاخه') return /علف لیمو/.test(normalized) ? 25 : /کرفس|تره فرنگی/.test(normalized) ? 40 : 10;
  if (normalizedUnit === 'حبه') return /سیر/.test(normalized) ? 3 : 5;
  if (normalizedUnit !== 'عدد' && normalizedUnit !== 'دانه' && normalizedUnit !== 'قطعه' && normalizedUnit !== 'تکه') return undefined;
  if (/مرغ|اردک|بوقلمون|غاز|بلدرچین/.test(normalized) && !/ران|سینه|بال|گردن|قطعه|تکه|چرخکرده/.test(normalized)) return /اردک/.test(normalized) ? 2000 : /بوقلمون/.test(normalized) ? 5000 : /غاز/.test(normalized) ? 3500 : /بلدرچین/.test(normalized) ? 200 : 2000;
  if (/تخممرغ|زردهتخممرغ|سفیدهتخممرغ/.test(normalized)) return /درشت/.test(normalized) ? 60 : /زرده|سفیده/.test(normalized) ? 18 : 55;
  if (/گوشت|ماهی|فیله|میگو|سوسیس|کالباس|توفو/.test(normalized)) return /میگو/.test(normalized) ? 15 : /سوسیس|کالباس/.test(normalized) ? 55 : /ماهی|فیله/.test(normalized) ? 180 : 150;
  if (/نان|برگر/.test(normalized)) return 70;
  if (/سبزی|جعفری|گشنیز|شوید|ریحان|نعنا/.test(normalized)) return 100;
  const category = getIngredientCategoryId(label);
  if (category === 'vegetables') return /سیر/.test(normalized) ? 3 : /برگ|حلقه/.test(normalized) ? 15 : /فلفل/.test(normalized) ? 100 : 150;
  if (category === 'proteins') return 150;
  if (category === 'grains') return 70;
  if (category === 'additives') return /زعفران|هل|میخک|بادیان/.test(normalized) ? 1 : 10;
  return undefined;
};
const getIngredientDensity = (itemName?: string): number | undefined => {
  if (!itemName) return undefined;
  // Mixed/alternative ingredients have no single defensible bulk density.
  const cleanName = itemName.replace(/\([^)]*\)/g, ' ').trim();
  const canonicalItem = getIngredientIdentity(cleanName);
  if (isUnresolvedCompoundIngredient(cleanName)) return undefined;
  const match = VOLUME_MASS_REFERENCES.find(entry => entry.aliases.some(alias => canonicalItem === getIngredientIdentity(alias)));
  if (match) return match.gramsPerUsCup / US_CUP_ML;
  const category = getIngredientCategoryId(itemName);
  const fallback = category ? VOLUME_CATEGORY_GRAMS_PER_APP_CUP[category] : undefined;
  return fallback ? fallback / 250 : undefined;
};

const getIngredientForm = (itemName?: string): BaseQuantity['form'] => {
  if (!itemName) return undefined;
  // Recipes describe raw ingredients consumed from the pantry. Cooking changes
  // the dish, but never changes the quantity basis used for inventory accounting.
  return 'raw';
};

/** A reference is ingredient/form specific; generic portions never become whole birds. */
export const getWeightPerUnit = (unit: string, label: string, references?: ReferenceOverrides): number | undefined => {
  const normalized = normalizeUnit(unit);
  const definition = UNIT_CONVERSIONS[normalized];
  if (definition?.type === 'weight') return definition.factor;
  if (!definition || isUnresolvedCompoundIngredient(label)) return undefined;
  const size = /بزرگ|درشت/.test(label + unit) ? 'بزرگ' : /کوچک|ریز/.test(label + unit) ? 'کوچک' : /متوسط/.test(label + unit) ? 'متوسط' : '';
  const key = getIngredientIdentity(label);
  const source = references ?? (PANTRY_UNIT_PREFERENCES as { weightEquivalences?: ReferenceOverrides }).weightEquivalences ?? {};
  const referenceKey = size && normalized === 'عدد' ? `عدد ${size}` : normalized;
  const direct = source[key]?.[referenceKey] ?? (size === 'متوسط' ? source[key]?.[normalized] : undefined);
  if (Number.isFinite(direct) && direct > 0) return direct;
  if (definition.type === 'volume') {
    const known = Object.entries(source[key] || {}).find(([knownUnit, grams]) => UNIT_CONVERSIONS[normalizeUnit(knownUnit)]?.type === 'volume' && Number.isFinite(grams) && grams > 0);
    if (known) return known[1] / UNIT_CONVERSIONS[normalizeUnit(known[0])].factor * definition.factor;
    const density = getIngredientDensity(label);
    return density === undefined ? undefined : density * definition.factor;
  }
  const directPiece = getPieceMassReference(label, normalized);
  if (directPiece !== undefined) return directPiece;
  return getAverageCountGrams(label, normalized);
};
export const convertToBase = (amount: number, unit: string, itemName?: string, references?: ReferenceOverrides): BaseQuantity => {
  const normalizedUnit = normalizeUnit(unit);
  const definition = UNIT_CONVERSIONS[normalizedUnit];
  const form = getIngredientForm(itemName);
  if (!definition || !Number.isFinite(amount) || amount < 0) return { value: Number.isFinite(amount) ? amount : 0, type: 'unknown', baseUnit: normalizedUnit, form };
  const grams = itemName ? getWeightPerUnit(unit, itemName, references) : undefined;
  if (grams !== undefined && definition.type !== 'weight') return { value: amount * grams, type: 'weight', baseUnit: 'g', form, estimated: true };
  return { value: amount * definition.factor, type: definition.type, baseUnit: definition.baseUnit, form };
};

export const areUnitsComparable = (left: BaseQuantity, right: BaseQuantity): boolean =>
  left.type === right.type && left.baseUnit === right.baseUnit && left.type !== 'unknown' &&
  (!left.form && !right.form || left.form === right.form);

/** Arithmetic keeps nine decimal places; rounding for display never feeds stock. */
export const roundQuantity = (value: number, digits = 9) => Number(value.toFixed(digits));
export const parseQuantity = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : NaN;
  let text = String(value ?? '').trim().replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/٫/g, '.');
  const fractions: Record<string, string> = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3' };
  text = text.replace(/[½¼¾⅓⅔]/g, fraction => ` ${fractions[fraction]}`).trim();
  const fraction = text.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[3]) > 0 ? Number(fraction[1] || 0) + Number(fraction[2]) / Number(fraction[3]) : NaN;
  const numeric = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) ? Number(text) : NaN;
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : NaN;
};

export const getIngredientIdentity = (name: string) => {
  // Parentheses often explain cuts or preparation. Remove those notes only
  // when they do not encode alternatives; e.g. “(ران یا سردست)” stays distinct.
  let label = name.replace(/[\u200B-\u200D]/g, ' ').trim()
    .replace(/\(([^)]*)\)/g, (whole, note: string) => /(?:^|\s)یا(?:\s|$)|[/|]/.test(note) && !/^(?:مانند|مثل|کاد|ران|فیله|با استخوان|آب.?پز یا خام رنده)/.test(note.trim()) ? whole : ' ')
    // Item labels in imported rows sometimes repeat their quantity. The
    // structured amount/unit fields remain authoritative for arithmetic.
    .replace(/^\s*(?:حدود\s*)?[0-9۰-۹٠-٩]+(?:\s*\/\s*[0-9۰-۹٠-٩]+)?\s*(?:عدد|دانه|حبه|گرم|کیلو(?:گرم)?|میلی.?لیتر|لیتر|پیمانه|قاشق(?:\s*(?:غذاخوری|چای.?خوری|مرباخوری))?|ورق|بسته|قوطی)\s+/i, '')
    .replace(/\s+[0-9۰-۹٠-٩]+(?:\s*\/\s*[0-9۰-۹٠-٩]+)?\s*(?:عدد|دانه|حبه|گرم|کیلو(?:گرم)?|میلی.?لیتر|لیتر|پیمانه|قاشق(?:\s*(?:غذاخوری|چای.?خوری|مرباخوری))?|ورق|بسته|قوطی)\s*$/i, '')
    .replace(/\s+و\s+(?=(?:خلال|نگینی|نواری|حلقه|ریز|درشت|کاملاً|اب.?گرفته|له\s+شده|پوره\s+شده|ریش.?ریش|خرد\s+شده|تازه\b))/g, ' ')
    .replace(/\s+و\s+(?:با\s+)?کیفیت\s*$/g, ' ')
    .replace(/\s+و\s+ریش\s+شده\s*$/g, ' ')
    .replace(/\s+و\s+(?:کاملاً\s+)?آب.?گرفته\b/g, ' ')
    .replace(/\s+و\s+تفت\s+داده\s+شده\b/g, ' ')
    .replace(/\s+و\s+تازه\s*$/g, ' ')
    .replace(/\s+ملس\s+یا\s+ترش\s*$/g, '')
    .replace(/\s+زرد\s+یا\s+قرمز\s*$/g, '')
    .replace(/(?:سینه|ران|کتف|بال)\s+و\s+(?:سینه|ران|کتف|بال)\s+مرغ/g, 'مرغ')
    .replace(/\s+(?:برای\s+(?:سرو|تزیین|تزئین)|اختیاری)\s*$/g, '')
    .replace(/^\s*[0-9۰-۹٠-٩]+\s*(?:عدد|دانه|حبه)?\s*/, '')
    .replace(/\s*[0-9۰-۹٠-٩]+(?:[.,٫][0-9۰-۹٠-٩]+)?\s*(?:عدد|دانه|حبه)?\s*$/, '');
  if (/\s+(?:یا|و)\s+|[,،/|]/.test(label)) return normalizeItemName(label);
  const descriptors = /(?:^|\s)(?:کوچک|متوسط|بزرگ|درشت|ریز|تازه|خام|خشک|پخته|آبپز|آبکش|شسته|پوست گرفته|پوست کنده|خرد شده|خردشده|رنده شده|رندهشده|رنده|نگینی|خلالی|خلال شده|حلقه شده|آب گرفته|کاملاً آب گرفته|پوره شده)(?=\s|$)/g;
  // Keep dried/powdered/broth identities: these are different foods, not measurements.
  label = label.replace(descriptors, match => /خشک/.test(match) ? match : ' ').replace(/(?:سرخ|کباب|آبپز|آبکش|پخته)\s*شده/g, ' ').replace(/\s+/g, ' ').trim();
  const aliases: Record<string,string> = { 'ابلیموی ترش و تازه': 'آبلیمو', 'ابلیمو ترش': 'آبلیمو', 'ابلیموی تازه': 'آبلیمو', 'چدار': 'پنیر چدار', 'گودا': 'پنیر گودا', 'موزارلا': 'پنیر موزارلا', 'پارمزان': 'پنیر پارمزان', 'پاستوریزه': 'کشک', 'جلبک دریایی': 'جلبک نوری', 'گوجه': 'گوجه فرنگی', 'فلفل دلمه': 'فلفل دلمه ای', 'گوساله': 'گوشت گوساله', 'گوسفند': 'گوشت گوسفندی', 'گوسفندی': 'گوشت گوسفندی', 'سینه مرغ': 'مرغ', 'گوشت سینه مرغ': 'مرغ', 'ران مرغ': 'مرغ', 'بال مرغ': 'مرغ', 'کتف مرغ': 'مرغ', 'گردن مرغ': 'مرغ', 'مرغ کامل': 'مرغ', 'مرغ درسته': 'مرغ', 'مرغ پاک شده': 'مرغ', 'جوجه': 'مرغ', 'برنج ایرانی': 'برنج', 'برنج باسماتی': 'برنج', 'برنج دانه بلند': 'برنج', 'عدس خشک': 'عدس', 'نخود خشک': 'نخود', 'لوبیا قرمز خشک': 'لوبیا قرمز', 'لوبیا چیتی خشک': 'لوبیا چیتی', 'لوبیا سفید خشک': 'لوبیا سفید' };
  return normalizeItemName(aliases[label] || label);
};
export const isUnresolvedCompoundIngredient = (name: string) => {
  const withoutPreparationJoin = name
    .replace(/\(([^)]*)\)/g, (whole, note: string) => /(?:^|\s)یا(?:\s|$)|[/|]/.test(note) && !/^(?:مانند|مثل|کاد|ران|فیله|با استخوان|آب.?پز یا خام رنده)/.test(note.trim()) ? whole : ' ')
    .replace(/^\s*(?:حدود\s*)?[0-9۰-۹٠-٩]+(?:\s*\/\s*[0-9۰-۹٠-٩]+)?\s*(?:عدد|دانه|حبه|گرم|کیلو(?:گرم)?|میلی.?لیتر|لیتر|پیمانه|قاشق(?:\s*(?:غذاخوری|چای.?خوری|مرباخوری))?|ورق|بسته|قوطی)\s+/i, '')
    .replace(/\s+و\s+(?=(?:خلال|نگینی|نواری|حلقه|ریز|درشت|کاملاً|اب.?گرفته|له\s+شده|پوره\s+شده|ریش.?ریش|ریش\s+شده|خرد\s+شده|تازه|با\s+کیفیت))/g, ' ')
    .replace(/\s+و\s+تازه\s*$/g, ' ')
    .replace(/\s+و\s+(?:کاملاً\s+)?آب.?گرفته/g, ' ')
    .replace(/\s+و\s+تفت\s+داده\s+شده/g, ' ')
    .replace(/\s+ملس\s+یا\s+ترش\s*$/g, '')
    .replace(/\s+زرد\s+یا\s+قرمز\s*$/g, '')
    .replace(/(?:سینه|ران|کتف|بال)\s+و\s+(?:سینه|ران|کتف|بال)\s+مرغ/g, 'مرغ')
    .replace(/[0-9۰-۹٠-٩]+\s*\/\s*[0-9۰-۹٠-٩]+/g, ' ');
  return /(?:^|\s)یا(?:\s|$)|[,،/|]/.test(withoutPreparationJoin) || /\s+و\s+/.test(withoutPreparationJoin);
};
export const getPhysicalForm = getIngredientForm;
export const getIngredientMeasurementName = (ingredient: Ingredient) => {
  if (!ingredient.ingredientId && !ingredient.state) return ingredient.item;
  const size = /بزرگ|درشت/.test(ingredient.item + ingredient.unit) ? 'بزرگ' : /کوچک|ریز/.test(ingredient.item + ingredient.unit) ? 'کوچک' : /متوسط/.test(ingredient.item + ingredient.unit) ? 'متوسط' : '';
  return `${ingredient.ingredientId || getIngredientIdentity(ingredient.item)} ${size}`.trim();
};
/** Split only plain “A یا B” alternatives. Combinations and parenthesized text
 * stay intact because their quantities cannot safely be apportioned. */
export const splitIngredientAlternatives = (item: string): string[] => {
  const quantityFree = item
    .replace(/^\s*(?:حدود\s*)?[0-9۰-۹٠-٩]+(?:\s*\/\s*[0-9۰-۹٠-٩]+)?\s*(?:عدد|دانه|حبه|گرم|کیلو(?:گرم)?|میلی.?لیتر|لیتر|پیمانه|قاشق(?:\s*(?:غذاخوری|چای.?خوری|مرباخوری))?|ورق|بسته|قوطی)\s+/i, '')
    .trim();
  const parenthetical = quantityFree.match(/^(.*?)\s*\(\s*(?:ترجیحاً\s+)?(?:حیوانی\s+یا\s+)?یا\s+([^()]*)\s*\)$/);
  let source = quantityFree;
  if (parenthetical && !/[,،]/.test(parenthetical[2])) source = `${parenthetical[1]} یا ${parenthetical[2]}`;
  const qualifierAlternative = quantityFree.match(/^(.*?)\s*\(\s*ترجیحاً\s+(حیوانی)\s+یا\s+([^()]*)\s*\)$/);
  if (qualifierAlternative) source = `${qualifierAlternative[1].replace(/\s*\([^)]*\)\s*$/, '').trim()} ${qualifierAlternative[2]} یا ${qualifierAlternative[3]}`;
  if (!isUnresolvedCompoundIngredient(source)) return [source];
  if (/[,،|]/.test(source) || /\sو\s/.test(source)) return [item];
  const options = source.split(/\s+یا\s+|\s*\/\s*/).map(option => option.trim()).filter(Boolean);
  const abbreviatedOptions = options.map((option, index) => {
    if (index === 0 || !options[0]) return option;
    const cleanedOption = option.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const shortChoice = normalizeItemName(cleanedOption);
    if (['تازه', 'خشک'].includes(shortChoice)) return `${options[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim()} ${cleanedOption}`;
    if (shortChoice === 'گیاهی' || shortChoice === 'حیوانی') return `${options[0].split(/\s+/)[0]} ${cleanedOption}`;
    if (!['چدار','گودا','موزارلا','پارمزان','پاستوریزه','قرمز','سبز'].includes(shortChoice)) return option;
    return `${options[0].split(/\s+/)[0]} ${cleanedOption}`;
  });
  const modifiers = new Set(['ترش', 'شیرین', 'ملس', 'سفت', 'رسیده', 'خشک', 'تازه', 'درشت', 'ریز', 'کوچک', 'بزرگ', 'دلخواه', 'اختیاری']);
  return abbreviatedOptions.length > 1 && abbreviatedOptions.length <= 4 && abbreviatedOptions.every(option => option.length >= 2 && !modifiers.has(normalizeItemName(option))) ? abbreviatedOptions : [item];
};
export type ReferenceOverrides = Record<string, Record<string, number>>;
export interface QuantityConversion { amount: number; estimated: boolean; reason: string }
/** Converts measurement units only; ingredient quantities always use the raw-food basis. */
export const convertIngredientQuantity = (
  amount: number, fromUnit: string, toUnit: string, itemName: string,
  stockName = itemName, references?: ReferenceOverrides
): QuantityConversion | null => {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const from = UNIT_CONVERSIONS[normalizeUnit(fromUnit)];
  const to = UNIT_CONVERSIONS[normalizeUnit(toUnit)];
  if (!from || !to) return null;
  if (from.type === to.type && from.baseUnit === to.baseUnit) {
    if (from.type === 'count') {
      const size = (label: string) => /بزرگ|درشت/.test(label) ? 'large' : /کوچک|ریز/.test(label) ? 'small' : /متوسط/.test(label) ? 'medium' : '';
      if (size(itemName + fromUnit) !== size(stockName + toUnit)) return null;
    }
    return { amount: roundQuantity(amount * from.factor / to.factor), estimated: false, reason: 'تبدیل مستقیم واحد؛ مبنا همیشه مقدار مادهٔ خام است' };
  }
  const sourceMass = getWeightPerUnit(fromUnit, itemName, references);
  const targetMass = getWeightPerUnit(toUnit, stockName, references);
  if (sourceMass === undefined || targetMass === undefined || targetMass <= 0) return null;
  return { amount: roundQuantity(amount * sourceMass / targetMass), estimated: true, reason: `هر ۱ ${fromUnit} ${itemName} ≈ ${roundQuantity(sourceMass,6)} گرم؛ هر ۱ ${toUnit} موجودی ≈ ${roundQuantity(targetMass,6)} گرم (میانگین تقریبی)` };
};

export interface InventoryEvaluationLine {
  index: number; item: string; recipeAmount: number; recipeUnit: string;
  status: 'ready' | 'shortage' | 'blocked' | 'unmeasured';
  reason: string; estimated: boolean;
  allocations: Array<{ inventoryId: string; name: string; unit: string; before: number; after: number; consumed: number; estimated: boolean; reason: string }>;
  shortage?: { item: string; amount: number; unit: string; category: string; estimated?: boolean; unresolved?: boolean };
}
export interface InventoryEvaluation { lines: InventoryEvaluationLine[]; newInventory: InventoryItem[] }

const WATER_ITEMS = new Set(['اب', 'ابجوش', 'ابولرم', 'ابسرد', 'ابگرم']);
export const isUntrackedPantryIngredient = (name: string): boolean => {
  const normalized = getIngredientIdentity(name).replace(/[۰-۹٠-٩]/g, '').replace(/برای(?:موادمیانی|حلکردنتمر|سرو)/g, '');
  if (/(?:کوزه|سیخچوبی|زغال|ذغال|دودهیزم|اهنتمیز)/.test(normalized)) return true;
  return WATER_ITEMS.has(normalized) || /^اب(?:جوش|ولرم|سرد|گرم|یخ)?(?:بهمقدارلازم|\d+(?:پیمانه)?)?$/.test(normalized) || /^کمیاب$/.test(normalized);
};
export const evaluateInventory = (inventory: InventoryItem[], ingredients: Ingredient[], servings: number, baseServings = 4): InventoryEvaluation => {
  if (!Number.isFinite(servings) || servings <= 0 || !Number.isFinite(baseServings) || baseServings <= 0) throw new Error('تعداد نفرات دستور و پخت باید مثبت و معتبر باشد.');
  const stock = inventory.map(row => {
    const definition = UNIT_CONVERSIONS[normalizeUnit(row.unit || '')];
    const amount = row.measurement && definition && row.measurement.baseUnit === definition.baseUnit && Number.isFinite(row.measurement.value) && row.measurement.value >= 0 && row.measurement.enteredAmount === row.amount && row.measurement.enteredUnit === row.unit ? row.measurement.value / definition.factor : row.amount;
    return { ...row, amount };
  });
  const lines: InventoryEvaluationLine[] = [];
  ingredients.forEach((ingredient, index) => {
    const item = ingredient.item || '';
    if (isUntrackedPantryIngredient(item)) return;
    const parsed = parseQuantity(ingredient.amount);
    const required = parsed * servings / baseServings;
    const unit = ingredient.unit || '';
    const measurementName = getIngredientMeasurementName(ingredient);
    const line: InventoryEvaluationLine = { index, item, recipeAmount: required, recipeUnit: unit, status: 'ready', reason: '', estimated: false, allocations: [] };
    lines.push(line);
    if (!item.trim() || !Number.isFinite(required) || required <= 0 || normalizeUnit(unit) === 'به میزان لازم' || /به\s*(?:میزان|مقدار)\s*لازم|دلخواه/.test(item)) {
      line.status = 'unmeasured'; line.reason = 'مقدار مصرف مشخص نیست؛ بدون ورود مصرف واقعی از انبار کم نمی‌شود.';
      if (item.trim() && !inventory.some(row => row.amount > 0 && isInventoryIngredientMatch(row.name,item))) line.shortage = { item, amount: 0, unit, category: getIngredientCategoryId(item) || 'other', unresolved: true };
      return;
    }
    const quantityProblem = recipeQuantityProblem({ ...ingredient, amount: parsed }, baseServings);
    if (quantityProblem) { line.status = 'blocked'; line.reason = quantityProblem; return; }
    const alternatives = splitIngredientAlternatives(item);
    const optionAvailability = alternatives.map(option => {
      if (isUntrackedPantryIngredient(option)) return { option, rows: [] as typeof stock, available: Number.POSITIVE_INFINITY, untracked: true };
      const rows = stock.filter(row => (ingredient.ingredientId && row.ingredientId ? ingredient.ingredientId === row.ingredientId : isInventoryIngredientMatch(row.name, option)) && Number.isFinite(row.amount) && row.amount > 0);
      let available = 0;
      rows.forEach(row => {
        const references = row.unitWeightGrams ? { ...((PANTRY_UNIT_PREFERENCES as { weightEquivalences?: ReferenceOverrides }).weightEquivalences || {}), [getIngredientIdentity(measurementName)]: { ...((PANTRY_UNIT_PREFERENCES as { weightEquivalences?: ReferenceOverrides }).weightEquivalences || {})[getIngredientIdentity(measurementName)], ...row.unitWeightGrams } } : undefined;
        const conversion = convertIngredientQuantity(1, unit, row.unit, option, getIngredientMeasurementName({ item: option, amount: row.amount, unit: row.unit, state: row.state, ingredientId: row.ingredientId }), references);
        if (conversion?.amount > 0) available += row.amount / conversion.amount;
      });
      return { option, rows, available, untracked: false };
    });
    const stockedOptions = optionAvailability.filter(option => !option.untracked && option.available > 0);
    const chosen = stockedOptions.find(option => option.available >= required) || stockedOptions.sort((a, b) => b.available - a.available)[0] || optionAvailability.find(option => option.untracked) || optionAvailability[0];
    if (chosen?.untracked) return;
    const selectedItem = chosen?.option || item;
    const candidates = chosen?.rows || stock.filter(row => (ingredient.ingredientId && row.ingredientId ? ingredient.ingredientId === row.ingredientId : isInventoryIngredientMatch(row.name, selectedItem)) && Number.isFinite(row.amount) && row.amount > 0);
    if (alternatives.length > 1) line.reason = `از بین گزینه‌های این رسپی، «${selectedItem}» مبنای محاسبه شد.`;
    let remaining = required;
    let compatible = 0;
    let shortageReferences: ReferenceOverrides | undefined;
    for (const row of candidates) {
      const references = row.unitWeightGrams ? { ...((PANTRY_UNIT_PREFERENCES as { weightEquivalences?: ReferenceOverrides }).weightEquivalences || {}), [getIngredientIdentity(measurementName)]: { ...((PANTRY_UNIT_PREFERENCES as { weightEquivalences?: ReferenceOverrides }).weightEquivalences || {})[getIngredientIdentity(measurementName)], ...row.unitWeightGrams } } : undefined;
      const conversion = convertIngredientQuantity(1, unit, row.unit, selectedItem, getIngredientMeasurementName({ item: row.name, amount: row.amount, unit: row.unit, state: row.state, ingredientId: row.ingredientId }), references);
      if (!conversion || conversion.amount <= 0) continue;
      compatible++;
      shortageReferences = references;
      const consumed = Math.min(row.amount, remaining * conversion.amount);
      if (consumed <= 0) continue;
      const before = row.amount;
      row.amount = roundQuantity(Math.max(0, before - consumed));
      remaining = Math.max(0, remaining - consumed / conversion.amount);
      line.estimated ||= conversion.estimated;
      line.allocations.push({ inventoryId: row.id, name: row.name, unit: row.unit, before, after: row.amount, consumed: roundQuantity(consumed), estimated: conversion.estimated, reason: conversion.reason });
      if (remaining <= 1e-9) break;
    }
    if (remaining > 1e-9) {
      line.status = candidates.length && !compatible ? 'blocked' : 'shortage';
      line.reason = line.status === 'blocked' ? 'واحد یا اندازهٔ ماده سازگار نیست؛ مقدار مصرف واقعی را در واحد انبار وارد کن.' : 'موجودی کافی ثبت نشده است؛ مقدار مصرف از انبار هرگز بیشتر از موجودی نمی‌شود.';
      const normalized = convertToBase(remaining, unit, selectedItem, shortageReferences);
      // Unknown conversions keep the original amount/unit and an unresolved flag.
      const value = line.status === 'blocked' ? remaining : normalized.value;
      const type = line.status === 'blocked' ? 'unknown' : normalized.type;
      const purchaseUnit = type === 'weight' ? (value >= 1000 ? 'کیلوگرم' : 'گرم') : type === 'volume' ? (value >= 1000 ? 'لیتر' : 'میلی‌لیتر') : unit;
      const purchaseAmount = (type === 'weight' || type === 'volume') && value >= 1000 ? value / 1000 : value;
      line.shortage = { item: alternatives.length > 1 ? getBaseIngredientName(selectedItem) : /\s+(?:یا|و)\s+|[,،/|]/.test(item) ? item : getBaseIngredientName(item), amount: roundQuantity(purchaseAmount), unit: purchaseUnit, category: getIngredientCategoryId(selectedItem) || getIngredientCategoryId(item) || 'other', estimated: Boolean(normalized.estimated), unresolved: line.status === 'blocked' || normalized.type === 'unknown' };
    }
  });
  return { lines, newInventory: stock };
};

/** All consumers use the same allocator, including repeated rows and multiple stock lots. */
export const getInventoryUpdate = (inventory: any[], ingredients: Ingredient[], servings: number, baseServings = 4) => {
  const evaluation = evaluateInventory(inventory, ingredients, servings, baseServings);
  return {
    ...evaluation,
    updatedCount: evaluation.lines.reduce((sum, line) => sum + line.allocations.length, 0),
    missingItems: evaluation.lines.flatMap(line => line.shortage ? [line.shortage] : []),
    unconvertibleItems: evaluation.lines.filter(line => line.status === 'blocked').map(line => ({ item: line.item, inventoryUnit: inventory.find(row => isInventoryIngredientMatch(row.name, line.item))?.unit || '', recipeUnit: line.recipeUnit })),
    estimatedConversions: evaluation.lines.filter(line => line.estimated).map(line => ({ item: line.item, amount: line.recipeAmount, unit: line.recipeUnit, grams: convertToBase(line.recipeAmount, line.recipeUnit, line.item).value })),
  };
};

export const getShoppingShortages = (inventory: any[], ingredients: Ingredient[], servings: number, baseServings = 4) => {
  const deficits = evaluateInventory(inventory, ingredients, servings, baseServings).lines.flatMap(line => line.shortage ? [line.shortage] : []);
  const combined: typeof deficits = [];
  for (const need of deficits) {
    const existing = combined.find(row => {
      if (!isInventoryIngredientMatch(row.item, need.item) || row.unresolved !== need.unresolved) return false;
      const conversion = convertIngredientQuantity(need.amount,need.unit,row.unit,need.item);
      return conversion && !conversion.estimated;
    });
    if (existing) {
      existing.amount = roundQuantity(existing.amount + convertIngredientQuantity(need.amount,need.unit,existing.unit,need.item)!.amount);
      existing.estimated ||= need.estimated;
    } else combined.push({ ...need });
  }
  return combined;
};

/** Published recipes may be bulk-converted only with exact physical equivalence. */
export const standardizeRecipeIngredients = (ingredients: Ingredient[], selections: Record<string,string>) => ingredients.map(ingredient => {
  const entry = Object.entries(selections).find(([name]) => isInventoryIngredientMatch(name,ingredient.item));
  if (!entry || normalizeUnit(entry[1]) === normalizeUnit(ingredient.unit)) return ingredient;
  if (normalizeUnit(ingredient.unit) === 'به میزان لازم' || parseQuantity(ingredient.amount) === 0) return ingredient;
  const conversion = convertIngredientQuantity(parseQuantity(ingredient.amount),ingredient.unit,entry[1],ingredient.item);
  if (!conversion || conversion.estimated) throw new Error(`تبدیل ${ingredient.item} از ${ingredient.unit} به ${entry[1]} قطعی نیست؛ واحد و مقدار رسپی حفظ شد. مرجع تقریبی را در واحد انبار تنظیم کن.`);
  return { ...ingredient, amount: conversion.amount, unit: entry[1] };
});

export interface UnitDiscrepancy {
  item: string;
  unitDishMap: Record<string, string[]>;
  allUnits: string[];
  allDishes: string[];
}

export const checkUnitConsistency = (dishes: Dish[]): UnitDiscrepancy[] => {
  const itemData: Record<string, { unitDishMap: Record<string, string[]>, allUnits: Set<string>, allDishes: Set<string> }> = {};

  dishes.forEach(dish => {
    dish.ingredients.forEach(ing => {
      const normalizedItem = normalizeItemName(ing.item);
      if (!itemData[normalizedItem]) {
        itemData[normalizedItem] = { unitDishMap: {}, allUnits: new Set(), allDishes: new Set() };
      }
      
      const unit = normalizeUnit(ing.unit);
      if (!itemData[normalizedItem].unitDishMap[unit]) {
        itemData[normalizedItem].unitDishMap[unit] = [];
      }
      if (!itemData[normalizedItem].unitDishMap[unit].includes(dish.name)) {
        itemData[normalizedItem].unitDishMap[unit].push(dish.name);
      }
      
      itemData[normalizedItem].allUnits.add(unit);
      itemData[normalizedItem].allDishes.add(dish.name);
    });
  });

  const discrepancies: UnitDiscrepancy[] = [];
  for (const [item, data] of Object.entries(itemData)) {
    if (data.allUnits.size > 1) {
      discrepancies.push({
        item,
        unitDishMap: data.unitDishMap,
        allUnits: Array.from(data.allUnits),
        allDishes: Array.from(data.allDishes)
      });
    }
  }

  return discrepancies;
};

export const getStandardUnit = (itemName: string, dishes: Dish[]): string => {
  const units: Record<string, number> = {};
  dishes.forEach(dish => {
    dish.ingredients.forEach(ing => {
      if (isInventoryIngredientMatch(itemName, ing.item)) {
        const u = normalizeUnit(ing.unit);
        units[u] = (units[u] || 0) + 1;
      }
    });
  });

  const sorted = Object.entries(units).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : 'عدد';
};

export const getCountryCode = (nationality: string | undefined): string | null => {
  if (!nationality) return null;
  const n = nationality.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(n)) return n === 'uk' ? 'gb' : n;
  const countries: Array<[string, string[]]> = [
    ['az', ['آذربایجان', 'azerbaijan', 'azerbaijani']], ['at', ['اتریش', 'austria', 'austrian']],
    ['jo', ['اردن', 'اردنی', 'jordan', 'jordanian']], ['uz', ['ازبکستان', 'uzbekistan', 'uzbek']],
    ['kz', ['قزاقستان', 'کازاخستان', 'kazakhstan', 'kazakh']], ['tj', ['تاجیکستان', 'tajikistan', 'tajik']],
    ['sg', ['سنگاپور', 'singapore', 'singaporean']], ['ps', ['فلسطین', 'فلسطینی', 'palestine', 'palestinian']],
    ['mn', ['مغولستان', 'mongolia', 'mongolian']],
    ['ir', ['ایران', 'ایرانی', 'iran', 'iranian', 'persia', 'persian']], ['sa', ['عربستان', 'saudi']], ['ye', ['یمن', 'yemen']],
    ['eg', ['مصر', 'egypt', 'egyptian']], ['lb', ['لبنان', 'لبنانی', 'lebanon', 'lebanese']], ['tr', ['ترکیه', 'ترکی', 'turkey', 'turkish']],
    ['af', ['افغانستان', 'afghanistan']], ['ma', ['مراکش', 'morocco', 'moroccan']], ['pe', ['پرو', 'peru']],
    ['br', ['برزیل', 'brazil', 'brazilian']], ['ar', ['آرژانتین', 'argentina']], ['mx', ['مکزیک', 'mexico', 'mexican']],
    ['id', ['اندونزی', 'indonesia']], ['th', ['تایلند', 'thailand', 'thai']], ['vn', ['ویتنام', 'vietnam', 'vietnamese']],
    ['in', ['هند', 'india', 'indian']], ['cn', ['چین', 'china', 'chinese']], ['jp', ['ژاپن', 'japan', 'japanese']],
    ['gb', ['بریتانیا', 'انگلستان', 'united kingdom', 'britain', 'british', 'england', 'uk']], ['hu', ['مجارستان', 'hungary', 'hungarian']],
    ['it', ['ایتالیا', 'italy', 'italian']], ['fr', ['فرانسه', 'france', 'french']], ['ru', ['روسیه', 'russia', 'russian']],
    ['gr', ['یونان', 'یونانی', 'greece', 'greek']], ['es', ['اسپانیا', 'spain', 'spanish']], ['us', ['آمریکا', 'امریکا', 'united states', 'usa', 'american']],
    ['kr', ['کره جنوبی', 'south korea', 'korea', 'korean']], ['de', ['آلمان', 'germany', 'german']], ['ca', ['کانادا', 'canada', 'canadian']],
    ['au', ['استرالیا', 'australia', 'australian']], ['pk', ['پاکستان', 'pakistan', 'pakistani']], ['iq', ['عراق', 'iraq', 'iraqi']],
    ['sy', ['سوریه', 'syria', 'syrian']], ['jp', ['ژاپنی', 'japanese']], ['nl', ['هلند', 'netherlands', 'dutch']],
    ['be', ['بلژیک', 'belgium', 'belgian']], ['ch', ['سوئیس', 'switzerland', 'swiss']], ['se', ['سوئد', 'sweden', 'swedish']],
    ['pl', ['لهستان', 'poland', 'polish']], ['pt', ['پرتغال', 'portugal', 'portuguese']], ['ua', ['اوکراین', 'ukraine', 'ukrainian']],
    ['ng', ['نیجریه', 'nigeria', 'nigerian']], ['za', ['آفریقای جنوبی', 'south africa']], ['ph', ['فیلیپین', 'philippines', 'filipino']],
    ['my', ['مالزی', 'malaysia', 'malaysian']], ['il', ['اسرائیل', 'israel']], ['co', ['کلمبیا', 'colombia', 'colombian']],
    ['cl', ['شیلی', 'chile', 'chilean']], ['cu', ['کوبا', 'cuba', 'cuban']], ['pl', ['لهستانی', 'polish']],
  ];
  return countries.find(([, aliases]) => aliases.some(alias => n === alias || n.includes(alias)))?.[0] || null;
};

/** Returns every country code represented by a combined cuisine nationality. */
export const getCountryCodes = (nationality: string | undefined): string[] => {
  if (!nationality?.trim()) return [];
  const parts = nationality.split(/\s*(?:\||\/|,|،)\s*/).filter(Boolean);
  const codes = parts.map(part => getCountryCode(part)).filter((code): code is string => Boolean(code));
  return [...new Set(codes)];
};
