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

// Standard conversion factors to base units (grams for weight, ml for volume, pieces for count)
export const UNIT_CONVERSIONS: Record<string, { factor: number, type: 'weight' | 'volume' | 'count' }> = {
  'گرم': { factor: 1, type: 'weight' },
  'g': { factor: 1, type: 'weight' },
  'کیلوگرم': { factor: 1000, type: 'weight' },
  'kg': { factor: 1000, type: 'weight' },
  'مثقال': { factor: 4.6, type: 'weight' },
  'سیر': { factor: 75, type: 'weight' },
  'پیمانه': { factor: 100, type: 'weight' }, // As per user request: 1 cup = 100g
  'استکان': { factor: 100, type: 'weight' },
  'قاشق غذاخوری': { factor: 15, type: 'weight' },
  'قاشق چایخوری': { factor: 5, type: 'weight' },
  'لیتر': { factor: 1000, type: 'volume' },
  'l': { factor: 1000, type: 'volume' },
  'میلی‌لیتر': { factor: 1, type: 'volume' },
  'ml': { factor: 1, type: 'volume' },
  'عدد': { factor: 1, type: 'count' },
  'دانه': { factor: 1, type: 'count' },
  'حلقه': { factor: 1, type: 'count' },
  'بسته': { factor: 1, type: 'count' },
  'حبه': { factor: 1, type: 'count' },
};

export const normalizeUnit = (unit: string): string => {
  if (!unit) return 'عدد';
  
  // Normalize Persian/Arabic characters
  let u = unit.trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces
    
  if (u.includes('کیلوگرم') || u === 'kg') return 'کیلوگرم';
  if (u.includes('گرم') || u === 'g') return 'گرم';
  
  // Standardize all variations of "count" to "عدد"
  // Including common Persian variations and specific ones mentioned by user
  const countVariations = [
    'عدد', 'piece', 'number', 'دانه', 'حلقه', 'واحد', 
    'درشت', 'بزرگ', 'متوسط', 'کوچک', 'سایز', 'دونه'
  ];
  
  if (countVariations.some(v => u.includes(v))) return 'عدد';

  if (u.includes('حبه')) return 'حبه';

  if (u === 'لیتر' || u === 'l' || u === 'میلی‌لیتر' || u === 'ml') return 'لیتر';
  if (u === 'پیمانه' || u === 'استکان') return 'پیمانه';
  if (u.includes('قاشق')) return 'قاشق';
  if (u.includes('لازم') || u.includes('دلخواه')) return 'به میزان لازم';
  return u;
};

export const convertToBase = (amount: number, unit: string, itemName?: string): { value: number, type: 'weight' | 'volume' | 'count' | 'unknown' } => {
  const u = unit.trim();
  
  // Special case for Onion (پیاز) as per user request: 1 count = 100g
  // This allows comparing "count" with "weight" for onions
  if (itemName && isIngredientMatch('پیاز', itemName) && (u === 'عدد' || u === 'دانه')) {
    return { value: amount * 100, type: 'weight' };
  }

  // Special case for Garlic (سیر) as per user request: 1 clove = 10g
  if (itemName && isIngredientMatch('سیر', itemName) && u.includes('حبه')) {
    return { value: amount * 10, type: 'weight' };
  }

  // Special case for Olive Oil as per user request: 1 spoon = 50g
  if (itemName && isIngredientMatch('روغن زیتون', itemName) && normalizeUnit(u) === 'قاشق') {
    return { value: amount * 50, type: 'weight' };
  }

  // Special case for Saffron (زعفران دم کرده) as per user request: 1 "to taste" = 0.25g
  if (itemName && isIngredientMatch('زعفران دم کرده', itemName) && normalizeUnit(u) === 'به میزان لازم') {
    return { value: 0.25, type: 'weight' };
  }

  // Special case for Chicken Breast (سینه مرغ) as per user request: 1 count = 250g
  if (itemName && isIngredientMatch('سینه مرغ', itemName) && normalizeUnit(u) === 'عدد') {
    return { value: amount * 250, type: 'weight' };
  }

  // Special case for Carrot (هویج) as per user request: 1 count = 100g
  if (itemName && isIngredientMatch('هویج', itemName) && normalizeUnit(u) === 'عدد') {
    return { value: amount * 100, type: 'weight' };
  }

  const conv = UNIT_CONVERSIONS[u] || Object.entries(UNIT_CONVERSIONS).find(([k]) => u.includes(k))?.[1];
  
  if (conv) {
    return { value: amount * conv.factor, type: conv.type };
  }
  
  return { value: amount, type: 'unknown' };
};

