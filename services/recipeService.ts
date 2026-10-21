
import { CATEGORY_LABELS, Dish, UserProfile } from '../types';
import { DB } from '../utils/db';
import { DEFAULT_DISHES } from '../data/recipes';
import RECIPE_CATALOG from '../data/recipes_catalog.json';
import RECIPE_OVERRIDES from '../data/recipes_overrides.json';
import { getHiddenDishIds, getRenamedDishes, hideDishIds } from '../utils/dishStorage';

// غذاهای تکمیلیِ همراه اپ که در فایل فهرست اصلی نیستند.
const EXTRA_CLOUD_DISHES: any[] = [
  {
    "name": "آرایس کفته کلاسیک لبنانی",
    "category": "arayes kafta",
    "Description": "یک غذای خیابانی محبوب لبنانی متشکل از نان پیتای پر شده با گوشت چرخکرده طعمدار که گریل میشود.",
    "Nature_Type": "گرم",
    "Nature_Label": "گرم و خشک",
    "Mosleh": "سماق و ماست",
    "Calories": "۴۵۰ کالری",
    "CookTime": "۲۰ دقیقه",
    "Difficulty": "آسان",
    "Nationality": "لبنانی",
    "Ingredients_List": "گوشت چرخکرده گوسفندی: ۵۰۰ گرم | پیاز قرمز نگینی شده: ۱۰۰ گرم | جعفری تازه خرد شده: ۵۰ گرم | نان پیتا مدیترانهای: ۴ عدد | روغن زیتون: ۴ قاشق غذاخوری | نمک و فلفل سیاه: به مقدار لازم | پودر بهارات: ۱ قاشق چایخوری",
    "Recipe_Steps": "ابتدا گوشت چرخکرده را با پیاز، جعفری و ادویهها ورز دهید | نانهای پیتا را از وسط نیمدایره باز کنید | لایه نازکی از مخلوط گوشت را داخل نان پخش کنید | روی نانها را با روغن زیتون چرب کنید | نانها را در تابه گریل یا روی زغال بپزید تا گوشت مغزپخت و نان ترد شود",
    "description": "یک غذای خیابانی محبوب لبنانی متشکل از نان پیتای پر شده با گوشت چرخکرده طعمدار که گریل میشود.",
    "id": "dish-0-1782263836159",
    "ingredients": [
      { "item": "گوشت چرخکرده گوسفندی", "amount": 0, "unit": "واحد" },
      { "item": "پیاز قرمز نگینی شده", "amount": 0, "unit": "واحد" },
      { "item": "جعفری تازه خرد شده", "amount": 0, "unit": "واحد" },
      { "item": "نان پیتا مدیترانهای", "amount": 0, "unit": "واحد" },
      { "item": "روغن زیتون", "amount": 0, "unit": "واحد" },
      { "item": "نمک و فلفل سیاه", "amount": 0, "unit": "واحد" },
      { "item": "پودر بهارات", "amount": 0, "unit": "واحد" }
    ],
    "recipeSteps": [
      "ابتدا گوشت چرخکرده را با پیاز، جعفری و ادویهها ورز دهید",
      "نانهای پیتا را از وسط نیمدایره باز کنید",
      "لایه نازکی از مخلوط گوشت را داخل نان پخش کنید",
      "روی نانها را با روغن زیتون چرب کنید",
      "نانها را در تابه گریل یا روی زغال بپزید تا گوشت مغزپخت و نان ترد شود"
    ],
    "cookTime": 20,
    "calories": 400,
    "nature": "گرم",
    "mosleh": "سماق و ماست",
    "hasRealData": true
  },
  {
    "name": "آرایس کفته با پنیر و گردو",
    "category": "arayes kafta",
    "Description": "ترکیبی مدرن از آرایس سنتی با افزودن پنیر موتزارلا و گردو برای بافت و طعم غنیتر.",
    "Nature_Type": "معتدل",
    "Nature_Label": "رو به گرم",
    "Mosleh": "انار یا آبلیموی تازه",
    "Calories": "۵۸۰ کالری",
    "CookTime": "۲۵ دقیقه",
    "Difficulty": "متوسط",
    "Nationality": "خاورمیانه",
    "Ingredients_List": "گوشت چرخکرده مخلوط: ۵۰۰ گرم | پنیر موتزارلا رنده شده: ۱۵۰ گرم | مغز گردو خرد شده: ۵۰ گرم | سیر له شده: ۲ حبه | نان پیتا: ۴ عدد | رب انار ملس: ۲ قاشق غذاخوری | نمک و پاپریکا: به مقدار لازم",
    "Recipe_Steps": "گوشت را با سیر، گردو و رب انار کاملاً مخلوط کنید | نان پیتا را باز کرده و یک لایه گوشت و سپس یک لایه پنیر داخل آن قرار دهید | لبههای نان را فشار دهید تا بسته شود | در فر با دمای ۱۸۰ درجه سانتیگراد به مدت ۱۵ دقیقه قرار دهید تا پنیر ذوب شود",
    "description": "ترکیبی مدرن از آرایس سنتی با افزودن پنیر موتزارلا و گردو برای بافت و طعم غنیتر.",
    "id": "dish-1-1782263836159",
    "ingredients": [
      { "item": "گوشت چرخکرده مخلوط", "amount": 0, "unit": "واحد" },
      { "item": "پنیر موتزارلا رنده شده", "amount": 0, "unit": "واحد" },
      { "item": "مغز گردو خرد شده", "amount": 0, "unit": "واحد" },
      { "item": "سیر له شده", "amount": 0, "unit": "واحد" },
      { "item": "نان پیتا", "amount": 0, "unit": "واحد" },
      { "item": "رب انار ملس", "amount": 0, "unit": "واحد" },
      { "item": "نمک و پاپریکا", "amount": 0, "unit": "واحد" }
    ],
    "recipeSteps": [
      "گوشت را با سیر، گردو و رب انار کاملاً مخلوط کنید",
      "نان پیتا را باز کرده و یک لایه گوشت و سپس یک لایه پنیر داخل آن قرار دهید",
      "لبههای نان را فشار دهید تا بسته شود",
      "در فر با دمای ۱۸۰ درجه سانتیگراد به مدت ۱۵ دقیقه قرار دهید تا پنیر ذوب شود"
    ],
    "cookTime": 25,
    "calories": 400,
    "nature": "معتدل",
    "mosleh": "انار یا آبلیموی تازه",
    "hasRealData": true
  },
  {
    "name": "آرایس کفته تند با سس تاتار",
    "category": "arayes kafta",
    "Description": "نسخه تند و تیز آرایس که با فلفل سبز تند و ادویههای مخصوص تهیه میشود.",
    "Nature_Type": "گرم",
    "Nature_Label": "خیلی گرم و خشک",
    "Mosleh": "دوغ محلی یا خیار",
    "Calories": "۴۲۰ کالری",
    "CookTime": "۱۵ دقیقه",
    "Difficulty": "آسان",
    "Nationality": "سوریه",
    "Ingredients_List": "گوشت گوساله چرخکرده: ۵۰۰ گرم | فلفل سبز تند خرد شده: ۲ عدد | گوجهفرنگی فیله شده: ۱۰۰ گرم | نان پیتا سبوسدار: ۴ عدد | پودر زیره سبز: ۱ قاشق چایخوری | روغن کنجد: ۳ قاشق غذاخوری | نمک و زردچوبه: به مقدار لازم",
    "Recipe_Steps": "گوشت را با فلفل تند، گوجهفرنگی و زیره ورز دهید | نانها را با مخلوط گوشت پر کنید | سطح نان را به روغن کنجد آغشته کنید | روی صفحه گریل داغ قرار دهید و هر طرف را ۵ دقیقه سرخ کنید",
    "description": "نسخه تند و تیز آرایس که با فلفل سبز تند و ادویههای مخصوص تهیه میشود.",
    "id": "dish-2-1782263836159",
    "ingredients": [
      { "item": "گوشت گوساله چرخکرده", "amount": 0, "unit": "واحد" },
      { "item": "فلفل سبز تند خرد شده", "amount": 0, "unit": "واحد" },
      { "item": "گوجهفرنگی فیله شده", "amount": 0, "unit": "واحد" },
      { "item": "نان پیتا سبوسدار", "amount": 0, "unit": "واحد" },
      { "item": "پودر زیره سبز", "amount": 0, "unit": "واحد" },
      { "item": "روغن کنجد", "amount": 0, "unit": "واحد" },
      { "item": "نمک و زردچوبه", "amount": 0, "unit": "واحد" }
    ],
    "recipeSteps": [
      "گوشت را با فلفل تند، گوجهفرنگی و زیره ورز دهید",
      "نانها را با مخلوط گوشت پر کنید",
      "سطح نان را به روغن کنجد آغشته کنید",
      "روی صفحه گریل داغ قرار دهید و هر طرف را ۵ دقیقه سرخ کنید"
    ],
    "cookTime": 15,
    "calories": 400,
    "nature": "گرم",
    "mosleh": "دوغ محلی یا خیار",
    "hasRealData": true
  },
  {
    "name": "آرایس کفته مرغ و سبزیجات",
    "category": "arayes kafta",
    "Description": "جایگزینی سبکتر برای علاقمندان به گوشت سفید که با سبزیجات معطر غنی شده است.",
    "Nature_Type": "سرد",
    "Nature_Label": "سرد و تر",
    "Mosleh": "سیاه دانه و فلفل قرمز",
    "Calories": "۳۵۰ کالری",
    "CookTime": "۳۰ دقیقه",
    "Difficulty": "متوسط",
    "Nationality": "اردنی",
    "Ingredients_List": "سینه مرغ چرخکرده: ۶۰۰ گرم | فلفل دلمه رنگی خرد شده: ۵۰ گرم | گشنیز تازه: ۳۰ گرم | پیازچه خرد شده: ۳ شاخه | نان پیتا کوچک: ۸ عدد | کره ذوب شده: ۳۰ گرم | نمک و پودر سیر: به مقدار لازم",
    "Recipe_Steps": "مرغ را با سبزیجات خرد شده و ادویه کاملاً ترکیب کنید | داخل نانهای کوچک را با مواد پر کنید | روی نانها را کره بمالید | در سرخکن بدون روغن (Air Fryer) یا فر قرار دهید تا طلایی و پخته شوند",
    "description": "جایگزینی سبکتر برای علاقمندان به گوشت سفید که با سبزیجات معطر غنی شده است.",
    "id": "dish-3-1782263836159",
    "ingredients": [
      { "item": "سینه مرغ چرخکرده", "amount": 0, "unit": "واحد" },
      { "item": "فلفل دلمه رنگی خرد شده", "amount": 0, "unit": "واحد" },
      { "item": "گشنیز تازه", "amount": 0, "unit": "واحد" },
      { "item": "پیازچه خرد شده", "amount": 0, "unit": "واحد" },
      { "item": "نان پیتا کوچک", "amount": 0, "unit": "واحد" },
      { "item": "کره ذوب شده", "amount": 0, "unit": "واحد" },
      { "item": "نمک و پودر سیر", "amount": 0, "unit": "واحد" }
    ],
    "recipeSteps": [
      "مرغ را با سبزیجات خرد شده و ادویه کاملاً ترکیب کنید",
      "داخل نانهای کوچک را با مواد پر کنید",
      "روی نانها را کره بمالید",
      "در سرخکن بدون روغن (Air Fryer) یا فر قرار دهید تا طلایی و پخته شوند"
    ],
    "cookTime": 30,
    "calories": 400,
    "nature": "سرد",
    "mosleh": "سیاه دانه و فلفل قرمز",
    "hasRealData": true
  },
  {
    "name": "آرایس کفته با ارده ",
    "category": "arayes kafta",
    "Description": "یک ترکیب سنتی و مقوی که از سس ارده برای طعمدهی داخلی استفاده میکند.",
    "Nature_Type": "گرم",
    "Nature_Label": "گرم و تر",
    "Mosleh": "سرکه انگور یا آب نارنج",
    "Calories": "۵۲۰ کالری",
    "CookTime": "۲۰ دقیقه",
    "Difficulty": "متوسط",
    "Nationality": "فلسطینی",
    "Ingredients_List": "گوشت گوسفندی پرچرب: ۵۰۰ گرم | ارده خالص: ۳ قاشق غذاخوری | پیاز سفید رنده شده: ۱۰۰ گرم | صنوبر یا خلال بادام: ۲۰ گرم | نان مدیترانهای: ۴ عدد | نمک و سماق: به مقدار لازم | روغن زیتون: ۲ قاشق غذاخوری",
    "Recipe_Steps": "گوشت را با پیاز، ارده و صنوبر مخلوط کنید تا یکدست شود | مواد را داخل نان قرار داده و فشار دهید | نانها را با برس به روغن زیتون آغشته کنید | در تابه چدنی با حرارت ملایم بپزید تا گوشت کاملاً مغزپخت شود",
    "description": "یک ترکیب سنتی و مقوی که از سس ارده برای طعمدهی داخلی استفاده میکند.",
    "id": "dish-4-1782263836159",
    "ingredients": [
      { "item": "گوشت گوسفندی پرچرب", "amount": 0, "unit": "واحد" },
      { "item": "ارده خالص", "amount": 0, "unit": "واحد" },
      { "item": "پیاز سفید رنده شده", "amount": 0, "unit": "واحد" },
      { "item": "صنوبر یا خلال بادام", "amount": 0, "unit": "واحد" },
      { "item": "نان مدیترانهای", "amount": 0, "unit": "واحد" },
      { "item": "نمک و سماق", "amount": 0, "unit": "واحد" },
      { "item": "روغن زیتون", "amount": 0, "unit": "واحد" }
    ],
    "recipeSteps": [
      "گوشت را با پیاز، ارده و صنوبر مخلوط کنید تا یکدست شود",
      "مواد را داخل نان قرار داده و فشار دهید",
      "نانها را با برس به روغن زیتون آغشته کنید",
      "در تابه چدنی با حرارت ملایم بپزید تا گوشت کاملاً مغزپخت شود"
    ],
    "cookTime": 20,
    "calories": 400,
    "nature": "گرم",
    "mosleh": "سرکه انگور یا آب نارنج",
    "hasRealData": true
  }
];

