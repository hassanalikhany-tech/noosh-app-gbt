import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChefHat, ChevronLeft, ChevronRight, Clock3, Globe2, Image as ImageIcon, Loader2, PackageCheck, Pencil, Search, Send, Users, Utensils, X } from 'lucide-react';
import { Dish, CATEGORY_LABELS } from '../../types';
import { confirmRecipeCatalogDeployment, RecipeService } from '../../services/recipeService';
import { normalizePersian } from '../../utils/text';
import DishEditor from './DishEditor';

const AUDIT_STORAGE_KEY = 'noosh-admin-recipe-quantity-audit-v1';
interface ReviewWork { reviewedIds: string[]; editedDishes: Record<string, Dish> }
const emptyWork: ReviewWork = { reviewedIds: [], editedDishes: {} };

const readWork = (): ReviewWork => {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) || 'null');
    if (!saved || !Array.isArray(saved.reviewedIds) || !saved.editedDishes || typeof saved.editedDishes !== 'object') return emptyWork;
    return { reviewedIds: saved.reviewedIds.filter((id: unknown): id is string => typeof id === 'string'), editedDishes: saved.editedDishes as Record<string, Dish> };
  } catch { return emptyWork; }
};

const fa = (value: number) => Number.isFinite(value) ? value.toLocaleString('fa-IR', { maximumFractionDigits: 3 }) : '—';

