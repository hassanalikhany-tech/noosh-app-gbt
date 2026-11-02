import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Redo2, Undo2 } from 'lucide-react';
import { Dish, Ingredient, PersonalRecipeEdit } from '../types';

interface Props {
  dish: Dish;
  initial?: PersonalRecipeEdit;
  onSave: (edit: PersonalRecipeEdit) => Promise<void>;
  onClose: () => void;
}

interface DraftState {
  name: string;
  description: string;
  servings: string;
  cookTime: string;
  ingredients: Ingredient[];
  steps: string[];
}

interface EditHistory {
  past: DraftState[];
  future: DraftState[];
}

const HISTORY_LIMIT = 100;

const PersonalRecipeEditModal: React.FC<Props> = ({ dish, initial, onSave, onClose }) => {
  const [draft, setDraft] = useState<DraftState>(() => ({
    name: initial?.name ?? dish.name,
    description: initial?.description ?? dish.description ?? '',
    servings: String(initial?.servings ?? dish.servings ?? 4),
    cookTime: String(initial?.cookTime ?? dish.cookTime ?? 30),
    ingredients: (initial?.ingredients ?? dish.ingredients).map(item => ({ ...item })),
    steps: [...(initial?.recipeSteps ?? dish.recipeSteps)],
  }));
  const draftRef = useRef(draft);
  const historyRef = useRef<EditHistory>({ past: [], future: [] });
  const [, setHistoryVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const updateDraft = (update: (current: DraftState) => DraftState) => {
    const current = draftRef.current;
    const next = update(current);
    if (next === current) return;

    const history = historyRef.current;
    history.past.push(current);
    if (history.past.length > HISTORY_LIMIT) history.past.shift();
    history.future = [];
    draftRef.current = next;
    setDraft(next);
    setHistoryVersion(version => version + 1);
  };

  const undo = useCallback(() => {
    const history = historyRef.current;
    const previous = history.past.pop();
    if (!previous) return;
    history.future.push(draftRef.current);
    draftRef.current = previous;
    setDraft(previous);
    setHistoryVersion(version => version + 1);
  }, []);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const next = historyRef.current.future.pop();
    if (!next) return;
    history.past.push(draftRef.current);
    draftRef.current = next;
    setDraft(next);
    setHistoryVersion(version => version + 1);
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (busy) return;
      if (event.key === 'Escape') onClose();
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;

      const shortcut = event.key.toLowerCase();
      if (shortcut === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if (shortcut === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose, redo, undo]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !draft.name.trim() ||
      draft.ingredients.length === 0 ||
      draft.ingredients.some(item => !item.item.trim() || !item.unit.trim() || !Number.isFinite(item.amount) || item.amount < 0) ||
      draft.steps.some(step => !step.trim())
    ) {
      setError('نام غذا، مواد لازم با مقدار و واحد، و مراحل پخت را کامل کن.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSave({
        name: draft.name.trim(),
        description: draft.description.trim(),
        servings: Math.min(20, Math.max(1, Number(draft.servings) || 4)),
        cookTime: Math.min(1440, Math.max(1, Number(draft.cookTime) || 30)),
        ingredients: draft.ingredients.map(item => ({ ...item, item: item.item.trim(), unit: item.unit.trim() })),
        recipeSteps: draft.steps.map(step => step.trim()),
      });
      onClose();
    } catch {
      setError('ذخیره انجام نشد؛ دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-6"
      onClick={event => event.stopPropagation()}
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}
    >
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="personal-recipe-edit-title" className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="personal-recipe-edit-title" className="text-lg font-black text-[#184d40]">ویرایش نسخهٔ شخصی رسپی</h2>
              <p className="mt-1 text-xs font-bold text-slate-600">تغییرات فقط روی همین دستگاه ذخیره می‌شود؛ رسپی اصلی برای دیگران ثابت می‌ماند.</p>
            </div>
            <button type="button" onClick={onClose} disabled={busy} className="min-h-10 shrink-0 rounded-xl px-2 font-bold text-slate-600 hover:bg-white sm:px-3">بستن</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" title="برگشت (Ctrl+Z)" onClick={undo} disabled={busy || !canUndo} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-black text-[#276556] shadow-sm hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"><Undo2 size={16} aria-hidden="true" />برگشت</button>
            <button type="button" title="بازانجام (Ctrl+Y)" onClick={redo} disabled={busy || !canRedo} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-black text-[#276556] shadow-sm hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"><Redo2 size={16} aria-hidden="true" />بازانجام</button>
            <span className="text-[11px] text-slate-500">Ctrl+Z برگشت · Ctrl+Y بازانجام</span>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">نام غذا<input value={draft.name} onChange={event => updateDraft(current => ({ ...current, name: event.target.value }))} maxLength={120} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#276556]" /></label>
            <label className="text-sm font-bold text-slate-700">تعداد نفرات پایه<input type="number" min="1" max="20" value={draft.servings} onChange={event => updateDraft(current => ({ ...current, servings: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#276556]" /></label>
            <label className="text-sm font-bold text-slate-700">زمان پخت (دقیقه)<input type="number" min="1" max="1440" value={draft.cookTime} onChange={event => updateDraft(current => ({ ...current, cookTime: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#276556]" /></label>
            <label className="text-sm font-bold text-slate-700 sm:col-span-2">توضیح کوتاه<textarea value={draft.description} onChange={event => updateDraft(current => ({ ...current, description: event.target.value }))} maxLength={10000} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#276556]" /></label>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-800">مواد لازم</h3><button type="button" onClick={() => updateDraft(current => ({ ...current, ingredients: [...current.ingredients, { item: '', amount: 1, unit: 'عدد' }] }))} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-[#276556]">+ افزودن ماده</button></div>
            <div className="space-y-2">
              {draft.ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_90px_110px_40px] gap-2">
                  <input aria-label={`نام ماده ${index + 1}`} value={ingredient.item} onChange={event => updateDraft(current => ({ ...current, ingredients: current.ingredients.map((item, i) => i === index ? { ...item, item: event.target.value } : item) }))} placeholder="نام ماده" className="min-w-0 rounded-xl border border-slate-200 p-2.5 text-sm" />
                  <input aria-label={`مقدار ماده ${index + 1}`} type="number" min="0" step="any" value={ingredient.amount} onChange={event => updateDraft(current => ({ ...current, ingredients: current.ingredients.map((item, i) => i === index ? { ...item, amount: Number(event.target.value) } : item) }))} className="min-w-0 rounded-xl border border-slate-200 p-2.5 text-sm" />
                  <input aria-label={`واحد ماده ${index + 1}`} value={ingredient.unit} onChange={event => updateDraft(current => ({ ...current, ingredients: current.ingredients.map((item, i) => i === index ? { ...item, unit: event.target.value } : item) }))} placeholder="واحد" className="min-w-0 rounded-xl border border-slate-200 p-2.5 text-sm" />
                  <button type="button" aria-label={`حذف ${ingredient.item || 'ماده'}`} onClick={() => updateDraft(current => ({ ...current, ingredients: current.ingredients.filter((_, i) => i !== index) }))} className="rounded-xl bg-rose-50 font-black text-rose-700">×</button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-800">مراحل پخت</h3><button type="button" onClick={() => updateDraft(current => ({ ...current, steps: [...current.steps, ''] }))} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-[#276556]">+ افزودن مرحله</button></div>
            <div className="space-y-2">
              {draft.steps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <span className="flex h-11 w-8 shrink-0 items-center justify-center font-black text-[#276556]">{index + 1}</span>
                  <textarea aria-label={`مرحله ${index + 1}`} value={step} onChange={event => updateDraft(current => ({ ...current, steps: current.steps.map((item, i) => i === index ? event.target.value : item) }))} rows={2} className="min-w-0 flex-1 rounded-xl border border-slate-200 p-2.5 text-sm" />
                  <button type="button" aria-label={`حذف مرحله ${index + 1}`} onClick={() => updateDraft(current => ({ ...current, steps: current.steps.filter((_, i) => i !== index) }))} className="w-10 rounded-xl bg-rose-50 font-black text-rose-700">×</button>
                </div>
              ))}
            </div>
          </section>

          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 p-4 sm:px-7">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-xl px-4 font-bold text-slate-600">انصراف</button>
          <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-[#276556] px-5 font-black text-white disabled:opacity-60">{busy ? 'در حال ذخیره…' : 'ذخیرهٔ نسخهٔ شخصی'}</button>
        </footer>
      </form>
    </div>,
    document.body,
  );
};

export default PersonalRecipeEditModal;
