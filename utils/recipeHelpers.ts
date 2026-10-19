import { Dish, NatureType, UserProfile, Ingredient, InventoryItem } from '../types';
import { getIngredientCategoryId, getBaseIngredientName } from '../data/pantry';
import PANTRY_UNIT_PREFERENCES from '../data/pantry_unit_preferences.json';

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
  // Imported recipe labels occasionally contain multiple foods in one field.
  // Never let a partial pantry-name match consume stock for a compound item.
  if (/\s+(?:یا|و)\s+|[,،/|]/.test(stockName) || /\s+(?:یا|و)\s+|[,،/|]/.test(recipeName)) return false;
  const stock = getIngredientIdentity(stockName);
  const recipe = getIngredientIdentity(recipeName);
  if (!stock || !recipe) return false;
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
const VOLUME_MASS_REFERENCES: Array<{ aliases: string[]; gramsPerUsCup: number; state?: 'raw' | 'cooked' }> = [
  // FoodData Central/USDA household portions; specific forms stay separate.
  { aliases: ['آرد نخودچی', 'آرد نخود'], gramsPerUsCup: 92 },
  { aliases: ['برنج'], gramsPerUsCup: 185, state: 'raw' }, { aliases: ['برنج'], gramsPerUsCup: 158, state: 'cooked' },
  { aliases: ['عدس'], gramsPerUsCup: 192, state: 'raw' }, { aliases: ['عدس'], gramsPerUsCup: 198, state: 'cooked' },
  { aliases: ['لوبیا قرمز'], gramsPerUsCup: 184, state: 'raw' }, { aliases: ['لوبیا سفید'], gramsPerUsCup: 202, state: 'raw' },
  { aliases: ['لوبیا چیتی'], gramsPerUsCup: 193, state: 'raw' },
  { aliases: ['نخود'], gramsPerUsCup: 200, state: 'raw' }, { aliases: ['نخود'], gramsPerUsCup: 164, state: 'cooked' },
  { aliases: ['شیر'], gramsPerUsCup: 244 }, { aliases: ['روغن زیتون'], gramsPerUsCup: 216 },
  { aliases: ['گردو'], gramsPerUsCup: 117 },
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
  { aliases: ['پیاز', 'پیاز قرمز', 'پیاز سفید'], gramsPerPiece: 110, unit: 'عدد' },
  { aliases: ['سیب زمینی'], gramsPerPiece: 213, unit: 'عدد' },
  { aliases: ['گوجه فرنگی'], gramsPerPiece: 123, unit: 'عدد' },
  { aliases: ['فلفل دلمه ای'], gramsPerPiece: 119, unit: 'عدد' },
  { aliases: ['هویج'], gramsPerPiece: 61, unit: 'عدد' },
  { aliases: ['سیر'], gramsPerPiece: 3, unit: 'حبه' },
  { aliases: ['مرغ', 'مرغ کامل', 'مرغ درسته', 'مرغ پاک شده'], gramsPerPiece: 2000, unit: 'عدد' },
  { aliases: ['اردک', 'اردک متوسط'], gramsPerPiece: 2000, unit: 'عدد' },
  { aliases: ['تخم مرغ', 'تخم مرغ درشت'], gramsPerPiece: 55, unit: 'عدد' },
  { aliases: ['بادمجان'], gramsPerPiece: 250, unit: 'عدد' },
  { aliases: ['خیار'], gramsPerPiece: 180, unit: 'عدد' },
  { aliases: ['فلفل سبز', 'فلفل تند'], gramsPerPiece: 25, unit: 'عدد' },
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
];