export default function RecipeAuditQueue() {
  const [dishes, setDishes] = useState<Dish[]>(() => RecipeService.getCatalogDishes());
  const [publishedReviewIds, setPublishedReviewIds] = useState<string[]>(() => RecipeService.getQuantityReviewedDishIds());
  const [work, setWork] = useState<ReviewWork>(readWork);
  const [query, setQuery] = useState('');
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCheckingDeployment, setIsCheckingDeployment] = useState(false);
  const [publishReceipt, setPublishReceipt] = useState<{ commit: string; revision: string; deployed: boolean } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => {
      setDishes(RecipeService.getCatalogDishes());
      setPublishedReviewIds(RecipeService.getQuantityReviewedDishIds());
    };
    window.addEventListener('recipes-updated', refresh);
    return () => window.removeEventListener('recipes-updated', refresh);
  }, []);

  const reviewedSet = useMemo(() => new Set([...publishedReviewIds, ...work.reviewedIds]), [publishedReviewIds, work.reviewedIds]);
  const pendingDishes = useMemo(() => {
    const needle = normalizePersian(query).trim();
    return dishes
      .filter(dish => !reviewedSet.has(dish.id))
      .map(dish => work.editedDishes[dish.id] || dish)
      .filter(dish => !needle || normalizePersian(`${dish.name} ${dish.nationality || ''} ${dish.description || ''} ${(dish.ingredients || []).map(item => item.item).join(' ')}`).includes(needle));
  }, [dishes, reviewedSet, query, work.editedDishes]);
  const selectedDish = pendingDishes.find(dish => dish.id === selectedDishId) || null;
  const newReviewedIds = work.reviewedIds.filter(id => !publishedReviewIds.includes(id));
  const reviewedEditCount = Object.keys(work.editedDishes).filter(id => newReviewedIds.includes(id)).length;
  const completedCount = new Set([...publishedReviewIds, ...work.reviewedIds]).size;
  const progress = dishes.length ? Math.min(100, Math.round(completedCount / dishes.length * 100)) : 0;

  const persistWork = (next: ReviewWork) => {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(next));
      setWork(next);
      return true;
    } catch {
      setMessage('ذخیرهٔ صف ممیزی روی این دستگاه انجام نشد؛ فضای ذخیره‌سازی مرورگر را بررسی کن.');
      return false;
    }
  };

  const advanceFrom = (dishId: string) => {
    const currentIndex = pendingDishes.findIndex(dish => dish.id === dishId);
    const nextDish = pendingDishes[currentIndex + 1] || pendingDishes[currentIndex - 1];
    setSelectedDishId(nextDish?.id || null);
  };

  const approveDish = (dish: Dish, edited?: Dish): boolean => {
    const next: ReviewWork = {
      reviewedIds: [...new Set([...work.reviewedIds, dish.id])],
      editedDishes: edited ? { ...work.editedDishes, [dish.id]: edited } : work.editedDishes,
    };
    if (!persistWork(next)) return false;
    setMessage(edited ? `ویرایش «${dish.name}» ذخیره و برای انتشار آماده شد.` : `«${dish.name}» تأیید شد و از صف بازبینی کنار رفت.`);
    advanceFrom(dish.id);
    return true;
  };

  const publishApproved = async () => {
    if (!newReviewedIds.length || isPublishing) return;
    setIsPublishing(true);
    setPublishReceipt(null);
    setMessage('در حال ثبت همهٔ تأییدها و ویرایش‌ها در GitHub…');
    const edits = Object.keys(work.editedDishes).map(id => work.editedDishes[id]).filter(dish => newReviewedIds.includes(dish.id));
    const result = await RecipeService.publishRecipeAuditBatch(newReviewedIds, edits);
    if (result.success) {
      const remainingEdits = { ...work.editedDishes };
      for (const id of newReviewedIds) delete remainingEdits[id];
      const next: ReviewWork = { reviewedIds: work.reviewedIds.filter(id => !newReviewedIds.includes(id)), editedDishes: remainingEdits };
      persistWork(next);
      setPublishedReviewIds(RecipeService.getQuantityReviewedDishIds());
      setDishes(RecipeService.getCatalogDishes());
      if (result.commit && result.revision) {
        setPublishReceipt({ commit: result.commit, revision: result.revision, deployed: Boolean(result.deployed) });
        setMessage(`${newReviewedIds.length.toLocaleString('fa-IR')} رسپی در GitHub ثبت شد. Netlify در حال انتشار است و پنل به‌صورت خودکار سایت زنده را برای تأیید همین نسخه بررسی می‌کند.`);
        setIsCheckingDeployment(true);
        void confirmRecipeCatalogDeployment(result.revision).then(deployed => {
          setPublishReceipt(current => current ? { ...current, deployed } : current);
          setMessage(deployed
            ? 'تأیید نهایی: تغییرات در GitHub ثبت شد و فایل رسپی‌های سایت زندهٔ Netlify با همان نسخه تطبیق داده شد.'
            : 'GitHub ثبت را تأیید کرده است؛ Netlify هنوز نسخهٔ تازه را ارائه نکرده. از دکمهٔ بررسی دوبارهٔ انتشار استفاده کن.');
        }).finally(() => setIsCheckingDeployment(false));
      } else {
        setMessage('ثبت در GitHub تأیید نشد؛ صف تأییدها و ویرایش‌ها روی این دستگاه حفظ شد.');
      }
    } else setMessage(result.error || 'انتشار انجام نشد؛ صف تأییدها و ویرایش‌ها روی همین دستگاه حفظ شد.');
    setIsPublishing(false);
  };

  const checkDeploymentAgain = async () => {
    if (!publishReceipt || isCheckingDeployment) return;
    setIsCheckingDeployment(true);
    setMessage('در حال بررسی فایل زندهٔ رسپی‌ها در Netlify…');
    const deployed = await confirmRecipeCatalogDeployment(publishReceipt.revision);
    setPublishReceipt(current => current ? { ...current, deployed } : current);
    setMessage(deployed
      ? 'تأیید شد: نسخهٔ دارای همین تغییرات از سایت زندهٔ Netlify دریافت شد.'
      : 'GitHub ثبت را تأیید کرده است؛ Netlify هنوز همین نسخه را ارائه نمی‌کند. چند دقیقهٔ دیگر دوباره بررسی کن.');
    setIsCheckingDeployment(false);
  };

  return <section className="space-y-5 rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-emerald-950/5 sm:p-7" dir="rtl">
    <header className="rounded-3xl bg-[#173c2b] p-5 text-white sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-black text-[#e1c46d]"><Utensils size={18}/> ممیزی کارت‌به‌کارت رسپی‌ها</div>
          <h2 className="mt-2 text-xl font-black sm:text-2xl">هر رسپی را ببین، بررسی کن و تأیید کن</h2>
          <p className="mt-2 text-xs leading-6 text-emerald-50/80">تأیید و ویرایش‌ها ابتدا فقط روی این دستگاه در صف می‌مانند. وقتی خواستی، همهٔ تأییدهای همان نوبت را یک‌جا به GitHub می‌فرستیم تا Netlify منتشر کند. چیزی که هنوز تأیید نکرده‌ای از صف حذف نمی‌شود.</p>
        </div>
        <button type="button" onClick={() => void publishApproved()} disabled={!newReviewedIds.length || isPublishing} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#d7b45a] px-5 py-3 text-sm font-black text-[#173c2b] shadow-lg transition hover:bg-[#e7c96f] disabled:cursor-not-allowed disabled:opacity-45">
          {isPublishing ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} انتشار تأییدها ({fa(newReviewedIds.length)})
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/10 p-3"><span className="block text-[10px] font-bold text-emerald-100/70">در صف بازبینی</span><strong className="mt-1 block text-xl">{fa(dishes.length - completedCount)}</strong></div>
        <div className="rounded-2xl bg-white/10 p-3"><span className="block text-[10px] font-bold text-emerald-100/70">تأییدهای منتشرنشده</span><strong className="mt-1 block text-xl">{fa(newReviewedIds.length)}</strong><small className="text-[10px] text-emerald-100/75">{fa(reviewedEditCount)} مورد ویرایش شده</small></div>
        <div className="rounded-2xl bg-white/10 p-3"><span className="block text-[10px] font-bold text-emerald-100/70">پیشرفت کل</span><strong className="mt-1 block text-xl">{fa(progress)}٪</strong><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#d7b45a] transition-all" style={{ width: `${progress}%` }}/></div></div>
      </div>
    </header>

    {message && <p role="status" aria-live="polite" className={`rounded-xl px-4 py-3 text-sm font-bold leading-6 ${message.includes('انجام نشد') || message.includes('نشد؛') || message.includes('هنوز') || message.includes('ارائه نکرد') ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>{message}</p>}
    {publishReceipt && <section aria-live="polite" className={`rounded-2xl border p-4 ${publishReceipt.deployed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={`font-black ${publishReceipt.deployed ? 'text-emerald-950' : 'text-amber-950'}`}>{publishReceipt.deployed ? 'انتشار در هر دو مقصد تأیید شد' : 'ثبت GitHub تأیید شد؛ بررسی Netlify ادامه دارد'}</h3>
          <p className="mt-1 text-xs leading-6 text-slate-700">GitHub commit: <code dir="ltr" className="rounded bg-white/70 px-1.5 py-0.5">{publishReceipt.commit.slice(0, 12)}</code> · {publishReceipt.deployed ? 'فایل زندهٔ سایت با همین نسخه تطبیق داده شد.' : 'هنوز نسخهٔ حاوی این تغییرات از سایت زنده دریافت نشده است.'}</p>
        </div>
        {!publishReceipt.deployed && <button type="button" onClick={() => void checkDeploymentAgain()} disabled={isCheckingDeployment} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#276556] px-4 text-xs font-black text-white disabled:opacity-60">{isCheckingDeployment && <Loader2 size={15} className="animate-spin"/>}{isCheckingDeployment ? 'در حال بررسی…' : 'بررسی دوبارهٔ انتشار'}</button>}
      </div>
    </section>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs leading-6 text-slate-500">فهرست بدون دسته‌بندی آمده است؛ کارت را باز کن تا عکس، مواد و مقدارها، مراحل و سایر اطلاعات کامل نمایش داده شوند.</p>
      <label className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-50 px-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#276556]/30"><Search size={16} className="text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجو برای رفتن به یک رسپی" className="min-w-0 bg-transparent text-sm outline-none sm:w-56"/></label>
    </div>

    {pendingDishes.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {pendingDishes.map((dish, index) => <article key={dish.id} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 bg-[#fcfdfb] p-3 transition hover:border-emerald-300 hover:shadow-md">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50 text-[#276556]"><ImageIcon className="absolute inset-0 m-auto" size={23}/>{dish.imageUrl && <img src={dish.imageUrl} alt={dish.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }}/>}</div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2"><div className="min-w-0"><h3 className="line-clamp-2 text-sm font-black leading-6 text-slate-900">{dish.name}</h3><p className="mt-1 truncate text-[10px] font-semibold text-slate-500">{CATEGORY_LABELS[dish.category] || dish.category}{dish.nationality ? ` · ${dish.nationality}` : ''}</p><p className="mt-1 text-[10px] text-slate-500">{fa(dish.ingredients?.length || 0)} ماده · {fa(dish.recipeSteps?.length || 0)} مرحله · نفرات پایه {fa(dish.servings || 4)}</p></div><button type="button" onClick={() => setSelectedDishId(dish.id)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-black text-[#276556] transition hover:bg-[#276556] hover:text-white">بازبینی رسپی <span className="text-[10px] opacity-65">{fa(index + 1)} از {fa(pendingDishes.length)}</span></button></div>
      </article>)}
    </div> : <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/60 px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#276556]"><Check size={27}/></span><h3 className="mt-4 text-lg font-black text-emerald-950">همهٔ رسپی‌ها بازبینی و تأیید شده‌اند</h3><p className="mt-2 text-sm leading-6 text-emerald-900/70">اگر تأییدهای منتشرنشده داری، دکمهٔ انتشار بالای این بخش آن‌ها را در دسترس همه قرار می‌دهد.</p></div>}

    {selectedDish && <div className="fixed inset-0 z-[9900] grid place-items-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedDishId(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="recipe-audit-dialog-title" className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[#f5f7f2] shadow-2xl sm:max-h-[92dvh] sm:rounded-[2rem]">
        <header className="flex shrink-0 items-center justify-between gap-3 bg-[#173c2b] px-4 py-3 text-white sm:px-6"><div className="min-w-0"><p className="text-[10px] font-bold text-[#e1c46d]">بازبینی تک‌به‌تک</p><h2 id="recipe-audit-dialog-title" className="truncate text-base font-black sm:text-xl">{selectedDish.name}</h2></div><button type="button" onClick={() => setSelectedDishId(null)} aria-label="بستن بازبینی" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><X size={20}/></button></header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:space-y-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(240px,.85fr)]">
            <div className="relative min-h-48 overflow-hidden rounded-2xl bg-emerald-50 sm:min-h-64"><div className="absolute inset-0 grid place-items-center text-[#276556]"><ImageIcon size={40}/></div>{selectedDish.imageUrl && <img src={selectedDish.imageUrl} alt={selectedDish.name} className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }}/>}</div>
            <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-black text-slate-900">مشخصات رسپی</h3><p className="mt-2 text-sm leading-7 text-slate-600">{selectedDish.description || 'توضیحی ثبت نشده است.'}</p><div className="mt-3 flex flex-wrap gap-2">{[[Utensils,CATEGORY_LABELS[selectedDish.category] || selectedDish.category],[Globe2,selectedDish.nationality || 'کشور ثبت نشده'],[Users,`${fa(selectedDish.servings || 4)} نفر`],[Clock3,selectedDish.cookTime ? `${fa(selectedDish.cookTime)} دقیقه` : 'زمان ثبت نشده']].map(([Icon,label], idx) => <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-900">{React.createElement(Icon as React.ComponentType<{size?:number}>, {size:13})}{label as string}</span>)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p className="rounded-xl bg-slate-50 p-2.5"><b>کالری:</b> {selectedDish.calories ? `${fa(selectedDish.calories)} کیلوکالری` : 'ثبت نشده'}</p><p className="rounded-xl bg-slate-50 p-2.5"><b>سختی:</b> {selectedDish.difficulty || 'ثبت نشده'}</p><p className="rounded-xl bg-slate-50 p-2.5"><b>طبع:</b> {selectedDish.natureLabel || selectedDish.nature || 'ثبت نشده'}</p><p className="rounded-xl bg-slate-50 p-2.5"><b>مصلح:</b> {selectedDish.mosleh || 'ثبت نشده'}</p></div></section>
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><h3 className="font-black text-slate-900">مواد لازم خام · {fa(selectedDish.servings || 4)} نفر</h3><span className="text-[10px] text-slate-500">{fa(selectedDish.ingredients?.length || 0)} قلم</span></div><div className="divide-y divide-slate-100">{(selectedDish.ingredients || []).map((ingredient, index) => <div key={`${ingredient.item}-${index}`} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 text-sm"><span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-[10px] font-black text-[#276556]">{fa(index + 1)}</span><span className="min-w-0 font-bold text-slate-800">{ingredient.item}</span><span className="text-left font-black text-emerald-900" dir="auto">{ingredient.unit === 'به میزان لازم' || ingredient.unit === 'به مقدار لازم' ? 'به میزان لازم' : `${fa(ingredient.amount)} ${ingredient.unit || 'بدون واحد'}`}</span></div>)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-black text-slate-900">مراحل پخت</h3><ol className="mt-3 space-y-2.5">{(selectedDish.recipeSteps || []).map((step, index) => <li key={index} className="flex gap-3 text-sm leading-7 text-slate-700"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#173c2b] text-[10px] font-black text-white">{fa(index + 1)}</span><span>{step}</span></li>)}</ol></section>
        </div>
        <footer className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2"><button type="button" aria-label="رسپی قبلی" title="رسپی قبلی" onClick={() => { const index = pendingDishes.findIndex(dish => dish.id === selectedDish.id); if (index > 0) setSelectedDishId(pendingDishes[index - 1].id); }} disabled={pendingDishes.findIndex(dish => dish.id === selectedDish.id) <= 0} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 disabled:opacity-35"><ChevronRight size={18}/></button><button type="button" aria-label="رسپی بعدی" title="رسپی بعدی" onClick={() => { const index = pendingDishes.findIndex(dish => dish.id === selectedDish.id); if (index >= 0 && index < pendingDishes.length - 1) setSelectedDishId(pendingDishes[index + 1].id); }} disabled={pendingDishes.findIndex(dish => dish.id === selectedDish.id) >= pendingDishes.length - 1} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 disabled:opacity-35"><ChevronLeft size={18}/></button><span className="text-[10px] font-bold text-slate-500">{fa(pendingDishes.findIndex(dish => dish.id === selectedDish.id) + 1)} از {fa(pendingDishes.length)}</span></div>
          <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => setEditingDish(selectedDish)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-black text-[#276556] hover:bg-emerald-50"><Pencil size={15}/> ویرایش و تأیید</button><button type="button" onClick={() => approveDish(selectedDish)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#276556] px-5 py-2 text-xs font-black text-white shadow-md hover:bg-[#1d4f43]"><PackageCheck size={16}/> تأیید و رفتن به بعدی</button></div>
        </footer>
      </section>
    </div>}
    {editingDish && <DishEditor dish={editingDish} saveMode="draft" onClose={() => setEditingDish(null)} onSave={edited => edited ? approveDish(edited, edited) : false}/ >}
  </section>;
}
