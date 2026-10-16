import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, Edit3, Search, ShieldCheck, UsersRound, UtensilsCrossed, X } from 'lucide-react';
import { Dish, CATEGORY_LABELS } from '../../types';
import { RecipeService } from '../../services/recipeService';
import DishEditor from './DishEditor';

interface LocalAdminDashboardProps {
  onExit: () => void;
}

const LocalAdminDashboard: React.FC<LocalAdminDashboardProps> = ({ onExit }) => {
  const [dishes, setDishes] = useState<Dish[]>(() => RecipeService.getAllDishes());
  const [searchTerm, setSearchTerm] = useState('');
  const [showUsersInfo, setShowUsersInfo] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [savedAt, setSavedAt] = useState('');

  const refresh = () => setDishes(RecipeService.getAllDishes());
  useEffect(() => {
    window.addEventListener('recipes-updated', refresh);
    return () => window.removeEventListener('recipes-updated', refresh);
  }, []);

  const filteredDishes = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('fa');
    if (!query) return dishes;
    return dishes.filter(dish => `${dish.name} ${dish.nationality || ''} ${dish.category || ''}`.toLocaleLowerCase('fa').includes(query));
  }, [dishes, searchTerm]);

  const exportLocalCatalog = () => {
    const blob = new Blob([JSON.stringify(RecipeService.getRawDishes(), null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noosh-recipes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaved = () => {
    refresh();
    setSavedAt(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <div className="min-h-[100dvh] bg-[#f5f7f2] text-right dir-rtl text-slate-900">
      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[#173c2b] text-white shadow-lg shadow-emerald-950/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d7b45a] text-[#173c2b]"><ShieldCheck size={23} /></div>
            <div>
              <h1 className="text-lg font-black sm:text-xl">مدیریت نوش</h1>
              <p className="text-[11px] font-semibold text-emerald-100/75">مدیریت محلی روی همین دستگاه</p>
            </div>
          </div>
          <button onClick={onExit} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7b45a]"><ArrowRight size={17} /> بازگشت به اپ</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-9">
        <section className="grid gap-4 md:grid-cols-[1.4fr_.6fr]">
          <div className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-emerald-950/5 sm:p-8">
            <div className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full border-[30px] border-[#d7b45a]/10" />
            <div className="relative flex items-start gap-4">
              <div className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><UtensilsCrossed size={22} /></div>
              <div>
                <p className="text-xs font-black tracking-wide text-emerald-800">کتابخانهٔ غذاهای نوش</p>
                <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">غذاها را همین‌جا مدیریت کن</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">ویرایش‌ها و پشتیبان این فهرست فقط در مرورگر فعلی ذخیره می‌شوند؛ برای نگه‌داشتن نسخهٔ پشتیبان، فایل JSON را دریافت کن.</p>
              </div>
            </div>
            <div className="relative mt-7 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-[#f3f6f1] px-4 py-3"><span className="block text-[10px] font-bold text-slate-500">غذاهای در دسترس</span><strong className="mt-1 block text-2xl font-black text-[#173c2b]">{dishes.length.toLocaleString('fa-IR')}</strong></div>
              <div className="rounded-2xl bg-[#faf7ed] px-4 py-3"><span className="block text-[10px] font-bold text-slate-500">آخرین ویرایش محلی</span><strong className="mt-1 block text-sm font-black text-[#80651e]">{savedAt || 'هنوز ویرایشی ثبت نشده'}</strong></div>
            </div>
          </div>

          <button type="button" onClick={() => setShowUsersInfo(true)} className="group flex min-h-48 flex-col justify-between rounded-[28px] bg-[#e9ece7] p-6 text-right ring-1 ring-slate-900/5 transition hover:bg-[#e5e9e3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
            <div className="flex w-full items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-slate-500"><UsersRound size={21} /></span><span className="rounded-full bg-slate-500/10 px-3 py-1 text-[10px] font-black text-slate-500">فعلاً غیرفعال</span></div>
            <div><h3 className="text-lg font-black text-slate-700">اطلاعات کاربران</h3><p className="mt-1 text-xs leading-5 text-slate-500">ذخیره‌سازی این نسخه محلی است و دادهٔ کاربران دیگر در دسترس نیست.</p></div>
          </button>
        </section>

        <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-emerald-950/5">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div><h2 className="text-lg font-black">فهرست دستورها</h2><p className="mt-1 text-xs text-slate-500">برای ویرایش هر غذا، گزینهٔ ویرایش را انتخاب کن.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-700/30">
                <Search size={17} className="text-slate-400" />
                <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="نام، دسته یا کشور" className="min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400 sm:w-52" />
              </label>
              <button onClick={exportLocalCatalog} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173c2b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#225339]"><Download size={17} /> پشتیبان غذاها</button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredDishes.slice(0, 100).map(dish => (
              <article key={dish.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-[#f8faf6] sm:px-7">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f3f6f1] text-emerald-800"><UtensilsCrossed size={18} /></div>
                <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black">{dish.name}</h3><p className="mt-1 truncate text-[11px] text-slate-500">{CATEGORY_LABELS[dish.category] || dish.category} {dish.nationality ? `· ${dish.nationality}` : ''}</p></div>
                <button onClick={() => setEditingDish(dish)} aria-label={`ویرایش ${dish.name}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-900/10 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"><Edit3 size={15} /> ویرایش</button>
              </article>
            ))}
            {filteredDishes.length === 0 && <div className="px-7 py-14 text-center text-sm font-semibold text-slate-500">غذایی با این عبارت پیدا نشد.</div>}
            {filteredDishes.length > 100 && <p className="px-7 py-4 text-center text-xs font-semibold text-slate-500">۱۰۰ نتیجهٔ اول نمایش داده شده؛ برای پیدا کردن غذا، جستجو را دقیق‌تر کن.</p>}
          </div>
        </section>
      </main>

      {showUsersInfo && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4" onClick={() => setShowUsersInfo(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="users-info-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-black text-slate-500">فعلاً غیرفعال</span><h2 id="users-info-title" className="mt-1 text-xl font-black">اطلاعات کاربران</h2></div><button onClick={() => setShowUsersInfo(false)} aria-label="بستن" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button></div>
            <p className="mt-4 text-sm leading-7 text-slate-600">چون حساب‌ها و داده‌ها فعلاً فقط روی دستگاه هر کاربر ذخیره می‌شوند، این پنل نمی‌تواند فهرست یا اطلاعات کاربران دیگر را ببیند. این بخش پس از راه‌اندازی ذخیره‌سازی مرکزی فعال می‌شود.</p>
            <button onClick={() => setShowUsersInfo(false)} className="mt-5 w-full rounded-xl bg-[#173c2b] px-4 py-3 text-sm font-bold text-white">متوجه شدم</button>
          </section>
        </div>
      )}
      {editingDish && <DishEditor dish={editingDish} onClose={() => setEditingDish(null)} onSave={handleSaved} />}
    </div>
  );
};

export default LocalAdminDashboard;
