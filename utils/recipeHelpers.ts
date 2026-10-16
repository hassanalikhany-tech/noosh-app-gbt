import { Dish, NatureType, UserProfile } from '../types';
import { getIngredientCategoryId, getBaseIngredientName } from '../data/pantry';

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
  const stock = normalizeItemName(getBaseIngredientName(stockName));
  const recipe = normalizeItemName(getBaseIngredientName(recipeName));
  if (!stock || !recipe) return false;
  if (stock === recipe) return true;

  // Preserve the intentional whole-chicken ↔ chicken-cut equivalence only.
  const chickenNames = ['مرغ', 'جوجه', 'سینهمرغ', 'رانمرغ', 'بالمرغ', 'کتفمرغ', 'گوشتسینهمرغ'].map(normalizeItemName);
  return chickenNames.includes(stock) && chickenNames.includes(recipe);
};

export type QuantityType = 'weight' | 'volume' | 'count' | 'unknown';
export interface BaseQuantity { value: number; type: QuantityType; baseUnit: string; form?: 'raw' | 'prepared' }
interface UnitDefinition { factor: number; type: QuantityType; baseUnit: string }

// Noosh standard: mass -> g, volume -> ml, counts stay in their own unit family.
// One app پیمانه = 250 ml; tablespoon = 15 ml; teaspoon = 5 ml.
export const UNIT_CONVERSIONS: Record<string, UnitDefinition> = {
  'گرم': { factor: 1, type: 'weight', baseUnit: 'g' }, 'میلی‌گرم': { factor: 0.001, type: 'weight', baseUnit: 'g' },
  'کیلوگرم': { factor: 1000, type: 'weight', baseUnit: 'g' }, 'اونس': { factor: 28.349523125, type: 'weight', baseUnit: 'g' },
  'پوند': { factor: 453.59237, type: 'weight', baseUnit: 'g' }, 'مثقال': { factor: 4.608, type: 'weight', baseUnit: 'g' }, 'سیر': { factor: 75, type: 'weight', baseUnit: 'g' },
  'میلی‌لیتر': { factor: 1, type: 'volume', baseUnit: 'ml' }, 'لیتر': { factor: 1000, type: 'volume', baseUnit: 'ml' },
  'پیمانه': { factor: 250, type: 'volume', baseUnit: 'ml' }, 'استکان': { factor: 100, type: 'volume', baseUnit: 'ml' }, 'لیوان': { factor: 250, type: 'volume', baseUnit: 'ml' },
  'قاشق غذاخوری': { factor: 15, type: 'volume', baseUnit: 'ml' }, 'قاشق چایخوری': { factor: 5, type: 'volume', baseUnit: 'ml' }, 'قاشق مرباخوری': { factor: 10, type: 'volume', baseUnit: 'ml' },
  'عدد': { factor: 1, type: 'count', baseUnit: 'count:piece' }, 'حلقه': { factor: 1, type: 'count', baseUnit: 'count:slice' },
  'بسته': { factor: 1, type: 'count', baseUnit: 'count:pack' }, 'قوطی': { factor: 1, type: 'count', baseUnit: 'count:can' }, 'حبه': { factor: 1, type: 'count', baseUnit: 'count:clove' },
  'قطعه': { factor: 1, type: 'count', baseUnit: 'count:piece' }, 'تکه': { factor: 1, type: 'count', baseUnit: 'count:piece' }, 'ورق': { factor: 1, type: 'count', baseUnit: 'count:sheet' }, 'شاخه': { factor: 1, type: 'count', baseUnit: 'count:sprig' }, 'دانه': { factor: 1, type: 'count', baseUnit: 'count:piece' },
};

