import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { ArrowRight, Download, Edit3, Search, ShieldCheck, UsersRound, UtensilsCrossed, X, Trash2, RotateCcw, Image as ImageIcon, SlidersHorizontal } from 'lucide-react';
import { Dish, DishCategory, CATEGORY_LABELS } from '../../types';
import { RecipeService } from '../../services/recipeService';
import DishEditor from './DishEditor';
import CommunityRecipeReview from './CommunityRecipeReview';

const ImageGuide = lazy(() => import('./ImageGuide'));
const DuplicateResolver = lazy(() => import('./DuplicateResolver'));
const UnitConsistencyManager = lazy(() => import('./UnitConsistencyManager'));
const PantryUnitManager = lazy(() => import('./PantryUnitManager'));
const CsvToJsonConverter = lazy(() => import('./CsvToJsonConverter'));
const BackupManager = lazy(() => import('./BackupManager'));
const DatabaseManager = lazy(() => import('./DatabaseManager'));

interface LocalAdminDashboardProps {
  onExit: () => void;
  onLogout?: () => void;
}

const LocalAdminDashboard: React.FC<LocalAdminDashboardProps> = ({ onExit, onLogout }) => {
  const [tab, setTab] = useState('catalog');
  const [page, setPage] = useState(1);
  const [dishes, setDishes] = useState<Dish[]>(() => RecipeService.getCatalogDishes());
  const [deletedDishes, setDeletedDishes] = useState<Dish[]>(() => RecipeService.getDeletedCatalogDishes());
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogView, setCatalogView] = useState<'published' | 'deleted'>('published');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DishCategory>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'community' | 'library'>('all');
  const [workingDishId, setWorkingDishId] = useState<string | null>(null);
  useEffect(() => setPage(1), [searchTerm, catalogView, categoryFilter, sourceFilter]);
  const [showUsersInfo, setShowUsersInfo] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [savedAt, setSavedAt] = useState('');
  const [publishMessage, setPublishMessage] = useState('');

  const refresh = () => {
    setDishes(RecipeService.getCatalogDishes());
    setDeletedDishes(RecipeService.getDeletedCatalogDishes());
  };
  useEffect(() => {
    window.addEventListener('recipes-updated', refresh);
    const published = (event: Event) => {
      const detail = (event as CustomEvent<{commit?: string; action?: string; name?: string}>).detail;
      const operation = detail?.action === 'delete' ? 'حذف' : detail?.action === 'restore' ? 'بازیابی' : detail?.action === 'edit' ? 'ویرایش' : 'تغییر';
      setPublishMessage(`${operation}${detail?.name ? ` «${detail.name}»` : ''} در GitHub ثبت شد (${detail?.commit?.slice(0, 7) || 'ثبت موفق'}). Netlify در حال انتشار نسخهٔ تازه است.`);
    };
    const failed = (event: Event) => setPublishMessage((event as CustomEvent<string>).detail || 'ثبت در GitHub انجام نشد.');
    window.addEventListener('recipes-published', published);
    window.addEventListener('recipes-publish-error', failed);
    return () => {
      window.removeEventListener('recipes-updated', refresh);
      window.removeEventListener('recipes-published', published);
      window.removeEventListener('recipes-publish-error', failed);
    };
  }, []);

  const filteredDishes = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('fa');
    const source = catalogView === 'deleted' ? deletedDishes : dishes;
    return source.filter(dish => {
      if (categoryFilter !== 'all' && dish.category !== categoryFilter) return false;
      if (catalogView === 'published' && sourceFilter === 'community' && !dish.isCommunityRecipe) return false;
      if (catalogView === 'published' && sourceFilter === 'library' && dish.isCommunityRecipe) return false;
      if (!query) return true;
      const ingredients = (dish.ingredients || []).map(item => item.item).join(' ');
      return `${dish.name} ${dish.nationality || ''} ${CATEGORY_LABELS[dish.category] || dish.category} ${ingredients}`.toLocaleLowerCase('fa').includes(query);
    });
  }, [dishes, deletedDishes, searchTerm, catalogView, categoryFilter, sourceFilter]);

  const handleDeleteDish = async (dish: Dish) => {
    if (!window.confirm(`«${dish.name}» از فهرست عمومی غذاها حذف شود؟\n\nاین حذف قابل بازگشت است و از بخش «حذف‌شده‌ها» می‌توانی غذا را بازیابی کنی.`)) return;
    setWorkingDishId(dish.id);
    setPublishMessage('در حال ثبت حذف غذا در GitHub…');
    const success = await RecipeService.deleteDish(dish.id);
    if (success) refresh();
    else setPublishMessage('حذف غذا در GitHub ثبت نشد. اتصال مدیر را بررسی کن و دوباره تلاش کن.');
    setWorkingDishId(null);
  };

  const handleRestoreDish = async (dish: Dish) => {
    if (!window.confirm(`«${dish.name}» دوباره در فهرست عمومی نمایش داده شود؟`)) return;
    setWorkingDishId(dish.id);
    setPublishMessage('در حال ثبت بازیابی غذا در GitHub…');
    const success = await RecipeService.restoreDish(dish.id);
    if (success) refresh();
    else setPublishMessage('بازیابی غذا در GitHub ثبت نشد. اتصال مدیر را بررسی کن و دوباره تلاش کن.');
    setWorkingDishId(null);
  };

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
              <p className="text-[11px] font-semibold text-emerald-100/75">پنل مدیر · ثبت تغییرها در GitHub و انتشار با Netlify</p>
            </div>
          </div>
          <div className="flex gap-2"><button onClick={onExit} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7b45a]"><ArrowRight size={17} /> بازگشت به اپ</button>{onLogout && <button onClick={onLogout} className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold">خروج مدیر</button>}</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-9">
        <nav aria-label="بخش‌های مدیریت" className="flex flex-wrap gap-2">{[
          ['catalog','فهرست و ویرایش غذاها'], ['images','مدیریت عکس‌ها'], ['database','ورود و خروجی غذاها'],
          ['duplicates','اصلاح غذاهای تکراری'], ['pantry-units','واحدهای انبار'], ['units','مغایرت واحد رسپی‌ها'], ['converter','مبدل اکسل'], ['backup','پشتیبان و بازیابی'], ['unavailable','بخش‌های وابسته به سرور'],
          ['community','رسپی‌های ارسالی کاربران'],
        ].map(([id,label]) => <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab === id ? 'bg-emerald-900 text-white' : 'bg-white text-slate-700'}`}>{label}</button>)}</nav>
        <p role="status" aria-live="polite" className={`rounded-xl p-3 text-sm leading-7 ${publishMessage.includes('انجام نشد') ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-900'}`}>{publishMessage || 'هر ذخیره، حذف، یا تغییر عکس پس از ثبت در GitHub به انتشار عمومی Netlify می‌رود.'}</p>
        <Suspense fallback={<p role="status">در حال آماده‌سازی ابزار…</p>}>
          {tab === 'community' && <CommunityRecipeReview />}
          {tab === 'images' && <ImageGuide />}
          {tab === 'database' && <DatabaseManager />}
          {tab === 'duplicates' && <DuplicateResolver />}
          {tab === 'pantry-units' && <PantryUnitManager />}
          {tab === 'units' && <UnitConsistencyManager />}
          {tab === 'converter' && <CsvToJsonConverter />}
          {tab === 'backup' && <BackupManager />}
          {tab === 'unavailable' && <section className="rounded-3xl bg-white p-6"><h2 className="font-black">فعلاً غیرفعال؛ نیازمند ذخیره‌سازی مرکزی</h2><p className="mt-3 leading-8 text-slate-500">کاربران، ویزیتورها، اعلان سراسری، بازخورد کاربران، آمار بازدید، گزارش‌های امنیتی، پرداخت‌ها، تنظیمات قیمت و تسویه‌ها در نسخهٔ محلی در دسترس نیستند. بهینه‌سازی آنلاین با هوش مصنوعی نیز تا تعیین سرویس مناسب غیرفعال است.</p></section>}
        </Suspense>
        {tab === 'catalog' && <>
        <section className="grid gap-4 md:grid-cols-[1.4fr_.6fr]">
          <div className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-emerald-950/5 sm:p-8">
            <div className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full border-[30px] border-[#d7b45a]/10" />
            <div className="relative flex items-start gap-4">
              <div className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><UtensilsCrossed size={22} /></div>
              <div>
                <p className="text-xs font-black tracking-wide text-emerald-800">کتابخانهٔ غذاهای نوش</p>
                <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">غذاها را همین‌جا مدیریت کن</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">تغییر هر غذا ابتدا ثبت می‌شود و سپس با حساب مدیر در GitHub قرار می‌گیرد تا Netlify آن را برای همه منتشر کند. فایل JSON هم برای پشتیبان در دسترس است.</p>
              </div>
            </div>
            <div className="relative mt-7 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-[#f3f6f1] px-4 py-3"><span className="block text-[10px] font-bold text-slate-500">غذاهای منتشرشده</span><strong className="mt-1 block text-2xl font-black text-[#173c2b]">{dishes.length.toLocaleString('fa-IR')}</strong></div>
              <div className="rounded-2xl bg-rose-50 px-4 py-3"><span className="block text-[10px] font-bold text-rose-700">حذف‌شده‌های قابل بازیابی</span><strong className="mt-1 block text-2xl font-black text-rose-800">{deletedDishes.length.toLocaleString('fa-IR')}</strong></div>
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
            <div><h2 className="text-lg font-black">مدیریت غذاهای منتشرشده</h2><p className="mt-1 text-xs text-slate-500">رسپی، تصویر، مواد اولیه و مراحل پخت را ویرایش کن؛ حذف‌ها هم قابل بازیابی هستند.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-700/30">
                <Search size={17} className="text-slate-400" />
                <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="نام، ماده، دسته یا کشور" className="min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400 sm:w-52" />
              </label>
              <button type="button" onClick={() => setCatalogView(view => view === 'published' ? 'deleted' : 'published')} aria-pressed={catalogView === 'deleted'} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${catalogView === 'deleted' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'}`}>
                {catalogView === 'published' ? `حذف‌شده‌ها (${deletedDishes.length.toLocaleString('fa-IR')})` : `بازگشت به منتشرشده‌ها (${dishes.length.toLocaleString('fa-IR')})`}
              </button>
              <button onClick={exportLocalCatalog} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173c2b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#225339]"><Download size={17} /> پشتیبان غذاها</button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-[#fbfcfa] px-5 py-3 sm:px-7">
            <SlidersHorizontal size={16} className="text-emerald-800" />
            <label className="sr-only" htmlFor="admin-dish-category">فیلتر دسته</label>
            <select id="admin-dish-category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as 'all' | DishCategory)} className="rounded-lg border-0 bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
              <option value="all">همهٔ دسته‌ها</option>{Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            {catalogView === 'published' && <><label className="sr-only" htmlFor="admin-dish-source">نوع رسپی</label><select id="admin-dish-source" value={sourceFilter} onChange={event => setSourceFilter(event.target.value as 'all' | 'community' | 'library')} className="rounded-lg border-0 bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200"><option value="all">همهٔ رسپی‌ها</option><option value="library">کتابخانهٔ نوش</option><option value="community">رسپی‌های کاربران</option></select></>}
            <span className="mr-auto text-xs font-semibold text-slate-500">{filteredDishes.length.toLocaleString('fa-IR')} غذا</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredDishes.slice((page - 1) * 50, page * 50).map(dish => (
              <article key={dish.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-[#f8faf6] sm:px-7">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f3f6f1] text-emerald-800">{dish.imageUrl ? <img src={dish.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} /> : <ImageIcon size={18} />}</div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="max-w-full truncate text-sm font-black">{dish.name}</h3>{dish.isCommunityRecipe && <span className="rounded-full bg-[#faf7ed] px-2 py-0.5 text-[10px] font-bold text-[#80651e]">رسپی کاربران</span>}</div><p className="mt-1 truncate text-[11px] text-slate-500">{CATEGORY_LABELS[dish.category] || dish.category} {dish.nationality ? `· ${dish.nationality}` : ''} · {dish.ingredients?.length || 0} ماده · {dish.recipeSteps?.length || 0} مرحله</p></div>
                {catalogView === 'published' ? <><button disabled={workingDishId === dish.id} onClick={() => setEditingDish(dish)} aria-label={`ویرایش ${dish.name}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-900/10 transition hover:bg-emerald-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"><Edit3 size={15} /> ویرایش</button><button disabled={workingDishId === dish.id} onClick={() => void handleDeleteDish(dish)} aria-label={`حذف ${dish.name}`} title="حذف از سایت" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"><Trash2 size={16} /></button></> : <button disabled={workingDishId === dish.id} onClick={() => void handleRestoreDish(dish)} aria-label={`بازیابی ${dish.name}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"><RotateCcw size={15} /> بازیابی</button>}
              </article>
            ))}
            {filteredDishes.length === 0 && <div className="px-7 py-14 text-center text-sm font-semibold text-slate-500">{catalogView === 'deleted' ? 'غذای حذف‌شده‌ای برای این فیلتر وجود ندارد.' : 'غذایی با این فیلتر پیدا نشد.'}</div>}
            {filteredDishes.length > 0 && <div className="flex justify-center items-center gap-4 p-5"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 disabled:opacity-30">قبلی</button><span>{page.toLocaleString('fa-IR')} / {Math.max(1, Math.ceil(filteredDishes.length / 50)).toLocaleString('fa-IR')}</span><button disabled={page * 50 >= filteredDishes.length} onClick={() => setPage(p => p + 1)} className="p-2 disabled:opacity-30">بعدی</button></div>}
          </div>
        </section>
        </>}
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
