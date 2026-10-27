import React, { useRef, useState } from 'react';
import { GuestService } from '../../services/guestService';
import { RecipeService, validPersonalRecipes } from '../../services/recipeService';
import { CATEGORY_LABELS, Dish } from '../../types';
import { validBackupDish, validBackupProfile } from '../../utils/backupValidation';

export const validCatalog = (value: unknown): value is Dish[] => Array.isArray(value) && value.length > 0 && value.length <= 20000 && value.every(validBackupDish);

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
      if (file.size > 100_000_000) throw new Error('حجم فایل پشتیبان بیش از ۱۰۰ مگابایت است.');
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('فایل پشتیبان معتبر نوش نیست.');
      if (data.format === 'noosh-personal-recipes' && data.version === 1 && validPersonalRecipes(data.recipes)) {
        if (!confirm('رسپی‌های شخصی این فایل روی همین دستگاه بازیابی شوند؟ رسپی‌های هم‌شناسه به‌روزرسانی و بقیه به فهرست افزوده می‌شوند.')) return;
        const count = await RecipeService.restorePersonalDishes(data.recipes);
        setMessage(`${count.toLocaleString('fa-IR')} رسپی شخصی بازیابی شد.`);
        return;
      }
      if (data.format !== 'noosh-device-backup' || ![1, 2].includes(data.version) || !validBackupProfile(data.profile)) throw new Error('ساختار تنظیمات، انبار یا برنامهٔ غذایی در فایل پشتیبان معتبر نیست؛ اطلاعات فعلی تغییر نکرد.');
      if (!personalOnly && data.dishes && !validCatalog(data.dishes)) throw new Error('فهرست غذاهای فایل معتبر نیست.');
      if (data.personalRecipes !== undefined && !validPersonalRecipes(data.personalRecipes)) throw new Error('رسپی‌های شخصی فایل پشتیبان معتبر نیستند.');
      const confirmation = !personalOnly && data.dishes
        ? 'فهرست عمومی غذاهای این پشتیبان در GitHub ثبت و برای همهٔ کاربران سایت منتشر شود؟ تنظیمات شخصی همین دستگاه نیز بازیابی می‌شوند.'
        : 'اطلاعات این فایل روی همین دستگاه بازیابی شود؟ تنظیمات شخصی جایگزین می‌شوند و رسپی‌های شخصی به فهرست افزوده یا به‌روزرسانی می‌شوند.';
      if (!confirm(confirmation)) return;
      if (Array.isArray(data.personalRecipes)) await RecipeService.restorePersonalDishes(data.personalRecipes);
      if (!personalOnly && data.dishes) {
        await RecipeService.seedFromExternalData(data.dishes, Array.isArray(data.hidden) ? data.hidden : undefined);
        if (Array.isArray(data.hidden) && data.hidden.every((id: unknown) => typeof id === 'string')) localStorage.setItem('global_hidden_dish_ids_v1', JSON.stringify(data.hidden));
        if (data.renamed && typeof data.renamed === 'object' && !Array.isArray(data.renamed) && Object.values(data.renamed).every(v => typeof v === 'string')) localStorage.setItem('renamed_dishes_map_v1', JSON.stringify(data.renamed));
      }
      GuestService.save(data.profile);
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'بازیابی انجام نشد؛ فضای ذخیره‌سازی مرورگر را بررسی کنید.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return <section className="rounded-2xl bg-white p-4 text-right ring-1 ring-slate-200 sm:p-5" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-black text-slate-800">{personalOnly ? 'پشتیبان و تنظیمات دستگاه' : 'پشتیبان کامل و بازیابی'}</h2>{personalOnly && <p className="mt-1 text-xs text-slate-500">اطلاعات شخصی فقط روی همین دستگاه ذخیره می‌شود.</p>}</div>
      <div className="flex flex-wrap gap-2"><button onClick={download} className="rounded-xl bg-emerald-900 px-3.5 py-2.5 text-xs font-bold text-white">دریافت پشتیبان</button><button disabled={busy} onClick={() => input.current?.click()} className="rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold disabled:opacity-40">بازیابی پشتیبان</button></div>
    </div>
    <details className="mt-3 border-t border-slate-100 pt-2">
      <summary className="cursor-pointer text-xs font-bold text-emerald-800">اطلاعات بیشتر دربارهٔ ذخیره‌سازی</summary>
      <p className="mt-2 text-xs leading-6 text-slate-600">تعداد اعضای خانواده، علاقه‌مندی‌ها، مواد ممنوع و حساسیت‌ها، فهرست سیاه، طبع غذا، انبار، برنامه، لیست خرید و رسپی‌های شخصی به‌طور عادی فقط در همین مرورگر و دستگاه ذخیره می‌شوند. با اقدام جداگانه و رضایت شما، یک نسخه از رسپی برای بررسی مدیر به صف خصوصی می‌رود؛ فقط پس از تأیید شما و مدیر، نسخهٔ عمومی در کتابخانه قرار می‌گیرد. با پاک کردن داده‌های سایت یا پاک‌سازی مرورگر که شامل اطلاعات سایت باشد، باید تنظیمات را دوباره انجام دهید. پاک کردن صرفاً فایل‌های کش معمولاً تنظیمات را حذف نمی‌کند. برای انتقال به دستگاه دیگر یا جلوگیری از ازدست‌رفتن اطلاعات، فایل پشتیبان بگیرید؛ عکس رسپی‌های شخصی نیز در پشتیبان قرار می‌گیرند.</p>
      {!personalOnly && <p className="mt-2 text-xs text-slate-500">این پشتیبان شامل ویرایش غذاها و علامت‌های تصاویر نیز هست.</p>}
    </details>
    <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={e => void restore(e.target.files?.[0])} />
    {message && <p role="alert" className="mt-3 text-sm text-rose-700">{message}</p>}
  </section>;
};
export default BackupManager;