const getPieceMassReference = (itemName: string | undefined, unit: string) => {
  if (!itemName) return undefined;
  const normalizedUnit = normalizeUnit(unit);
  if (normalizedUnit !== 'عدد' && normalizedUnit !== 'حبه' && normalizedUnit !== 'دانه' && normalizedUnit !== 'قطعه' && normalizedUnit !== 'تکه' && normalizedUnit !== 'شاخه' && normalizedUnit !== 'ورق') return undefined;
  // The actual amount field is authoritative. Imported labels sometimes repeat
  // it ("پیاز ۲ عدد"); strip only a leading/trailing count, never a number in
  // the middle of a compound ingredient.
  if (/\s+(?:یا|و)\s+|[,،/|]/.test(itemName)) return undefined;
  const label = itemName
    .replace(/^\s*[0-9۰-۹٠-٩]+\s*(?:عدد|دونه|دانه|حبه|قطعه)?\s*/,'')
    .replace(/\s*[0-9۰-۹٠-٩]+(?:[.,٫][0-9۰-۹٠-٩]+)?\s*(?:عدد|دونه|دانه|حبه|قطعه)?\s*$/,'');
  if (/[0-9۰-۹٠-٩]/.test(label)) return undefined;
  const normalized = normalizeItemName(label);
  const explicitSize = /بزرگ|درشت|کوچک|ریز/.test(normalized);
  const withoutDescriptors = normalized
    .replace(/متوسط|بزرگ|درشت|کوچک|ریز/g, '')
    .replace(/تازه|خام|خردشده|نگینی|حلقهشده|رندهشده|رنده|خلالیشده|خلالی|پوستگرفته|پوستکنده/g, '');
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
  return reference.gramsPerPiece;
};

const getAverageCountGrams = (label: string, unit: string): number | undefined => {
  const normalized = normalizeItemName(label);
  const normalizedUnit = normalizeUnit(unit);
  if (normalizedUnit === 'بسته') return 250;
  if (normalizedUnit === 'قوطی') return 180;
  if (normalizedUnit === 'ورق') return /خمیر|یوفکا|لازانیا|نوری|جلبک/.test(normalized) ? 20 : 15;
  if (normalizedUnit === 'شاخه') return /کرفس|تره فرنگی/.test(normalized) ? 40 : 10;
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
  if (/\s+(?:یا|و)\s+|[,،/|]/.test(itemName)) return undefined;
  const item = normalizeItemName(itemName);
  const canonicalItem = getIngredientIdentity(itemName);
  const cooked = /پخته|پخت|آبپز|آبکش|پز/.test(item);
  const match = VOLUME_MASS_REFERENCES.find(entry => entry.aliases.some(alias => canonicalItem === getIngredientIdentity(alias)) &&
    (!entry.state || (entry.state === 'cooked' ? cooked : !cooked))) ||
    VOLUME_MASS_REFERENCES.find(entry => !entry.state && entry.aliases.some(alias => canonicalItem === getIngredientIdentity(alias)));
  if (match) return match.gramsPerUsCup / US_CUP_ML;
  const category = getIngredientCategoryId(itemName);
  const fallback = category ? VOLUME_CATEGORY_GRAMS_PER_APP_CUP[category] : undefined;
  return fallback ? fallback / 250 : undefined;
};

const getIngredientForm = (itemName?: string): BaseQuantity['form'] => {
  if (!itemName) return undefined;
  const item = normalizeItemName(itemName);
  if (/پخته|آبپز|آبکش|سرخ|کباب|بخارپز|تنوری|کاراملی/.test(item)) return 'prepared';
  return 'raw';
};

