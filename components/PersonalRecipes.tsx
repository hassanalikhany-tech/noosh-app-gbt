import React, { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ChefHat, Clock3, Flame, ImagePlus, Pencil, Plus, Trash2, Utensils, X } from 'lucide-react';
import { CATEGORY_LABELS, Dish, DishCategory, Ingredient, NatureType, UserProfile } from '../types';
import { RecipeService } from '../services/recipeService';
import RecipeModal from './RecipeModal';
import { useDialogFocus } from '../utils/useDialogFocus';

type RecipeDraft = Omit<Dish, 'id' | 'isPersonal'>;

const UNITS = ['گرم', 'کیلوگرم', 'عدد', 'قاشق غذاخوری', 'قاشق چای‌خوری', 'پیمانه', 'لیوان', 'لیتر', 'میلی‌لیتر', 'حبه', 'بسته', 'برگ', 'ساقه', 'به مقدار لازم'];
const EMPTY_DRAFT: RecipeDraft = {
  name: '', category: 'khorak', description: '', ingredients: [{ item: '', amount: 1, unit: 'عدد' }], recipeSteps: [''],
  servings: 4, cookTime: 30, calories: 0, difficulty: 'متوسط', nature: 'balanced', natureLabel: 'معتدل', mosleh: '', nationality: '', imageUrl: ''
};

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('خواندن عکس ممکن نشد.'));
  reader.onerror = () => reject(new Error('خواندن عکس ممکن نشد.'));
  reader.readAsDataURL(file);
});

const compressImage = async (file: File): Promise<string> => {
  const source = await readAsDataUrl(file);
  const image = new Image();
  image.src = source;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('فایل انتخاب‌شده عکس معتبری نیست.')); });
  const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL('image/webp', 0.82);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.84);
};