const cleanUnitText = (unit: string): string => unit.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
const UNIT_ALIASES: Record<string, string> = {
  g: 'گرم', gram: 'گرم', grams: 'گرم', kg: 'کیلوگرم', kilo: 'کیلوگرم', kilogram: 'کیلوگرم', kilograms: 'کیلوگرم', mg: 'میلی‌گرم',
  oz: 'اونس', ounce: 'اونس', ounces: 'اونس', lb: 'پوند', lbs: 'پوند', pound: 'پوند', pounds: 'پوند',
  ml: 'میلی‌لیتر', milliliter: 'میلی‌لیتر', milliliters: 'میلی‌لیتر', millilitre: 'میلی‌لیتر', l: 'لیتر', liter: 'لیتر', liters: 'لیتر', litre: 'لیتر', litres: 'لیتر',
  cup: 'پیمانه', cups: 'پیمانه', tbsp: 'قاشق غذاخوری', tablespoon: 'قاشق غذاخوری', tablespoons: 'قاشق غذاخوری', tsp: 'قاشق چایخوری', teaspoon: 'قاشق چایخوری', teaspoons: 'قاشق چایخوری',
  piece: 'عدد', pieces: 'عدد', number: 'عدد', each: 'عدد', clove: 'حبه', cloves: 'حبه', pack: 'بسته', package: 'بسته', can: 'قوطی',
};

export const normalizeUnit = (unit: string): string => {
  const u = cleanUnitText(unit);
  if (!u) return 'نامشخص';
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u];
  if (u.includes('به میزان لازم') || u.includes('به مقدار لازم') || u.includes('دلخواه')) return 'به میزان لازم';
  if (u === 'کیلو') return 'کیلوگرم';
  if (/^(کیلوگرم|گرم|میلی‌گرم|اونس|پوند|مثقال|سیر)$/.test(u)) return u;
  if (/^(میلی‌لیتر|میلیلیتر|سی‌سی|cc)$/.test(u)) return 'میلی‌لیتر';
  if (u === 'لیتر') return u;
  if (u.includes('قاشق چایخوری') || u.includes('قاشق مرباخوری کوچک')) return 'قاشق چایخوری';
  if (u.includes('قاشق مرباخوری')) return 'قاشق مرباخوری';
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
  return ['گرم', 'میلی‌گرم', 'کیلوگرم', 'اونس', 'پوند', 'مثقال', 'سیر', 'میلی‌لیتر', 'لیتر', 'پیمانه', 'استکان', 'لیوان', 'قاشق غذاخوری', 'قاشق چایخوری', 'قاشق مرباخوری'].includes(normalized)
    ? normalized
    : unit;
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
const getIngredientDensity = (itemName?: string): number | undefined => {
  if (!itemName) return undefined;
  // Mixed/alternative ingredients have no single defensible bulk density.
  if (/\s+(?:یا|و)\s+|[,،/|]/.test(itemName)) return undefined;
  const item = normalizeItemName(itemName);
  const canonicalItem = normalizeItemName(getBaseIngredientName(itemName));
  const cooked = /پخته|پخت|آبپز|آبکش|پز/.test(item);
  const match = VOLUME_MASS_REFERENCES.find(entry => entry.aliases.some(alias => canonicalItem === normalizeItemName(getBaseIngredientName(alias))) &&
    (!entry.state || (entry.state === 'cooked' ? cooked : !cooked))) ||
    VOLUME_MASS_REFERENCES.find(entry => !entry.state && entry.aliases.some(alias => canonicalItem === normalizeItemName(getBaseIngredientName(alias))));
  return match ? match.gramsPerUsCup / US_CUP_ML : undefined;
};

const getIngredientForm = (itemName?: string): BaseQuantity['form'] => {
  if (!itemName) return undefined;
  const item = normalizeItemName(itemName);
  if (/پخته|آبپز|آبکش|سرخ|کباب|بخارپز|تنوری/.test(item)) return 'prepared';
  if (/خام|خشک/.test(item)) return 'raw';
  return undefined;
};

export const convertToBase = (amount: number, unit: string, itemName?: string): BaseQuantity => {
  const normalizedUnit = normalizeUnit(unit);
  const definition = UNIT_CONVERSIONS[normalizedUnit];
  const form = getIngredientForm(itemName);
  if (!definition) return { value: amount, type: 'unknown', baseUnit: normalizedUnit, form };
  const baseValue = amount * definition.factor;
  if (definition.type === 'volume') {
    const density = getIngredientDensity(itemName);
    if (density !== undefined) return { value: baseValue * density, type: 'weight', baseUnit: 'g', form };
  }
  return { value: baseValue, type: definition.type, baseUnit: definition.baseUnit, form };
};