/** A reference is ingredient/form specific; generic portions never become whole birds. */
export const getWeightPerUnit = (unit: string, label: string, references?: ReferenceOverrides): number | undefined => {
  const normalized = normalizeUnit(unit);
  const definition = UNIT_CONVERSIONS[normalized];
  if (definition?.type === 'weight') return definition.factor;
  if (!definition || /\s+(?:یا|و)\s+|[,،/|]/.test(label)) return undefined;
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
  if (/\s+(?:یا|و)\s+|[,،/|]/.test(name)) return normalizeItemName(name);
  let label = name.replace(/[\u200B-\u200D]/g, ' ').trim()
    .replace(/^\s*[0-9۰-۹٠-٩]+\s*(?:عدد|دانه|حبه)?\s*/, '')
    .replace(/\s*[0-9۰-۹٠-٩]+(?:[.,٫][0-9۰-۹٠-٩]+)?\s*(?:عدد|دانه|حبه)?\s*$/, '');
  const descriptors = /(?:^|\s)(?:کوچک|متوسط|بزرگ|درشت|ریز|تازه|خام|خشک|پخته|آبپز|آبکش|پوست گرفته|پوست کنده|خرد شده|خردشده|رنده شده|رندهشده|رنده|نگینی|خلالی|حلقه شده)(?=\s|$)/g;
  // Keep dried/powdered/broth identities: these are different foods, not measurements.
  label = label.replace(descriptors, match => /خشک/.test(match) ? match : ' ').replace(/(?:سرخ|کباب|آبپز|آبکش|پخته)\s*شده/g, ' ').replace(/\s+/g, ' ').trim();
  const aliases: Record<string,string> = { 'گوجه': 'گوجه فرنگی', 'سینه مرغ': 'مرغ', 'گوشت سینه مرغ': 'مرغ', 'ران مرغ': 'مرغ', 'بال مرغ': 'مرغ', 'کتف مرغ': 'مرغ', 'گردن مرغ': 'مرغ', 'مرغ کامل': 'مرغ', 'مرغ درسته': 'مرغ', 'مرغ پاک شده': 'مرغ', 'جوجه': 'مرغ', 'برنج ایرانی': 'برنج', 'برنج باسماتی': 'برنج', 'برنج دانه بلند': 'برنج', 'عدس خشک': 'عدس', 'نخود خشک': 'نخود', 'لوبیا قرمز خشک': 'لوبیا قرمز', 'لوبیا چیتی خشک': 'لوبیا چیتی', 'لوبیا سفید خشک': 'لوبیا سفید' };
  return normalizeItemName(aliases[label] || label);
};
export const getPhysicalForm = getIngredientForm;
export const getIngredientMeasurementName = (ingredient: Ingredient) => {
  if (!ingredient.ingredientId && !ingredient.state) return ingredient.item;
  const size = /بزرگ|درشت/.test(ingredient.item + ingredient.unit) ? 'بزرگ' : /کوچک|ریز/.test(ingredient.item + ingredient.unit) ? 'کوچک' : /متوسط/.test(ingredient.item + ingredient.unit) ? 'متوسط' : '';
  return `${ingredient.ingredientId || getIngredientIdentity(ingredient.item)} ${size} ${(ingredient.state || getIngredientForm(ingredient.item)) === 'prepared' ? 'پخته' : ''}`.trim();
};
export type ReferenceOverrides = Record<string, Record<string, number>>;
export interface QuantityConversion { amount: number; estimated: boolean; reason: string }

const rawYieldFromPrepared = (itemName: string) => {
  const item = getIngredientIdentity(itemName);
  if (/برنج|عدس|لوبیا|نخود|لپه|ماش|پاستا|ماکارونی|بلغور/.test(item)) return 0.35;
  if (/مرغ|گوشت|ماهی|میگو/.test(item)) return 0.75;
  if (getIngredientCategoryId(itemName) === 'vegetables') return 0.9;
  return 1;
};