// تابع ادغام هوشمند برای جلوگیری از حذف غذاهای اصلی هنگام دریافت داده‌ها
const mergeAllDishes = (sources: Dish[][], allowLocalOverrides = true): Dish[] => {
  const map = new Map<string, Dish>();
  if (DEFAULT_DISHES) DEFAULT_DISHES.forEach(d => map.set(d.id, d));
  (RECIPE_CATALOG as unknown as Dish[]).forEach(d => map.set(d.id, d));
  (RECIPE_OVERRIDES.dishes as Dish[]).forEach(d => map.set(d.id, d));
  EXTRA_CLOUD_DISHES.forEach(d => map.set(d.id, {
    ...d, category: 'international', nationality: d.Nationality,
    nature: d.nature === 'گرم' ? 'hot' : d.nature === 'سرد' ? 'cold' : 'balanced',
    ingredients: d.Ingredients_List.split('|').map((entry: string) => {
      const [item, raw = ''] = entry.split(':');
      const value = raw.trim().replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
      const match = value.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      return { item: item.trim(), amount: match ? Number(match[1]) : 0, unit: match ? match[2] : value };
    }),
  }));
  sources.forEach(arr => {
    if (arr) arr.forEach(d => {
      // Bundled catalog data is the published source of truth. Keep local-only
      // dishes, but do not let an older IndexedDB copy replace newer images or
      // recipe edits shipped with the current release.
      if (!map.has(d.id) || (allowLocalOverrides && ((d as Dish & { localEdited?: boolean }).localEdited || d.imageReviewStatus))) {
        map.set(d.id, d);
      }
    });
  });
  return Array.from(map.values());
};