export const areUnitsComparable = (left: BaseQuantity, right: BaseQuantity): boolean =>
  left.type === right.type && left.baseUnit === right.baseUnit && left.type !== 'unknown' &&
  (!left.form && !right.form || left.form === right.form);

const EXCLUDED_INVENTORY_ITEMS = ['آب', 'آب جوش', 'آب ولرم', 'آب سرد', 'آب گرم', 'نمک', 'فلفل', 'زردچوبه', 'روغن', 'ادویه'];

const asPurchaseQuantity = (value: number, type: QuantityType, fallbackUnit: string) => {
  let amount = value;
  let unit = fallbackUnit;
  if (type === 'weight') {
    unit = value >= 1000 ? 'کیلوگرم' : 'گرم';
    amount = value >= 1000 ? value / 1000 : value;
  } else if (type === 'volume') {
    unit = value >= 1000 ? 'لیتر' : 'میلی‌لیتر';
    amount = value >= 1000 ? value / 1000 : value;
  }
  return { amount: Math.round(amount * 1000) / 1000, unit };
};

export const getInventoryUpdate = (
  inventory: any[],
  ingredients: any[],
  servings: number,
  baseServings: number = 4
) => {
  const scale = servings / baseServings;
  const newInventory = inventory.map(item => ({ ...item }));
  let updatedCount = 0;
  const missingItems: any[] = [];
  const unconvertibleItems: Array<{ item: string; inventoryUnit: string; recipeUnit: string }> = [];

  ingredients.forEach(ing => {
    const requiredAmount = (ing.amount || 0) * scale;
    if (requiredAmount <= 0) return;
    const categoryId = getIngredientCategoryId(ing.item);
    const allowedCategories = ['proteins', 'grains', 'vegetables'];
    const isExcluded = EXCLUDED_INVENTORY_ITEMS.some(ex => isIngredientMatch(ex, ing.item));
    if (!categoryId || !allowedCategories.includes(categoryId) || isExcluded) return;

    const itemName = getBaseIngredientName(ing.item);
    const ingredientUnit = ing.unit?.trim() || 'نامشخص';
    if (normalizeUnit(ingredientUnit) === 'به میزان لازم') return;
    const need = convertToBase(requiredAmount, ingredientUnit, ing.item);
    const matchingRows = newInventory.filter(row => isInventoryIngredientMatch(row.name, ing.item) && Number(row.amount) > 0);
    let remaining = need.value;
    let comparableRows = 0;

    if (need.type !== 'unknown') {
      // Consume compatible stock rows in order; never let an unrelated count
      // unit (e.g. packs vs pieces) or unknown density consume pantry stock.
      for (const row of matchingRows) {
        const stock = convertToBase(Number(row.amount), row.unit || '', row.name);
        if (!areUnitsComparable(stock, need) || stock.value <= 0) continue;
        comparableRows++;
        const consumedBase = Math.min(remaining, stock.value);
        const amountPerStoredUnit = stock.value / Number(row.amount);
        row.amount = Math.max(0, Number(row.amount) - consumedBase / amountPerStoredUnit);
        row.lastUpdated = Date.now();
        remaining -= consumedBase;
        updatedCount++;
        if (remaining <= 1e-8) break;
      }
    } else {
      const sameUnitRows = normalizeUnit(ingredientUnit) === 'نامشخص' ? [] : matchingRows.filter(row => normalizeUnit(row.unit || '') === normalizeUnit(ingredientUnit));
      if (sameUnitRows.length) {
        comparableRows = sameUnitRows.length;
        let left = requiredAmount;
        for (const row of sameUnitRows) {
          const consumed = Math.min(left, Number(row.amount) || 0);
          row.amount = Math.max(0, Number(row.amount) - consumed);
          row.lastUpdated = Date.now();
          left -= consumed;
          updatedCount++;
          if (left <= 1e-8) break;
        }
        remaining = left;
      }
    }

    if (!matchingRows.length) {
      const display = asPurchaseQuantity(need.value, need.type, ingredientUnit);
      newInventory.push({
        id: `inv-${Date.now()}-${Math.random()}`,
        name: itemName,
        amount: 0,
        unit: display.unit,
        minThreshold: 0.5,
        lastUpdated: Date.now()
      });
      updatedCount++;
    } else if (!comparableRows) {
      const incompatible = matchingRows[0];
      unconvertibleItems.push({ item: itemName, inventoryUnit: incompatible.unit || '', recipeUnit: ingredientUnit });
    }

    if (remaining > 1e-8) {
      const display = need.type === 'unknown'
        ? { amount: Math.round(remaining * 1000) / 1000, unit: ingredientUnit }
        : asPurchaseQuantity(remaining, need.type, ingredientUnit);
      missingItems.push({ item: itemName, amount: display.amount, unit: display.unit, category: categoryId });
    }
  });

  return { newInventory, updatedCount, missingItems, unconvertibleItems };
};