const PersonalRecipes: React.FC<{ user: UserProfile; onUpdateUser: (user: UserProfile) => void }> = ({ user, onUpdateUser }) => {
  const [recipes, setRecipes] = useState<Dish[]>(() => RecipeService.getPersonalDishes());
  const [draftDish, setDraftDish] = useState<Dish | null | 'new'>(null);
  const [viewing, setViewing] = useState<Dish | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => setRecipes(RecipeService.getPersonalDishes());
    window.addEventListener('recipes-updated', refresh);
    return () => window.removeEventListener('recipes-updated', refresh);
  }, []);

  const sortedRecipes = useMemo(() => [...recipes].sort((a, b) => a.name.localeCompare(b.name, 'fa')), [recipes]);

  const remove = async (dish: Dish) => {
    if (!window.confirm(`رسپی «${dish.name}» از این دستگاه حذف شود؟`)) return;
    try {
      await RecipeService.deletePersonalDish(dish.id);
      setMessage(`رسپی «${dish.name}» حذف شد.`);
    } catch {
      setMessage('حذف انجام نشد؛ فضای ذخیره‌سازی دستگاه را بررسی کن.');
    }
  };

  return <>
    <section className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-7" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><ChefHat size={22}/></div>
          <div>
            <h2 className="text-base font-black text-slate-900 sm:text-lg">رسپی‌های مخصوص من</h2>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-600">رسپی و عکس‌ها فقط روی همین دستگاه ذخیره می‌شوند و در جستجو، برنامه‌ریزی و پیشنهاد غذا در دسترس‌اند. برای جلوگیری از ازدست‌رفتنشان، هر از گاهی فایل پشتیبان بگیر.</p>
          </div>
        </div>
        <button type="button" onClick={() => setDraftDish('new')} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#276556] px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-[#347866]"><Plus size={18}/> افزودن رسپی شخصی</button>
      </div>

      <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-6 text-slate-500">پشتیبان رسپی‌ها و عکس‌هایشان از بخش «تنظیمات شما روی همین دستگاه» در بالای این صفحه گرفته و بازیابی می‌شود.</p>

      {message && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">{message}</p>}
      {sortedRecipes.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sortedRecipes.map(dish => <article key={dish.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-[#fbfcfb] p-3">
          <button type="button" onClick={() => setViewing(dish)} className="flex min-w-0 flex-1 items-center gap-3 text-right">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-800">{dish.imageUrl ? <img src={dish.imageUrl} alt="" className="h-full w-full object-cover"/> : <Utensils size={23}/>}</span>
            <span className="min-w-0"><strong className="block truncate text-sm font-black text-slate-800">{dish.name}</strong><small className="mt-1 block text-[11px] text-slate-500">{CATEGORY_LABELS[dish.category]} · {dish.recipeSteps.length.toLocaleString('fa-IR')} مرحله</small></span>
          </button>
          <button type="button" aria-label={`ویرایش ${dish.name}`} onClick={() => setDraftDish(dish)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-800 ring-1 ring-slate-200 hover:bg-emerald-50"><Pencil size={16}/></button>
          <button type="button" aria-label={`حذف ${dish.name}`} onClick={() => void remove(dish)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-rose-600 ring-1 ring-slate-200 hover:bg-rose-50"><Trash2 size={16}/></button>
        </article>)}
      </div> : <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-xs leading-6 text-slate-500">هنوز رسپی شخصی نساخته‌ای. رسپی‌هایت را اضافه کن تا در جستجو و برنامه‌ریزی همراه بقیهٔ غذاها نمایش داده شوند.</p>}
    </section>

    {draftDish !== null && <RecipeEditor key={draftDish === 'new' ? 'new-recipe' : draftDish.id} initial={draftDish === 'new' ? null : draftDish} onClose={() => setDraftDish(null)} onSave={async dish => {
      try { await RecipeService.savePersonalDish(dish); setDraftDish(null); setMessage(`رسپی «${dish.name}» روی همین دستگاه ذخیره شد و به فهرست غذاها اضافه شد.`); }
      catch (error) { throw error instanceof Error ? error : new Error('رسپی ذخیره نشد؛ فضای دستگاه را بررسی کن.'); }
    }}/>} 
    {viewing && <RecipeModal dish={viewing} isOpen onClose={() => setViewing(null)} user={user} onUpdateUser={onUpdateUser}/>}
  </>;
};

const RecipeEditor: React.FC<{ initial: Dish | null; onClose: () => void; onSave: (dish: Dish) => Promise<void> }> = ({ initial, onClose, onSave }) => {
  const [draft, setDraft] = useState<RecipeDraft>(() => initial ? {
    name: initial.name, category: initial.category, description: initial.description, ingredients: initial.ingredients.map(item => ({ ...item })), recipeSteps: [...initial.recipeSteps],
    imageUrl: initial.imageUrl || '', nationality: initial.nationality || '', nature: initial.nature || 'balanced', natureLabel: initial.natureLabel || 'معتدل', mosleh: initial.mosleh || '',
    calories: initial.calories || 0, cookTime: initial.cookTime || 30, difficulty: initial.difficulty || 'متوسط', servings: initial.servings || 4
  } : { ...EMPTY_DRAFT, ingredients: EMPTY_DRAFT.ingredients.map(item => ({ ...item })), recipeSteps: [...EMPTY_DRAFT.recipeSteps] });
  const [imageBusy, setImageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus(onClose);

  const change = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const changeIngredient = (index: number, updates: Partial<Ingredient>) => change('ingredients', draft.ingredients.map((item, i) => i === index ? { ...item, ...updates } : item));
  const changeStep = (index: number, value: string) => change('recipeSteps', draft.recipeSteps.map((step, i) => i === index ? value : step));

  const loadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('فقط فایل عکس قابل استفاده است.'); return; }
    setImageBusy(true); setError('');
    try { change('imageUrl', await compressImage(file)); }
    catch (imageError) { setError(imageError instanceof Error ? imageError.message : 'عکس بارگذاری نشد.'); }
    finally { setImageBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    const ingredients = draft.ingredients.map(item => ({ ...item, item: item.item.trim(), unit: item.unit.trim() })).filter(item => item.item);
    const recipeSteps = draft.recipeSteps.map(step => step.trim()).filter(Boolean);
    if (!draft.name.trim()) { setError('نام غذا را وارد کن.'); return; }
    if (!ingredients.length) { setError('دست‌کم یک مادهٔ لازم برای رسپی ثبت کن.'); return; }
    if (!recipeSteps.length) { setError('دست‌کم یک مرحلهٔ پخت ثبت کن.'); return; }
    const dish: Dish = {
      id: initial?.id || `personal-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`,
      isPersonal: true, name: draft.name.trim(), category: draft.category, description: draft.description.trim(), ingredients, recipeSteps,
      imageUrl: draft.imageUrl || undefined, nationality: draft.nationality?.trim() || undefined,
      nature: draft.nature as NatureType, natureLabel: draft.natureLabel, mosleh: draft.mosleh?.trim() || undefined,
      calories: Number(draft.calories) || 0, cookTime: Number(draft.cookTime) || 0,
      difficulty: draft.difficulty?.trim() || 'متوسط', servings: Math.max(1, Number(draft.servings) || 4), hasRealData: true
    };
    setSaving(true);
    try { await onSave(dish); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'رسپی ذخیره نشد؛ فضای دستگاه را بررسی کن.'); }
    finally { setSaving(false); }
  };

  return createPortal(<div className="fixed inset-0 z-[15000] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="personal-recipe-title" onClick={event => event.stopPropagation()} className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[26px] bg-[#f8faf8] text-slate-800 shadow-2xl outline-none sm:max-h-[92dvh] sm:rounded-[26px]">
      <header className="flex shrink-0 items-center justify-between border-b border-emerald-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div><h2 id="personal-recipe-title" className="font-black text-slate-900">{initial ? 'ویرایش رسپی شخصی' : 'ثبت رسپی شخصی'}</h2><p className="mt-1 text-[11px] text-slate-500">این اطلاعات فقط در همین دستگاه ذخیره می‌شود.</p></div>
        <button type="button" aria-label="بستن فرم رسپی" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><X size={19}/></button>
      </header>
      <form onSubmit={event => void submit(event)} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">نام غذا *<input required maxLength={120} value={draft.name} onChange={event => change('name', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500" placeholder="مثلاً آش دوغ مادربزرگ"/></label>
          <label className="text-xs font-bold text-slate-700">دسته‌بندی<select value={draft.category} onChange={event => change('category', event.target.value as DishCategory)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500">{(Object.keys(CATEGORY_LABELS) as DishCategory[]).map(category => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">توضیح کوتاه<textarea maxLength={500} value={draft.description} onChange={event => change('description', event.target.value)} rows={2} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 outline-none focus:border-emerald-500" placeholder="طعم، ویژگی یا داستان این غذا"/></label>
          <label className="text-xs font-bold text-slate-700">کشور یا منطقه<input maxLength={80} value={draft.nationality || ''} onChange={event => change('nationality', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500" placeholder="اختیاری"/></label>
          <label className="text-xs font-bold text-slate-700">تعداد نفرات رسپی<input type="number" min="1" max="100" value={draft.servings || 4} onChange={event => change('servings', Number(event.target.value))} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"/></label>
          <label className="text-xs font-bold text-slate-700">زمان پخت (دقیقه)<span className="relative mt-1.5 block"><Clock3 size={16} className="absolute right-3 top-3 text-slate-400"/><input type="number" min="0" max="1440" value={draft.cookTime || 0} onChange={event => change('cookTime', Number(event.target.value))} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-emerald-500"/></span></label>
          <label className="text-xs font-bold text-slate-700">کالری هر نفر (اختیاری)<span className="relative mt-1.5 block"><Flame size={16} className="absolute right-3 top-3 text-amber-500"/><input type="number" min="0" max="10000" value={draft.calories || 0} onChange={event => change('calories', Number(event.target.value))} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-emerald-500"/></span></label>
          <label className="text-xs font-bold text-slate-700">سختی<select value={draft.difficulty || 'متوسط'} onChange={event => change('difficulty', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option>آسان</option><option>متوسط</option><option>سخت</option></select></label>
          <label className="text-xs font-bold text-slate-700">طبع غذا<select value={draft.nature || 'balanced'} onChange={event => { const nature = event.target.value as NatureType; change('nature', nature); change('natureLabel', nature === 'hot' ? 'گرم' : nature === 'cold' ? 'سرد' : 'معتدل'); }} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="balanced">معتدل</option><option value="hot">گرم</option><option value="cold">سرد</option></select></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">مصلح<input maxLength={120} value={draft.mosleh || ''} onChange={event => change('mosleh', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500" placeholder="مثلاً آب‌لیمو یا ماست (اختیاری)"/></label>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-800">عکس غذا</h3><p className="mt-1 text-[10px] leading-5 text-slate-500">عکس کوچک‌سازی می‌شود و همراه رسپی روی دستگاه می‌ماند.</p></div><div className="flex gap-2"><input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => void loadImage(event)}/><input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={event => void loadImage(event)}/><button type="button" disabled={imageBusy} onClick={() => cameraRef.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-[11px] font-bold text-emerald-900 disabled:opacity-50"><Camera size={15}/> عکس بگیر</button><button type="button" disabled={imageBusy} onClick={() => galleryRef.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[11px] font-bold text-slate-700 disabled:opacity-50"><ImagePlus size={15}/> انتخاب عکس</button></div></div>
          {imageBusy && <p role="status" className="mt-3 text-xs text-emerald-800">در حال آماده‌سازی عکس…</p>}
          {draft.imageUrl && <div className="mt-3 flex items-center gap-3"><img src={draft.imageUrl} alt="پیش‌نمایش غذای رسپی" className="h-24 w-32 rounded-xl object-cover"/><button type="button" onClick={() => change('imageUrl', '')} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">حذف عکس</button></div>}
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-800">مواد لازم</h3><p className="mt-1 text-[10px] text-slate-500">مقدار، واحد رایج و نام هر ماده را وارد کن.</p></div><button type="button" onClick={() => change('ingredients', [...draft.ingredients, { item: '', amount: 1, unit: 'عدد' }])} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-900"><Plus size={15}/> ماده</button></div>
          <div className="mt-3 space-y-2">{draft.ingredients.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_74px_124px_38px] gap-1.5 sm:grid-cols-[minmax(0,1fr)_100px_160px_40px]">
            <input aria-label={`نام مادهٔ لازم ${index + 1}`} value={item.item} onChange={event => changeIngredient(index, { item: event.target.value })} placeholder="نام مادهٔ غذایی" className="min-h-10 min-w-0 rounded-lg border border-slate-200 px-2 text-xs outline-none focus:border-emerald-500"/>
            <input aria-label={`مقدار مادهٔ لازم ${index + 1}`} type="number" min="0" step="any" value={item.amount} onChange={event => changeIngredient(index, { amount: Number(event.target.value) })} className="min-h-10 min-w-0 rounded-lg border border-slate-200 px-1 text-center text-xs outline-none focus:border-emerald-500"/>
            <select aria-label={`واحد مادهٔ لازم ${index + 1}`} value={item.unit} onChange={event => changeIngredient(index, { unit: event.target.value })} className="min-h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-1 text-[10px] sm:text-xs">{UNITS.map(unit => <option key={unit}>{unit}</option>)}</select>
            <button type="button" aria-label={`حذف مادهٔ لازم ${index + 1}`} disabled={draft.ingredients.length <= 1} onClick={() => change('ingredients', draft.ingredients.filter((_, i) => i !== index))} className="grid min-h-10 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 size={15}/></button>
          </div>)}</div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-800">مراحل پخت</h3><p className="mt-1 text-[10px] text-slate-500">هر کار را در یک مرحله بنویس.</p></div><button type="button" onClick={() => change('recipeSteps', [...draft.recipeSteps, ''])} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-900"><Plus size={15}/> مرحله</button></div>
          <div className="mt-3 space-y-2">{draft.recipeSteps.map((step, index) => <div key={index} className="flex items-start gap-2"><span className="mt-3 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[10px] font-black text-emerald-900">{(index + 1).toLocaleString('fa-IR')}</span><textarea aria-label={`مرحلهٔ پخت ${index + 1}`} value={step} onChange={event => changeStep(index, event.target.value)} rows={2} placeholder="مثلاً پیاز را با کمی روغن تفت بده…" className="min-h-12 flex-1 resize-y rounded-lg border border-slate-200 p-2 text-xs leading-6 outline-none focus:border-emerald-500"/><button type="button" aria-label={`حذف مرحلهٔ ${index + 1}`} disabled={draft.recipeSteps.length <= 1} onClick={() => change('recipeSteps', draft.recipeSteps.filter((_, i) => i !== index))} className="mt-1 grid h-10 w-9 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 size={15}/></button></div>)}</div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-800">{error}</p>}
        <footer className="sticky bottom-0 mt-5 flex gap-2 border-t border-slate-100 bg-[#f8faf8]/95 py-3 backdrop-blur">
          <button type="submit" disabled={saving || imageBusy} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#276556] px-4 text-sm font-black text-white shadow-sm disabled:opacity-50">{saving ? 'در حال ذخیره…' : <><Utensils size={17}/> ذخیرهٔ رسپی روی این دستگاه</>}</button>
          <button type="button" onClick={onClose} className="min-h-12 rounded-xl bg-white px-5 text-sm font-bold text-slate-600 ring-1 ring-slate-200">انصراف</button>
        </footer>
      </form>
    </section>
  </div>, document.body);
};

export default PersonalRecipes;