const EXCLUDED_INVENTORY_ITEMS = ['آب', 'آب جوش', 'آب ولرم', 'آب سرد', 'آب گرم', 'نمک', 'فلفل', 'زردچوبه', 'روغن', 'ادویه'];

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

  ingredients.forEach(ing => {
    const requiredAmount = (ing.amount || 0) * scale;
    if (requiredAmount <= 0) return;

    // Strictly allow only 3 categories: proteins, grains, vegetables
    const categoryId = getIngredientCategoryId(ing.item);
    const allowedCategories = ['proteins', 'grains', 'vegetables'];
    const isAllowedCategory = categoryId && allowedCategories.includes(categoryId);
    
    // Exclude specific items like water and additives
    const isExcluded = EXCLUDED_INVENTORY_ITEMS.some(ex => isIngredientMatch(ex, ing.item));
    
    if (!isAllowedCategory || isExcluded) return;

    const invIdx = newInventory.findIndex(item => isIngredientMatch(item.name, ing.item));
    
    const ingredientUnit = ing.unit || 'عدد';
    if (invIdx !== -1) {
      const invItem = newInventory[invIdx];
      const invBase = convertToBase(invItem.amount, invItem.unit || '', invItem.name);
      const ingBase = convertToBase(requiredAmount, ingredientUnit, ing.item);
      const comparable = invBase.type === ingBase.type && invBase.type !== 'unknown';
      const sameUnit = normalizeUnit(invItem.unit || '') === normalizeUnit(ingredientUnit);
      let shortage = 0;

      if (comparable) {
        const availableBase = Math.max(0, invBase.value);
        const remainingBase = availableBase - ingBase.value;
        shortage = ingBase.value > 0 ? requiredAmount * Math.max(0, ingBase.value - availableBase) / ingBase.value : 0;
        invItem.amount = invBase.value > 0 ? Math.max(0, invItem.amount) * Math.max(0, remainingBase) / invBase.value : 0;
        invItem.lastUpdated = Date.now();
        updatedCount++;
      } else if (sameUnit) {
        const available = Math.max(0, Number(invItem.amount) || 0);
        shortage = Math.max(0, requiredAmount - available);
        invItem.amount = Math.max(0, available - requiredAmount);
        invItem.lastUpdated = Date.now();
        updatedCount++;
      } else {
        shortage = requiredAmount;
      }

      if (shortage > 0 && !isExcluded) missingItems.push({ item: getBaseIngredientName(ing.item), amount: Math.round(shortage * 1000) / 1000, unit: ingredientUnit, category: categoryId });
    } else if (!isExcluded) {
      // Record zero stock instead of a negative quantity, while still exposing the full purchase deficit.
      newInventory.push({
        id: `inv-${Date.now()}-${Math.random()}`,
        name: getBaseIngredientName(ing.item),
        amount: 0,
        unit: ingredientUnit,
        minThreshold: 0.5,
        lastUpdated: Date.now()
      });
      missingItems.push({ item: getBaseIngredientName(ing.item), amount: requiredAmount, unit: ingredientUnit, category: categoryId });
      updatedCount++;
    }
  });

  return { newInventory, updatedCount, missingItems };
};

/** Calculate shopping deficits for a plan without consuming or changing pantry stock. */
export const getShoppingShortages = (
  inventory: any[],
  ingredients: any[],
  servings: number,
  baseServings: number = 4
) => {
  const needs: Array<{ item: string; amount: number; unit: string; type: 'weight' | 'volume' | 'count' | 'unknown'; category: string }> = [];
  const scale = servings / baseServings;

  ingredients.forEach(ingredient => {
    const amount = (Number(ingredient.amount) || 0) * scale;
    if (amount <= 0 || EXCLUDED_INVENTORY_ITEMS.some(excluded => isIngredientMatch(excluded, ingredient.item))) return;

    const item = getBaseIngredientName(ingredient.item);
    const unit = ingredient.unit || 'عدد';
    const converted = convertToBase(amount, unit, item);
    const matchingNeed = needs.find(need =>
      isIngredientMatch(need.item, item) && need.type === converted.type &&
      (converted.type !== 'unknown' || normalizeUnit(need.unit) === normalizeUnit(unit))
    );

    if (matchingNeed) matchingNeed.amount += converted.value;
    else needs.push({ item, amount: converted.value, unit, type: converted.type, category: getIngredientCategoryId(item) || 'other' });
  });

  return needs.flatMap(need => {
    const available = inventory.reduce((sum, stock) => {
      if (!stock || stock.amount <= 0 || !isIngredientMatch(stock.name, need.item)) return sum;
      const converted = convertToBase(stock.amount, stock.unit || '', stock.name);
      if (converted.type === need.type && converted.type !== 'unknown') return sum + converted.value;
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
      unit = 'عدد';
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
      if (isIngredientMatch(itemName, ing.item)) {
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