/** Calculate shopping deficits for a plan without consuming or changing pantry stock. */
export const getShoppingShortages = (
  inventory: any[],
  ingredients: any[],
  servings: number,
  baseServings: number = 4
) => {
  const needs: Array<{ item: string; amount: number; unit: string; type: QuantityType; baseUnit: string; form?: BaseQuantity['form']; category: string }> = [];
  const scale = servings / baseServings;

  ingredients.forEach(ingredient => {
    const amount = (Number(ingredient.amount) || 0) * scale;
    if (amount <= 0 || normalizeUnit(ingredient.unit || '') === 'به میزان لازم' || EXCLUDED_INVENTORY_ITEMS.some(excluded => isIngredientMatch(excluded, ingredient.item))) return;

    const item = getBaseIngredientName(ingredient.item);
    const unit = ingredient.unit?.trim() || 'نامشخص';
    const converted = convertToBase(amount, unit, ingredient.item);
    const matchingNeed = needs.find(need =>
      isInventoryIngredientMatch(need.item, item) && need.type === converted.type && need.baseUnit === converted.baseUnit && need.form === converted.form &&
      (converted.type !== 'unknown' || normalizeUnit(need.unit) === normalizeUnit(unit))
    );

    if (matchingNeed) matchingNeed.amount += converted.value;
    else needs.push({ item, amount: converted.value, unit, type: converted.type, baseUnit: converted.baseUnit, form: converted.form, category: getIngredientCategoryId(item) || 'other' });
  });

  return needs.flatMap(need => {
    const available = inventory.reduce((sum, stock) => {
      if (!stock || stock.amount <= 0 || !isInventoryIngredientMatch(stock.name, need.item)) return sum;
      const converted = convertToBase(stock.amount, stock.unit || '', stock.name);
      if (areUnitsComparable(converted, { value: need.amount, type: need.type, baseUnit: need.baseUnit, form: need.form })) return sum + converted.value;
      if (need.type === 'unknown' && converted.type === 'unknown' && normalizeUnit(stock.unit || '') === normalizeUnit(need.unit)) return sum + converted.value;
      return sum;
    }, 0);

    const deficit = Math.max(0, need.amount - available);
    if (deficit <= 0) return [];
    let amount = deficit;
    let unit = need.unit;
    if (need.type === 'weight') {
      unit = deficit >= 1000 ? 'کیلوگرم' : 'گرم';
      amount = deficit >= 1000 ? deficit / 1000 : deficit;
    } else if (need.type === 'volume') {
      unit = deficit >= 1000 ? 'لیتر' : 'میلی‌لیتر';
      amount = deficit >= 1000 ? deficit / 1000 : deficit;
    } else if (need.type === 'count') {
      unit = need.unit;
    }
    return [{ item: need.item, amount: Math.round(amount * 1000) / 1000, unit, category: need.category }];
  });
};

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
