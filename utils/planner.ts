import { Dish, DayPlan, UserProfile } from '../types';
import { RecipeService } from '../services/recipeService';
import { UserService } from '../services/userService';
import { isDishProhibited, estimateCookTime, getDishNature, getShoppingShortages, evaluateInventory } from './recipeHelpers';
import { getRelevantInventory, usesInventory } from './kitchenMode';

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const toPersianDigits = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/**
 * فیلتر کردن غذاها بر اساس تنظیمات کاربر
 */
export const filterDishes = (user: UserProfile) => {
  let pool = RecipeService.getAllDishes(user);
  
  if (pool.length === 0) return [];

  // ۱. حذف قطعی لیست سیاه کاربر
  pool = pool.filter(d => !user.blacklistedDishIds?.includes(d.id));
  
  // ۲. فیلتر مواد ممنوعه (حساسیت‌های کاربر)
  pool = pool.filter(dish => !isDishProhibited(dish, user));

  // ۳. فیلتر دسته‌های حذف شده در تنظیمات
  const filteredByCategory = pool.filter(d => !user.excludedCategories?.includes(d.category));
  pool = filteredByCategory;

  // ۴. فیلتر طبع (گرم، سرد، معتدل)
  const preferred = (user.preferredNatures && user.preferredNatures.length > 0) 
    ? user.preferredNatures 
    : ['hot', 'cold', 'balanced'];

  const filteredByNature = pool.filter(d => {
    const dishNature = ['hot', 'cold', 'balanced'].includes(d.nature || '') ? d.nature! : getDishNature(d).type;
    return preferred.includes(dishNature);
  });
  pool = filteredByNature;
  
  // ۵. فیلترهای سریع
  if (user.onlyFavoritesMode) {
      const favorites = pool.filter(d => user.favoriteDishIds?.includes(d.id));
      pool = favorites;
  }
  
  // --- تقویت شدید فیلتر گیاهی (فقط مواد غیرگوشتی) ---
  if (user.meatlessMode) {
      const meatKeywords = [
        'گوشت', 'مرغ', 'ماهی', 'میگو', 'کالباس', 'سوسیس', 'ژامبون', 'بره', 'گوساله', 'گوسفند', 
        'بوقلمون', 'جگر', 'زبان', 'سیرابی', 'کله', 'پاچه', 'شتر', 'بلدرچین', 'اردک', 'غاز', 
        'فیله', 'استیک', 'کباب', 'مغز', 'دل', 'قلوه', 'خویش', 'دنبه', 'تن ماهی', 'ژلاتین'
      ];
      
      pool = pool.filter(dish => {
          const nameHasMeat = meatKeywords.some(k => dish.name.includes(k));
          const descHasMeat = meatKeywords.some(k => (dish.description || "").includes(k));
          const ingredientsHaveMeat = dish.ingredients.some(ing => 
            meatKeywords.some(k => ing.item.includes(k))
          );
          const isKababCategory = dish.category === 'kabab' && !dish.name.includes('گیاهی');
          return !nameHasMeat && !descHasMeat && !ingredientsHaveMeat && !isKababCategory;
      });
  }
  
  if (user.quickMealsMode) {
      const quick = pool.filter(d => (d.cookTime || estimateCookTime(d)) <= 45);
      pool = quick;
  }
  
  if (user.excludedNationalities?.length) pool = pool.filter(d => !user.excludedNationalities!.includes(d.nationality || ''));
  return pool;
};

/** Inventory mode keeps every preference filter, then ranks suitable recipes by how much can be cooked from current stock. */
export const getPlanningPool = (user: UserProfile): Dish[] => {
  const pool = shuffleArray(filterDishes(user));
  const inventory = getRelevantInventory(user);
  if (!usesInventory(user) || !inventory.some(item => item.amount > 0)) return pool;

  const scored = pool.map((dish, order) => {
    const evaluation = evaluateInventory(inventory, dish.ingredients, user.familySize || 4, dish.servings || 4);
    const coverage = evaluation.lines.length ? evaluation.lines.filter(line => line.status === 'ready').length / evaluation.lines.length : 0;
    return { dish, order, shortages: evaluation.lines.filter(line => line.status !== 'ready').length, coverage };
  });

  scored.sort((a, b) => b.coverage - a.coverage || a.shortages - b.shortages || a.order - b.order);
  return scored.map(item => item.dish);
};

/**
 * تولید یک جایگزین تکی برای یک وعده
 */
export const generateSingleReplacement = async (user: UserProfile, currentIds: string[]): Promise<Dish> => {
    const pool = getPlanningPool(user);
    if (pool.length === 0) throw new Error("غذای جایگزین با این فیلترها یافت نشد.");
    
    // فیلتر کردن غذاهایی که همین الان در لیست هستند برای جلوگیری از تکرار
    const uniquePool = pool.filter(d => !currentIds.includes(d.id));
    const finalPool = uniquePool.length > 0 ? uniquePool : pool;
    
    return finalPool[Math.floor(Math.random() * finalPool.length)];
};

export const generateDailyPlan = async (user: UserProfile): Promise<{ plan: DayPlan[], updatedUser: UserProfile }> => {
  if (RecipeService.getLocalCount() === 0) throw new Error("دیتابیس خالی است یا در حال بارگذاری می‌باشد.");
  const pool = getPlanningPool(user);
  if (pool.length === 0) throw new Error("موردی با فیلترهای شما یافت نشد.");
  const selected = shuffleArray(pool).slice(0, 3);
  const plan = selected.map((dish, idx) => ({ dayName: idx === 0 ? 'پیشنهاد اصلی' : `جایگزین ${toPersianDigits(idx)}`, dish }));
  const updatedUser = await UserService.updateProfile(user.username, { weeklyPlan: plan, weeklyPlanMode: user.kitchenMode || 'with-inventory' });
  return { plan, updatedUser };
};

export const generateWeeklyPlan = async (user: UserProfile): Promise<{ plan: DayPlan[], updatedUser: UserProfile }> => {
  if (RecipeService.getLocalCount() === 0) throw new Error("دیتابیس در حال بارگذاری است.");
  const pool = getPlanningPool(user);
  if (pool.length === 0) throw new Error("موردی با فیلترهای شما یافت نشد.");
  const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  const shuffled = pool;
  const plan = days.map((day, idx) => ({ dayName: day, dish: shuffled[idx % shuffled.length] }));
  const updatedUser = await UserService.updateProfile(user.username, { weeklyPlan: plan, weeklyPlanMode: user.kitchenMode || 'with-inventory' });
  return { plan, updatedUser };
};

export const generateMonthlyPlan = async (user: UserProfile): Promise<{ plan: DayPlan[], updatedUser: UserProfile }> => {
  if (RecipeService.getLocalCount() === 0) throw new Error("دیتابیس در حال بارگذاری است.");
  const pool = getPlanningPool(user);
  if (pool.length === 0) throw new Error("موردی با فیلترهای شما یافت نشد.");
  const shuffled = pool;
  const plan: DayPlan[] = [];
  for (let i = 1; i <= 30; i++) {
    plan.push({ dayName: `روز ${toPersianDigits(i)}`, dish: shuffled[(i - 1) % shuffled.length] });
  }
  const updatedUser = await UserService.updateProfile(user.username, { weeklyPlan: plan, weeklyPlanMode: user.kitchenMode || 'with-inventory' });
  return { plan, updatedUser };
};
