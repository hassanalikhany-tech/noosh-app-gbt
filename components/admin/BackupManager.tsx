import React, { useRef, useState } from 'react';
import { GuestService } from '../../services/guestService';
import { RecipeService, validPersonalRecipes } from '../../services/recipeService';
import { CATEGORY_LABELS, Dish } from '../../types';

export const validCatalog = (value: unknown): value is Dish[] => Array.isArray(value) && value.length > 0 && value.every(d => d && typeof d.id === 'string' && typeof d.name === 'string' && d.category in CATEGORY_LABELS && Array.isArray(d.ingredients) && d.ingredients.every((i: any) => typeof i.item === 'string' && typeof i.amount === 'number' && Number.isFinite(i.amount) && i.amount >= 0 && typeof i.unit === 'string') && Array.isArray(d.recipeSteps) && d.recipeSteps.every((s: unknown) => typeof s === 'string'));

const BackupManager: React.FC<{personalOnly?: boolean}> = ({personalOnly = false}) => {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const download = () => {
    const data = { format: 'noosh-device-backup', version: 2, profile: GuestService.get(), personalRecipes: RecipeService.getPersonalDishes(), ...(!personalOnly ? { dishes: RecipeService.getRawDishes(), hidden: JSON.parse(localStorage.getItem('global_hidden_dish_ids_v1') || '[]'), renamed: JSON.parse(localStorage.getItem('renamed_dishes_map_v1') || '{}') } : {}) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `noosh-${personalOnly ? 'personal' : 'complete'}-backup.json`; link.click(); URL.revokeObjectURL(url);
  };
  const restore = async (file?: File) => {
    if (!file) return;
    setBusy(true); setMessage('');
    try {
      const data = JSON.parse(await file.text());
      if (data.format === 'noosh-personal-recipes' && data.version === 1 && validPersonalRecipes(data.recipes)) {
        if (!confirm('رسپی‌های شخصی این فایل روی همین دستگاه بازیابی شوند؟ رسپی‌های هم‌شناسه به‌روزرسانی و بقیه به فهرست افزوده می‌شوند.')) return;
        const count = await RecipeService.restorePersonalDishes(data.recipes);
        setMessage(`${count.toLocaleString('fa-IR')} رسپی شخصی بازیابی شد.`);
        return;
      }
      if (data.format !== 'noosh-device-backup' || ![1, 2].includes(data.version) || !data.profile || !Number.isInteger(data.profile.familySize) || data.profile.familySize < 1 || data.profile.familySize > 20) throw new Error('فایل پشتیبان معتبر نوش نیست.');
      for (const key of ['inventory', 'favoriteDishIds', 'blacklistedDishIds', 'dislikedIngredients', 'excludedCategories', 'preferredNatures', 'customShoppingList', 'history']) {
        if (!Array.isArray(data.profile[key])) throw new Error('ساختار تنظیمات در فایل پشتیبان معتبر نیست.');
      }
      if (!personalOnly && data.dishes && !validCatalog(data.dishes)) throw new Error('فهرست غذاهای فایل معتبر نیست.');
      if (data.personalRecipes !== undefined && !validPersonalRecipes(data.personalRecipes)) throw new Error('رسپی‌های شخصی فایل پشتیبان معتبر نیستند.');
      if (!confirm('اطلاعات این فایل روی همین دستگاه بازیابی شود؟ تنظیمات شخصی جایگزین می‌شوند و رسپی‌های شخصی به فهرست افزوده یا به‌روزرسانی می‌شوند.')) return;
      if (Array.isArray(data.personalRecipes)) await RecipeService.restorePersonalDishes(data.personalRecipes);
      if (!personalOnly && data.dishes) {
        await RecipeService.seedFromExternalData(data.dishes);
        if (Array.isArray(data.hidden) && data.hidden.every((id: unknown) => typeof id === 'string')) localStorage.setItem('global_hidden_dish_ids_v1', JSON.stringify(data.hidden));
        if (data.renamed && typeof data.renamed === 'object' && !Array.isArray(data.renamed) && Object.values(data.renamed).every(v => typeof v === 'string')) localStorage.setItem('renamed_dishes_map_v1', JSON.stringify(data.renamed));
      }
      GuestService.save(data.profile);
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'بازیابی انجام نشد؛ فضای ذخیره‌سازی مرورگر را بررسی کنید.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 text-right" dir="rtl">
    <h2 className="font-black text-slate-800">{personalOnly ? 'تنظیمات شما روی همین دستگاه' : 'پشتیبان کامل و بازیابی'}</h2>
    <p className="mt-2 text-sm leading-7 text-slate-600">تعداد اعضای خانواده، علاقه‌مندی‌ها، مواد ممنوع و حساسیت‌ها، فهرست سیاه، طبع غذا، انبار، برنامه، لیست خرید و رسپی‌های شخصی به‌طور عادی فقط در همین مرورگر و دستگاه ذخیره می‌شوند. با اقدام جداگانه و رضایت شما، یک نسخه از رسپی برای بررسی مدیر به صف خصوصی می‌رود؛ فقط پس از تأیید شما و مدیر، نسخهٔ عمومی در کتابخانه قرار می‌گیرد. با پاک کردن داده‌های سایت یا پاک‌سازی مرورگر که شامل اطلاعات سایت باشد، باید تنظیمات را دوباره انجام دهید. پاک کردن صرفاً فایل‌های کش معمولاً تنظیمات را حذف نمی‌کند. برای انتقال به دستگاه دیگر یا جلوگیری از ازدست‌رفتن اطلاعات، فایل پشتیبان بگیرید؛ عکس رسپی‌های شخصی نیز در پشتیبان قرار می‌گیرند.</p>
    {!personalOnly && <p className="mt-2 text-sm text-slate-500">این پشتیبان شامل ویرایش غذاها و علامت‌های تصاویر نیز هست.</p>}
    <div className="mt-4 flex flex-wrap gap-3"><button onClick={download} className="rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white">دریافت پشتیبان</button><button disabled={busy} onClick={() => input.current?.click()} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold disabled:opacity-40">بازیابی پشتیبان</button></div>
    <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={e => void restore(e.target.files?.[0])} />
    {message && <p role="alert" className="mt-3 text-sm text-rose-700">{message}</p>}
  </section>;
};
export default BackupManager;
