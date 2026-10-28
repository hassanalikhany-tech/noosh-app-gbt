import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dish, Ingredient, PersonalRecipeEdit } from '../types';

interface Props {
  dish: Dish;
  initial?: PersonalRecipeEdit;
  onSave: (edit: PersonalRecipeEdit) => Promise<void>;
  onClose: () => void;
}

const PersonalRecipeEditModal: React.FC<Props> = ({ dish, initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? dish.name);
  const [description, setDescription] = useState(initial?.description ?? dish.description ?? '');
  const [servings, setServings] = useState(String(initial?.servings ?? dish.servings ?? 4));
  const [cookTime, setCookTime] = useState(String(initial?.cookTime ?? dish.cookTime ?? 30));
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => (initial?.ingredients ?? dish.ingredients).map(item => ({ ...item })));
  const [steps, setSteps] = useState<string[]>(() => [...(initial?.recipeSteps ?? dish.recipeSteps)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [busy, onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || ingredients.length === 0 || ingredients.some(item => !item.item.trim() || !item.unit.trim() || !Number.isFinite(item.amount) || item.amount < 0) || steps.some(step => !step.trim())) {
      setError('نام غذا، مواد لازم با مقدار و واحد، و مراحل پخت را کامل کن.'); return;
    }
    setBusy(true); setError('');
    try {
      await onSave({ name: name.trim(), description: description.trim(), servings: Math.min(20, Math.max(1, Number(servings) || 4)), cookTime: Math.min(1440, Math.max(1, Number(cookTime) || 30)), ingredients: ingredients.map(item => ({ ...item, item: item.item.trim(), unit: item.unit.trim() })), recipeSteps: steps.map(step => step.trim()) });
      onClose();
    } catch { setError('ذخیره انجام نشد؛ دوباره تلاش کن.'); }
    finally { setBusy(false); }
  };

  return createPortal(<div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-6" onClick={event => event.stopPropagation()} onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="personal-recipe-edit-title" className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-4 border-b border-emerald-100 bg-emerald-50 px-5 py-4 sm:px-7"><div><h2 id="personal-recipe-edit-title" className="text-lg font-black text-[#184d40]">ویرایش نسخهٔ شخصی رسپی</h2><p className="mt-1 text-xs font-bold text-slate-600">تغییرات فقط روی همین دستگاه ذخیره می‌شود؛ رسپی اصلی برای دیگران ثابت می‌ماند.</p></div><button type="button" onClick={onClose} disabled={busy} className="min-h-10 rounded-xl px-3 font-bold text-slate-600 hover:bg-white">بستن</button></header>
      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">نام غذا<input value={name} onChange={event => setName(event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#276556]" /></label><label className="text-sm font-bold text-slate-700">تعداد نفرات پایه<input type="number" min="1" max="20" value={servings} onChange={event => setServings(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#276556]" /></label><label className="text-sm font-bold text-slate-700">زمان پخت (دقیقه)<input type="number" min="1" max="1440" value={cookTime} onChange={event => setCookTime(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#276556]" /></label><label className="text-sm font-bold text-slate-700 sm:col-span-2">توضیح کوتاه<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={10000} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#276556]" /></label></div>
        <section><div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-800">مواد لازم</h3><button type="button" onClick={() => setIngredients(list => [...list, { item: '', amount: 1, unit: 'عدد' }])} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-[#276556]">+ افزودن ماده</button></div><div className="space-y-2">{ingredients.map((ingredient, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_90px_110px_40px] gap-2"><input aria-label={`نام ماده ${index + 1}`} value={ingredient.item} onChange={event => setIngredients(list => list.map((item, i) => i === index ? { ...item, item: event.target.value } : item))} placeholder="نام ماده" className="min-w-0 rounded-xl border border-slate-200 p-2.5 text-sm" /><input aria-label={`مقدار ماده ${index + 1}`} type="number" min="0" step="any" value={ingredient.amount} onChange={event => setIngredients(list => list.map((item, i) => i === index ? { ...item, amount: Number(event.target.value) } : item))} className="min-w-0 rounded-xl border border-slate-200 p-2.5 text-sm" /><input aria-label={`واحد ماده ${index + 1}`} value={ingredient.unit} onChange={event => setIngredients(list => list.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} placeholder="واحد" className="min-w-0 rounded-xl border border-slate-200 p-2.5 text-sm" /><button type="button" aria-label={`حذف ${ingredient.item || 'ماده'}`} onClick={() => setIngredients(list => list.filter((_, i) => i !== index))} className="rounded-xl bg-rose-50 font-black text-rose-700">×</button></div>)}</div></section>
        <section><div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-800">مراحل پخت</h3><button type="button" onClick={() => setSteps(list => [...list, ''])} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-[#276556]">+ افزودن مرحله</button></div><div className="space-y-2">{steps.map((step, index) => <div key={index} className="flex gap-2"><span className="flex h-11 w-8 shrink-0 items-center justify-center font-black text-[#276556]">{index + 1}</span><textarea aria-label={`مرحله ${index + 1}`} value={step} onChange={event => setSteps(list => list.map((item, i) => i === index ? event.target.value : item))} rows={2} className="min-w-0 flex-1 rounded-xl border border-slate-200 p-2.5 text-sm" /><button type="button" aria-label={`حذف مرحله ${index + 1}`} onClick={() => setSteps(list => list.filter((_, i) => i !== index))} className="w-10 rounded-xl bg-rose-50 font-black text-rose-700">×</button></div>)}</div></section>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-100 p-4 sm:px-7"><button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-xl px-4 font-bold text-slate-600">انصراف</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-[#276556] px-5 font-black text-white disabled:opacity-60">{busy ? 'در حال ذخیره…' : 'ذخیرهٔ نسخهٔ شخصی'}</button></footer>
    </form>
  </div>, document.body);
};

export default PersonalRecipeEditModal;