/** Direct dimensional conversions take precedence; preparation changes use an average yield when needed. */
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
    let stateRatio = 1;
    const sourceForm = getIngredientForm(itemName), targetForm = getIngredientForm(stockName);
    if (from.type === 'weight' && sourceForm && targetForm && sourceForm !== targetForm) stateRatio = sourceForm === 'prepared' ? rawYieldFromPrepared(itemName) : 1 / rawYieldFromPrepared(stockName);
    return { amount: roundQuantity(amount * from.factor / to.factor * stateRatio), estimated: stateRatio !== 1, reason: stateRatio === 1 ? 'تبدیل مستقیم در یک خانوادهٔ واحد' : `معادل خام/پخته با بازده میانگین ${roundQuantity(stateRatio,3)} (تخمینی)` };
  }
  const sourceMass = getWeightPerUnit(fromUnit, itemName, references);
  const targetMass = getWeightPerUnit(toUnit, stockName, references);
  if (sourceMass === undefined || targetMass === undefined || targetMass <= 0) return null;
  const sourceForm = getIngredientForm(itemName), targetForm = getIngredientForm(stockName);
  const stateRatio = sourceForm && targetForm && sourceForm !== targetForm
    ? sourceForm === 'prepared' ? rawYieldFromPrepared(itemName) : 1 / rawYieldFromPrepared(stockName)
    : 1;
  const adjustedSourceMass = sourceMass * stateRatio;
  return { amount: roundQuantity(amount * adjustedSourceMass / targetMass), estimated: true, reason: `هر ۱ ${fromUnit} ${itemName} ≈ ${roundQuantity(adjustedSourceMass,6)} گرم؛ هر ۱ ${toUnit} موجودی ≈ ${roundQuantity(targetMass,6)} گرم (میانگین تقریبی)` };
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
    if (WATER_ITEMS.has(normalizeItemName(item))) return;
    const parsed = parseQuantity(ingredient.amount);
    const required = parsed * servings / baseServings;
    const unit = ingredient.unit || '';
    const measurementName = getIngredientMeasurementName(ingredient);
    const line: InventoryEvaluationLine = { index, item, recipeAmount: required, recipeUnit: unit, status: 'ready', reason: '', estimated: false, allocations: [] };
    lines.push(line);
    if (!item.trim() || !Number.isFinite(required) || required <= 0 || normalizeUnit(unit) === 'به میزان لازم') {
      line.status = 'unmeasured'; line.reason = 'مقدار مصرف مشخص نیست؛ بدون ورود مصرف واقعی از انبار کم نمی‌شود.';
      if (item.trim() && !inventory.some(row => row.amount > 0 && isInventoryIngredientMatch(row.name,item))) line.shortage = { item, amount: 0, unit, category: getIngredientCategoryId(item) || 'other', unresolved: true };
      return;
    }
    const candidates = stock.filter(row => (ingredient.ingredientId && row.ingredientId ? ingredient.ingredientId === row.ingredientId : isInventoryIngredientMatch(row.name, item)) && Number.isFinite(row.amount) && row.amount > 0);
    let remaining = required;
    let compatible = 0;
    let shortageReferences: ReferenceOverrides | undefined;
    for (const row of candidates) {
      const references = row.unitWeightGrams ? { ...((PANTRY_UNIT_PREFERENCES as { weightEquivalences?: ReferenceOverrides }).weightEquivalences || {}), [getIngredientIdentity(measurementName)]: { ...((PANTRY_UNIT_PREFERENCES as { weightEquivalences?: ReferenceOverrides }).weightEquivalences || {})[getIngredientIdentity(measurementName)], ...row.unitWeightGrams } } : undefined;
      const conversion = convertIngredientQuantity(1, unit, row.unit, measurementName, getIngredientMeasurementName({ item: row.name, amount: row.amount, unit: row.unit, state: row.state, ingredientId: row.ingredientId }), references);
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
      line.reason = line.status === 'blocked' ? 'واحد، اندازه یا حالت ماده سازگار نیست؛ مقدار مصرف واقعی را در واحد انبار وارد کن.' : 'موجودی کافی ثبت نشده است؛ مقدار مصرف از انبار هرگز بیشتر از موجودی نمی‌شود.';
      const normalized = convertToBase(remaining, unit, measurementName, shortageReferences);
      // Unknown conversions keep the original amount/unit and an unresolved flag.
      const value = line.status === 'blocked' ? remaining : normalized.value;
      const type = line.status === 'blocked' ? 'unknown' : normalized.type;
      const purchaseUnit = type === 'weight' ? (value >= 1000 ? 'کیلوگرم' : 'گرم') : type === 'volume' ? (value >= 1000 ? 'لیتر' : 'میلی‌لیتر') : unit;
      const purchaseAmount = (type === 'weight' || type === 'volume') && value >= 1000 ? value / 1000 : value;
      line.shortage = { item: /\s+(?:یا|و)\s+|[,،/|]/.test(item) ? item : getBaseIngredientName(item), amount: roundQuantity(purchaseAmount), unit: purchaseUnit, category: getIngredientCategoryId(item) || 'other', estimated: Boolean(normalized.estimated), unresolved: line.status === 'blocked' || normalized.type === 'unknown' };
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
