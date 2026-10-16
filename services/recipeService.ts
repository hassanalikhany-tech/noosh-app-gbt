
import { Dish, UserProfile } from '../types';
import { DB } from '../utils/db';
import { DEFAULT_DISHES } from '../data/recipes';
import { getHiddenDishIds, getRenamedDishes } from '../utils/dishStorage';

// ۵ غذای جدید درخواستی کاربر برای ارسال مستقیم به دیتابیس فایربیس و ادغام دائمی
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

const GITHUB_CSV_URL = "https://raw.githubusercontent.com/hassanalikhany-tech/noosh-app/main/Noosh_DB_2026-06-29%20(1).csv";

const withTimeout = <T,>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      value => { window.clearTimeout(timer); resolve(value); },
      error => { window.clearTimeout(timer); reject(error); }
    );
  });

function parseCSVStringToRows(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const result: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(current);
        if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
          result.push(row);
        }
        row = [];
        current = '';
      } else {
        current += char;
      }
    }
  }
  if (current !== '' || row.length > 0) {
    row.push(current);
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
      result.push(row);
    }
  }
  return result;
}

const toEnglishDigits = (str: string) => str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

const parseGitHubCSV = (csvText: string): Dish[] => {
  const rows = parseCSVStringToRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const getIdx = (name: string) => headers.indexOf(name.toLowerCase());

  const idIdx = getIdx("id");
  const nameIdx = getIdx("name");
  const catIdx = getIdx("category");
  const descIdx = getIdx("description");
  const natureIdx = getIdx("nature_type");
  const natureLabelIdx = getIdx("nature_label");
  const moslehIdx = getIdx("mosleh");
  const calIdx = getIdx("calories");
  const timeIdx = getIdx("cooktime");
  const diffIdx = getIdx("difficulty");
  const natIdx = getIdx("nationality");
  const ingIdx = getIdx("ingredients_list");
  const stepsIdx = getIdx("recipe_steps");

  const dishes: Dish[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = nameIdx !== -1 && r[nameIdx] ? r[nameIdx].trim() : '';
    if (!name) continue;

    const id = idIdx !== -1 && r[idIdx] ? r[idIdx].trim() : `gh-${i}`;
    const category = (catIdx !== -1 && r[catIdx] ? r[catIdx].trim() : 'stew') as any;
    const description = descIdx !== -1 && r[descIdx] ? r[descIdx].trim() : '';
    const nature = (natureIdx !== -1 && r[natureIdx] ? r[natureIdx].trim() : undefined) as any;
    const natureLabel = natureLabelIdx !== -1 && r[natureLabelIdx] ? r[natureLabelIdx].trim() : undefined;
    const mosleh = moslehIdx !== -1 && r[moslehIdx] ? r[moslehIdx].trim() : undefined;
    
    const calStr = calIdx !== -1 && r[calIdx] ? toEnglishDigits(`${r[calIdx]}`).replace(/\D/g, '') : '';
    const calories = calStr ? Number(calStr) : undefined;

    const timeStr = timeIdx !== -1 && r[timeIdx] ? toEnglishDigits(`${r[timeIdx]}`).replace(/\D/g, '') : '';
    const cookTime = timeStr ? Number(timeStr) : undefined;

    const difficulty = diffIdx !== -1 && r[diffIdx] ? r[diffIdx].trim() : undefined;
    const nationality = natIdx !== -1 && r[natIdx] ? r[natIdx].trim() : 'ir';

    const ingRaw = ingIdx !== -1 && r[ingIdx] ? r[ingIdx].trim() : '';
    const ingredients = ingRaw ? ingRaw.split(' | ').map(part => {
      const [item, amountStr, ...unitParts] = part.split(':');
      const amtClean = amountStr ? toEnglishDigits(amountStr).replace(/[^0-9.]/g, '') : '1';
      return {
        item: (item || '').trim(),
        amount: Number(amtClean) || 1,
        unit: (unitParts.join(':') || '').trim() || 'واحد'
      };
    }).filter(ing => ing.item !== '') : [];

    const stepsRaw = stepsIdx !== -1 && r[stepsIdx] ? r[stepsIdx].trim() : '';
    const recipeSteps = stepsRaw ? stepsRaw.split(' | ').map(s => s.trim()).filter(Boolean) : [];

    dishes.push({
      id,
      name,
      category,
      description,
      nature,
      natureLabel,
      mosleh,
      calories: calories || undefined,
      cookTime: cookTime || undefined,
      difficulty,
      nationality,
      ingredients,
      recipeSteps,
      hasRealData: true
    });
  }

  return dishes;
};