let cachedDishes: Dish[] = [];
let personalDishes: Dish[] = [];
let isInitialized = false;
let _isSyncing = false; 
const PERSONAL_DISHES_KEY = 'noosh-personal-recipes-v1';

const isValidPersonalDish = (dish: unknown): dish is Dish => {
  if (!dish || typeof dish !== 'object') return false;
  const candidate = dish as Dish;
  return candidate.isPersonal === true && typeof candidate.id === 'string' && candidate.id.startsWith('personal-') &&
    typeof candidate.name === 'string' && candidate.name.trim().length > 0 && candidate.name.length <= 120 &&
    candidate.category in CATEGORY_LABELS &&
    typeof candidate.description === 'string' && Array.isArray(candidate.ingredients) && candidate.ingredients.length <= 100 &&
    candidate.ingredients.every(item => item && typeof item.item === 'string' && item.item.trim().length > 0 && Number.isFinite(item.amount) && item.amount >= 0 && typeof item.unit === 'string') &&
    Array.isArray(candidate.recipeSteps) && candidate.recipeSteps.length <= 100 && candidate.recipeSteps.every(step => typeof step === 'string') &&
    (!candidate.imageUrl || (typeof candidate.imageUrl === 'string' && candidate.imageUrl.length <= 8_000_000));
};