// تابع ادغام هوشمند برای جلوگیری از حذف غذاهای اصلی هنگام دریافت داده‌ها
const mergeAllDishes = (sources: Dish[][]): Dish[] => {
  const map = new Map<string, Dish>();
  if (DEFAULT_DISHES) DEFAULT_DISHES.forEach(d => map.set(d.id, d));
  EXTRA_CLOUD_DISHES.forEach(d => map.set(d.id, d));
  sources.forEach(arr => {
    if (arr) arr.forEach(d => map.set(d.id, d));
  });
  return Array.from(map.values());
};

let cachedDishes: Dish[] = [];
let isInitialized = false;
let _isSyncing = false; 

const notifyRecipesUpdate = (count: number, sync?: { syncing?: boolean; error?: string }) => {
  window.dispatchEvent(new CustomEvent('recipes-updated', { detail: { count, ...sync } }));
};

export const RecipeService = {
  initialize: async (): Promise<{count: number}> => {
    try {
      const localCache = await DB.getAll('dishes');
      cachedDishes = mergeAllDishes([localCache || []]);
      isInitialized = true;
      
      if (!localCache || localCache.length < 650) {
        try {
          const dbInstance = await DB.init();
          const transaction = dbInstance.transaction('dishes', 'readwrite');
          const store = transaction.objectStore('dishes');
          for (const d of cachedDishes) {
            await store.put(d);
          }
        } catch (dbErr) {}
      }

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

  getAllDishes: (): Dish[] => {
    const hiddenIds = getHiddenDishIds();
    const renamedMap = getRenamedDishes();
    return cachedDishes
      .filter(d => !hiddenIds.includes(d.id))
      .map(d => renamedMap[d.id] ? { ...d, name: renamedMap[d.id] } : d);
  },

  getRawDishes: (): Dish[] => cachedDishes,

  isDishAccessible: (dishId: string, user: UserProfile | null): boolean => {
    return true; 
  },

  updateDish: async (dishId: string, updates: Partial<Dish>): Promise<boolean> => {
    try {
      cachedDishes = cachedDishes.map(d => d.id === dishId ? { ...d, ...updates } : d);
      const updatedDish = cachedDishes.find(d => d.id === dishId);
      if (updatedDish) await DB.put('dishes', updatedDish);
      notifyRecipesUpdate(cachedDishes.length);
      return true;
    } catch (e) { return false; }
  },

  updateDishesBatch: async (updates: { id: string, data: Partial<Dish> }[]): Promise<boolean> => {
    if (updates.length === 0) return true;
    try {
      // Update cache and local DB
      cachedDishes = cachedDishes.map(d => {
        const update = updates.find(u => u.id === d.id);
        return update ? { ...d, ...update.data } : d;
      });
      
      const dbInstance = await DB.init();
      const transaction = dbInstance.transaction('dishes', 'readwrite');
      const store = transaction.objectStore('dishes');
      for (const u of updates) {
        const updatedDish = cachedDishes.find(d => d.id === u.id);
        if (updatedDish) await store.put(updatedDish);
      }
      
      notifyRecipesUpdate(cachedDishes.length);
      return true;
    } catch (e) {
      console.error("Batch update failed:", e);
      return false;
    }
  },

  deleteDish: async (dishId: string): Promise<boolean> => {
    try {
      cachedDishes = cachedDishes.filter(d => d.id !== dishId);
      await DB.delete('dishes', dishId);
      notifyRecipesUpdate(cachedDishes.length);
      return true;
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
    cachedDishes = mergeAllDishes([cachedDishes, dishes]);
    const dbInstance = await DB.init();
    const transaction = dbInstance.transaction('dishes', 'readwrite');
    const store = transaction.objectStore('dishes');
    for (const dish of cachedDishes) await store.put(dish);
    isInitialized = true;
    notifyRecipesUpdate(cachedDishes.length);
    return { success: true, message: "انجام شد" };
  },

  purgeCloudDatabase: async () => {
    return { success: false, message: "در نسخهٔ محلی پایگاه دادهٔ ابری وجود ندارد؛ فهرست غذاها پاک نشد." };
  }
};