export const validPersonalRecipes = (value: unknown): value is Dish[] =>
  Array.isArray(value) && value.length <= 2000 && value.every(isValidPersonalDish);

const notifyRecipesUpdate = (count: number, sync?: { syncing?: boolean; error?: string }) => {
  window.dispatchEvent(new CustomEvent('recipes-updated', { detail: { count, ...sync } }));
};

export const RecipeService = {
  initialize: async (): Promise<{count: number}> => {
    try {
      const localCache = await DB.getAll('dishes');
      cachedDishes = mergeAllDishes([localCache || []], false);
      try {
        const savedPersonal = await DB.get('settings', PERSONAL_DISHES_KEY);
        personalDishes = Array.isArray(savedPersonal?.recipes) ? savedPersonal.recipes.filter(isValidPersonalDish) : [];
      } catch { personalDishes = []; }
      isInitialized = true;

      // Refresh existing browser caches as well as first-time installs so
      // deployed catalog and image changes are reflected after the next load.
      try {
        const dbInstance = await DB.init();
        const transaction = dbInstance.transaction('dishes', 'readwrite');
        const store = transaction.objectStore('dishes');
        for (const d of cachedDishes) await store.put(d);
      } catch (dbErr) {}

      return { count: cachedDishes.length };
    } catch (e) {
      cachedDishes = mergeAllDishes([]);
      isInitialized = true;
      return { count: cachedDishes.length };
    }
  },

  ensureCloudSeededBackground: async () => {},

  isSyncing: () => _isSyncing,

  syncFromCloud: async (forceServer: boolean = true): Promise<{count: number, error?: string}> => {
    // Recipes ship with the app and are cached in IndexedDB. No cloud or remote CSV requests.
    void forceServer;
    return { count: cachedDishes.length };
  },

  getCatalogDishes: (): Dish[] => {
    const hiddenIds = getHiddenDishIds();
    const renamedMap = getRenamedDishes();
    return cachedDishes
      .filter(d => !hiddenIds.includes(d.id) && !RECIPE_OVERRIDES.hiddenDishIds.includes(d.id))
      .map(d => renamedMap[d.id] ? { ...d, name: renamedMap[d.id] } : d);
  },

  getAllDishes: (): Dish[] => [...RecipeService.getCatalogDishes(), ...personalDishes],

  getRawDishes: (): Dish[] => cachedDishes,

  getPersonalDishes: (): Dish[] => personalDishes,

  savePersonalDish: async (dish: Dish): Promise<void> => {
    const saved = { ...dish, isPersonal: true };
    if (!isValidPersonalDish(saved)) throw new Error('اطلاعات رسپی کامل یا معتبر نیست.');
    const next = personalDishes.some(item => item.id === saved.id)
      ? personalDishes.map(item => item.id === saved.id ? saved : item)
      : [...personalDishes, saved];
    await DB.put('settings', { key: PERSONAL_DISHES_KEY, recipes: next });
    personalDishes = next;
    notifyRecipesUpdate(RecipeService.getAllDishes().length);
  },

  deletePersonalDish: async (dishId: string): Promise<void> => {
    const next = personalDishes.filter(dish => dish.id !== dishId);
    await DB.put('settings', { key: PERSONAL_DISHES_KEY, recipes: next });
    personalDishes = next;
    notifyRecipesUpdate(RecipeService.getAllDishes().length);
  },

  restorePersonalDishes: async (recipes: Dish[]): Promise<number> => {
    if (!Array.isArray(recipes) || !recipes.every(isValidPersonalDish)) throw new Error('فهرست رسپی‌های شخصی در فایل پشتیبان معتبر نیست.');
    const byId = new Map(personalDishes.map(dish => [dish.id, dish]));
    for (const recipe of recipes) byId.set(recipe.id, { ...recipe, isPersonal: true });
    const next = [...byId.values()];
    await DB.put('settings', { key: PERSONAL_DISHES_KEY, recipes: next });
    personalDishes = next;
    notifyRecipesUpdate(RecipeService.getAllDishes().length);
    return recipes.length;
  },

  publishCatalog: async (): Promise<{ success: boolean; commit?: string; error?: string }> => {
    try {
      const response = await fetch('/.netlify/functions/publish-catalog', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dishes: cachedDishes, hiddenDishIds: [...new Set([...getHiddenDishIds(), ...RECIPE_OVERRIDES.hiddenDishIds])] }),
      });
      const result = await response.json();
      if (!response.ok) return { success: false, error: result.error || 'ثبت در GitHub انجام نشد.' };
      window.dispatchEvent(new CustomEvent('recipes-published', { detail: { commit: result.commit, count: result.count } }));
      return { success: true, commit: result.commit };
    } catch {
      return { success: false, error: 'ارتباط با سرویس انتشار برقرار نشد؛ تغییر روی این دستگاه مانده است.' };
    }
  },

  isDishAccessible: (dishId: string, user: UserProfile | null): boolean => {
    return true; 
  },

  updateDish: async (dishId: string, updates: Partial<Dish>): Promise<boolean> => {
    try {
      cachedDishes = cachedDishes.map(d => d.id === dishId ? { ...d, ...updates, localEdited: true } : d);
      const updatedDish = cachedDishes.find(d => d.id === dishId);
      if (updatedDish) await DB.put('dishes', updatedDish);
      notifyRecipesUpdate(cachedDishes.length);
      const published = await RecipeService.publishCatalog();
      if (!published.success) window.dispatchEvent(new CustomEvent('recipes-publish-error', { detail: published.error }));
      return published.success;
    } catch (e) { return false; }
  },

  updateDishesBatch: async (updates: { id: string, data: Partial<Dish> }[]): Promise<boolean> => {
    if (updates.length === 0) return true;
    try {
      // Update cache and local DB
      cachedDishes = cachedDishes.map(d => {
        const update = updates.find(u => u.id === d.id);
        return update ? { ...d, ...update.data, localEdited: true } : d;
      });
      
      const dbInstance = await DB.init();
      const transaction = dbInstance.transaction('dishes', 'readwrite');
      const store = transaction.objectStore('dishes');
      for (const u of updates) {
        const updatedDish = cachedDishes.find(d => d.id === u.id);
        if (updatedDish) await store.put(updatedDish);
      }
      
      notifyRecipesUpdate(cachedDishes.length);
      const published = await RecipeService.publishCatalog();
      if (!published.success) window.dispatchEvent(new CustomEvent('recipes-publish-error', { detail: published.error }));
      return published.success;
    } catch (e) {
      console.error("Batch update failed:", e);
      return false;
    }
  },

  deleteDish: async (dishId: string): Promise<boolean> => {
    try {
      hideDishIds([dishId]);
      await DB.delete('dishes', dishId);
      notifyRecipesUpdate(cachedDishes.length);
      const published = await RecipeService.publishCatalog();
      if (!published.success) window.dispatchEvent(new CustomEvent('recipes-publish-error', { detail: published.error }));
      return published.success;
    } catch (e) { return false; }
  },

  clearAllCache: async () => {
    const dbInstance = await DB.init();
    await dbInstance.transaction('dishes', 'readwrite').objectStore('dishes').clear();
    cachedDishes = [];
    isInitialized = false;
  },

  getOfflineCacheCount: async () => cachedDishes.length,
  
  getRealCloudCount: async () => {
    return cachedDishes.length;
  },

  getLocalCount: () => cachedDishes.length,

  seedFromExternalData: async (dishes: Dish[]) => {
    cachedDishes = mergeAllDishes([cachedDishes, dishes.map(d => ({ ...d, localEdited: true }))]);
    const dbInstance = await DB.init();
    const transaction = dbInstance.transaction('dishes', 'readwrite');
    const store = transaction.objectStore('dishes');
    for (const dish of cachedDishes) await store.put(dish);
    isInitialized = true;
    notifyRecipesUpdate(cachedDishes.length);
    const published = await RecipeService.publishCatalog();
    if (!published.success) throw new Error(published.error);
    return { success: true, message: "انجام شد" };
  },

  purgeCloudDatabase: async () => {
    return { success: false, message: "در این نسخه پایگاه دادهٔ ابری وجود ندارد؛ فهرست غذاها پاک نشد." };
  }
};
