import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Search, Save, Scale } from 'lucide-react';
import { PANTRY_ITEMS, getBaseIngredientName, getIngredientCategoryId } from '../../data/pantry';
import PANTRY_UNIT_PREFERENCES from '../../data/pantry_unit_preferences.json';
import { RecipeService } from '../../services/recipeService';
import { Dish } from '../../types';
import { convertIngredientQuantity, getWeightPerUnit, ReferenceOverrides, convertAmountBetweenUnits, convertToBase, isIngredientMatch, normalizeItemName, normalizeUnit } from '../../utils/recipeHelpers';
import DishEditor from './DishEditor';
import RecipeQuantityAudit from './RecipeQuantityAudit';
import { getPantryUnitKey, PANTRY_UNIT_OPTIONS, suggestPantryUnit } from '../../utils/pantryUnits';

type RegistryItem = { key: string; name: string; category: string; recipeUnits: Record<string, { count: number; dishes: string[] }> };
type UnitIssue = { unit: string; dishes: string[]; reason: string; estimated: boolean };
const PAGE_SIZE = 100;
const CATEGORY_TITLES: Record<string, string> = Object.fromEntries(PANTRY_ITEMS.map(category => [category.id, category.title]));
const MASS_UNITS = new Set(['کیلوگرم', 'گرم', 'میلی‌گرم', 'سیر', 'مثقال', 'تن', 'اونس', 'پوند']);
const REFERENCE_UNITS = [...PANTRY_UNIT_OPTIONS.filter(unit => !MASS_UNITS.has(normalizeUnit(unit))), 'قطعه', 'پیمانه آمریکایی', 'عدد کوچک', 'عدد متوسط', 'عدد بزرگ'];

const getUnitIssue = (name: string, recipeUnit: string, stockUnit: string, dishes: string[], references: ReferenceOverrides): UnitIssue | null => {
  if (normalizeUnit(recipeUnit) === 'به میزان لازم') return null;
  const conversion = convertIngredientQuantity(1, recipeUnit, stockUnit, name, name, references);
  if (conversion) {
    if (!conversion.estimated) return null;
    const weight = getWeightPerUnit(recipeUnit, name, references);
    const grams = weight === undefined ? undefined : Math.round(weight * 10) / 10;
    return { unit: recipeUnit, dishes, estimated: true, reason: grams ? `با وزن مرجع تقریبی، هر ۱ ${recipeUnit} حدود ${grams.toLocaleString('fa-IR')} گرم محاسبه می‌شود.` : `تبدیل ${recipeUnit} به ${stockUnit} با وزن مرجع تقریبی انجام می‌شود.` };
  }
  const recipeBase = convertToBase(1, recipeUnit, name);
  const stockBase = convertToBase(1, stockUnit, name);
  if (recipeBase.type === 'unknown') return { unit: recipeUnit, dishes, estimated: false, reason: `واحد «${recipeUnit}» در جدول تبدیل نوش تعریف نشده است.` };
  if (recipeBase.type !== stockBase.type || recipeBase.baseUnit !== stockBase.baseUnit) {
    const typeName = (type: string) => ({ weight: 'وزنی', volume: 'حجمی', count: 'شمارشی', unknown: 'نامشخص' }[type] || type);
    return { unit: recipeUnit, dishes, estimated: false, reason: `واحد رسپی «${recipeUnit}» ${typeName(recipeBase.type)} است اما واحد انبار «${stockUnit}» ${typeName(stockBase.type)}؛ برای این ماده ضریب تبدیل معتبر ثبت نشده است.` };
  }
  return { unit: recipeUnit, dishes, estimated: false, reason: `واحد «${recipeUnit}» با «${stockUnit}» برای این ماده سازگار تشخیص داده نشد.` };
};

const PantryUnitManager: React.FC = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [units, setUnits] = useState<Record<string, string>>(() => (PANTRY_UNIT_PREFERENCES as { units?: Record<string, string> }).units || {});
  const [weightEquivalences, setWeightEquivalences] = useState<Record<string, Record<string, number>>>(() => (PANTRY_UNIT_PREFERENCES as { weightEquivalences?: Record<string, Record<string, number>> }).weightEquivalences || {});
  const [referenceNotes, setReferenceNotes] = useState<Record<string, Record<string, string>>>(() => (PANTRY_UNIT_PREFERENCES as { referenceNotes?: Record<string, Record<string,string>> }).referenceNotes || {});
  const [referenceUnits, setReferenceUnits] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDishes(RecipeService.getCatalogDishes());
    setLoading(false);
  }, []);

  const registry = useMemo<RegistryItem[]>(() => {
    const items = new Map<string, RegistryItem>();
    PANTRY_ITEMS.forEach(category => category.subcategories.forEach(subcategory => subcategory.items.forEach(name => {
      const key = getPantryUnitKey(name);
      if (!items.has(key)) items.set(key, { key, name, category: category.id, recipeUnits: {} });
    })));
    dishes.forEach(dish => dish.ingredients.forEach(ingredient => {
      if (!ingredient.item?.trim()) return;
      const name = ingredient.item.trim();
      const key = getPantryUnitKey(name);
      const category = getIngredientCategoryId(name) || 'other';
      let entry = items.get(key);
      if (!entry) {
        entry = { key, name, category, recipeUnits: {} };
        items.set(key, entry);
      }
      if ((Number(ingredient.amount) || 0) <= 0) return;
      const size = /بزرگ|درشت/.test(ingredient.item + ingredient.unit) ? 'بزرگ' : /کوچک|ریز/.test(ingredient.item + ingredient.unit) ? 'کوچک' : /متوسط/.test(ingredient.item + ingredient.unit) ? 'متوسط' : '';
      const normalizedUnit = normalizeUnit(ingredient.unit || 'نامشخص');
      const unit = normalizedUnit === 'عدد' && size ? `عدد ${size}` : normalizedUnit;
      const usage = entry.recipeUnits[unit] || { count: 0, dishes: [] };
      usage.count += 1;
      if (!usage.dishes.includes(dish.name)) usage.dishes.push(dish.name);
      entry.recipeUnits[unit] = usage;
    }));
    return [...items.values()].sort((left, right) => {
      const leftOrder = PANTRY_ITEMS.findIndex(category => category.id === left.category);
      const rightOrder = PANTRY_ITEMS.findIndex(category => category.id === right.category);
      const categoryOrder = (leftOrder < 0 ? PANTRY_ITEMS.length : leftOrder) - (rightOrder < 0 ? PANTRY_ITEMS.length : rightOrder);
      return categoryOrder || left.name.localeCompare(right.name, 'fa');
    });
  }, [dishes]);

  const analysed = useMemo(() => registry.map(item => {
    const unit = units[item.key] || suggestPantryUnit(item.name);
    const recipeUnits = Object.entries(item.recipeUnits) as [string, { count: number; dishes: string[] }][];
    const issues = recipeUnits.map(([recipeUnit, usage]) => getUnitIssue(item.name, recipeUnit, unit, usage.dishes, weightEquivalences)).filter((issue): issue is UnitIssue => Boolean(issue));
    return { ...item, unit, issues, hasConflict: issues.some(issue => !issue.estimated), hasEstimate: issues.some(issue => issue.estimated) };
  }), [registry, units, weightEquivalences]);

  const filtered = useMemo(() => {
    const query = normalizeItemName(search);
    return analysed.filter(item => (!query || normalizeItemName(`${item.name}${CATEGORY_TITLES[item.category] || 'سایر مواد'}`).includes(query)) && (!onlyIssues || item.issues.length > 0));
  }, [analysed, search, onlyIssues]);
  useEffect(() => setPage(1), [search, onlyIssues]);

  const changeUnit = (key: string, unit: string) => setUnits(current => ({ ...current, [key]: unit }));
  const save = async () => {
    if (!registry.length) return;
    setSaving(true);
    setMessage('');
    try {
      const completeUnits = Object.fromEntries(registry.map(item => [item.key, units[item.key] || suggestPantryUnit(item.name)]));
      const response = await fetch('/.netlify/functions/publish-pantry-units', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ units: completeUnits, weightEquivalences, referenceNotes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'ثبت واحدها انجام نشد.');
      setUnits(completeUnits);
      setMessage(`تنظیم واحدها و وزن‌های مرجع ${result.count.toLocaleString('fa-IR')} ماده در GitHub ثبت شد (${String(result.commit || '').slice(0, 7)}). Netlify در حال انتشار است.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ارتباط با سرویس انتشار برقرار نشد.');
    } finally {
      setSaving(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const conflictCount = analysed.filter(item => item.hasConflict).length;
  const estimateCount = analysed.filter(item => item.hasEstimate && !item.hasConflict).length;

  return <section className="overflow-hidden rounded-[28px] border border-emerald-950/5 bg-white text-right shadow-sm">
    <header className="flex flex-col gap-4 bg-[#173c2b] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d7b45a] text-[#173c2b]"><Scale size={23}/></span><div><h2 className="text-xl font-black sm:text-2xl">واحد استاندارد مواد انبار</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-emerald-50/80">برای هر ماده واحد خرید را تعیین کن؛ برای واحدهای شمارشی یا حجمی ناسازگار هم معادل تقریبی هر واحد به گرم را وارد کن. این وزن مرجع در محاسبهٔ انبار و خرید استفاده و به‌عنوان تخمینی مشخص می‌شود.</p></div></div>
      <button type="button" onClick={() => void save()} disabled={saving || loading || !registry.length} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d7b45a] px-5 py-3 text-sm font-black text-[#173c2b] disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={17}/> : <Save size={17}/>} ثبت و انتشار واحدها</button>
    </header>

    <div className="grid gap-3 border-b border-slate-100 bg-[#f7f9f6] p-4 sm:grid-cols-3 sm:p-6">
      <div className="rounded-2xl bg-white p-4"><small className="text-[11px] font-bold text-slate-500">مواد قابل تنظیم</small><strong className="mt-1 block text-2xl font-black text-[#173c2b]">{registry.length.toLocaleString('fa-IR')}</strong></div>
      <div className="rounded-2xl bg-white p-4"><small className="text-[11px] font-bold text-slate-500">ناسازگاری نیازمند تصمیم</small><strong className="mt-1 block text-2xl font-black text-rose-700">{conflictCount.toLocaleString('fa-IR')}</strong></div>
      <div className="rounded-2xl bg-white p-4"><small className="text-[11px] font-bold text-slate-500">تبدیل تقریبی با مرجع</small><strong className="mt-1 block text-2xl font-black text-amber-700">{estimateCount.toLocaleString('fa-IR')}</strong></div>
    </div>

    <RecipeQuantityAudit dishes={dishes} units={units} references={weightEquivalences} onEdit={id => setEditingDish(dishes.find(dish => dish.id === id) || null)}/>
    {editingDish && <DishEditor key={editingDish.id} dish={editingDish} onClose={() => setEditingDish(null)} onSave={() => setDishes(RecipeService.getCatalogDishes())}/>}
    {message && <p role="status" className={`mx-5 mt-4 rounded-xl px-4 py-3 text-sm leading-7 ${message.includes('انجام نشد') || message.includes('منقضی') ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-900'}`}>{message}</p>}
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <label className="relative flex w-full max-w-lg items-center"><Search className="absolute right-3 text-slate-400" size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="جستجوی ماده یا دسته‌بندی…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pe-10 ps-3 text-sm outline-none focus:border-emerald-600" /></label>
      <button type="button" aria-pressed={onlyIssues} onClick={() => setOnlyIssues(value => !value)} className={`rounded-xl px-4 py-3 text-xs font-black ${onlyIssues ? 'bg-rose-100 text-rose-800' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{onlyIssues ? 'نمایش همهٔ مواد' : 'فقط موارد ناسازگار'}</button>
    </div>

    {loading ? <div className="p-16 text-center text-sm font-bold text-slate-500">در حال آماده‌سازی فهرست مواد و دستورها…</div> : <>
      <div className="overflow-x-auto"><table className="w-full min-w-[1060px] table-fixed text-right">
        <thead className="bg-slate-50 text-[11px] font-black text-slate-500"><tr><th className="w-[18%] px-4 py-4">ماده و دسته</th><th className="w-[15%] px-4 py-4">واحد خرید و انبار</th><th className="w-[19%] px-4 py-4">معادل هر واحد به گرم</th><th className="w-[17%] px-4 py-4">واحدهای رسپی</th><th className="px-4 py-4">نتیجه و راه‌حل</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{pageItems.map(item => <tr key={item.key} className="align-top hover:bg-[#fbfcfa]">
          <td className="px-4 py-4"><strong className="block text-sm font-black text-slate-800">{item.name}</strong><small className="mt-1 block text-[10px] text-slate-500">{CATEGORY_TITLES[item.category] || 'سایر مواد'} · {Object.values(item.recipeUnits as Record<string, { count: number; dishes: string[] }>).reduce((sum, usage) => sum + usage.count, 0).toLocaleString('fa-IR')} بار در رسپی</small></td>
          <td className="px-4 py-4"><select aria-label={`واحد پیش‌فرض ${item.name}`} value={item.unit} onChange={event => changeUnit(item.key, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600">{PANTRY_UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></td>
          <td className="px-4 py-4"><div className="space-y-2"><div className="flex items-center gap-1.5"><select aria-label={`واحد مرجع وزنی ${item.name}`} value={referenceUnits[item.key] || (Object.keys(item.recipeUnits).find(unit => !MASS_UNITS.has(normalizeUnit(unit)) && unit !== 'نامشخص') || 'عدد')} onChange={event => setReferenceUnits(current => ({ ...current, [item.key]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold">{REFERENCE_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select><span className="shrink-0 text-[10px] text-slate-500">≈ گرم</span></div>{(() => { const refUnit = referenceUnits[item.key] || (Object.keys(item.recipeUnits).find(unit => !MASS_UNITS.has(normalizeUnit(unit)) && unit !== 'نامشخص') || 'عدد'); return <><input aria-label={`وزن تقریبی هر ${refUnit} ${item.name} به گرم`} type="number" min="0" max="100000000" step="any" placeholder="ثبت نشده" value={weightEquivalences[item.key]?.[refUnit] ?? ''} onChange={event => { const value = Number(event.target.value); setWeightEquivalences(current => { const next = { ...current, [item.key]: { ...(current[item.key] || {}) } }; if (!event.target.value || !Number.isFinite(value) || value <= 0) { delete next[item.key][refUnit]; if (!Object.keys(next[item.key]).length) delete next[item.key]; } else next[item.key][refUnit] = value; return next; }); }} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-xs font-black"/><small className="block text-[9px] leading-4 text-slate-500">وزن هر ۱ {refUnit} از این ماده؛ اندازه و وزن خالص را مشخص کن.</small><input aria-label={`مبنای وزن مرجع ${item.name}`} value={referenceNotes[item.key]?.[refUnit] || ''} onChange={event => setReferenceNotes(current => ({ ...current, [item.key]: { ...(current[item.key] || {}), [refUnit]: event.target.value } }))} placeholder="مبنا: وزن‌کشی، اندازه، با پوست/بدون پوست…" className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px]"/><small className="block text-[9px] leading-4 text-amber-800">این مرجع تخمینی است و هنگام زدن «پختم» خودکار از انبار کسر می‌شود.</small></>; })()}</div></td>
          <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{Object.entries(item.recipeUnits as Record<string, { count: number; dishes: string[] }>).length ? (Object.entries(item.recipeUnits as Record<string, { count: number; dishes: string[] }>)).map(([unit, usage]) => <span key={unit} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{unit} × {usage.count.toLocaleString('fa-IR')}</span>) : <span className="text-[10px] text-slate-400">در رسپی نیامده</span>}</div></td>
          <td className="px-4 py-4">{!item.issues.length ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-800"><CheckCircle2 size={13}/> قابل تبدیل</span> : <div className="space-y-2">{item.issues.map(issue => <div key={`${issue.unit}-${issue.reason}`} className={`rounded-xl p-2.5 text-[10px] leading-5 ${issue.estimated ? 'bg-amber-50 text-amber-900' : 'bg-rose-50 text-rose-800'}`}><strong className="flex items-center gap-1 font-black"><AlertCircle size={13}/>{issue.estimated ? 'تبدیل تقریبی' : 'ناسازگار'}: {issue.unit} ← {item.unit}</strong><p className="mt-1">{issue.reason}</p><small className="mt-1 block opacity-75">نمونه رسپی: {issue.dishes.slice(0, 2).join('، ')}{issue.dishes.length > 2 ? ' و …' : ''}</small></div>)}</div>}</td>
        </tr>)}
        {!pageItems.length && <tr><td colSpan={5} className="p-12 text-center text-sm font-bold text-slate-500">ماده‌ای با این جستجو پیدا نشد.</td></tr>}</tbody>
      </table></div>
      <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>نمایش {(Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)).toLocaleString('fa-IR')} تا {Math.min(page * PAGE_SIZE, filtered.length).toLocaleString('fa-IR')} از {filtered.length.toLocaleString('fa-IR')} ماده</span><div className="flex items-center gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg bg-slate-100 px-3 py-2 font-bold disabled:opacity-40">قبلی</button><span>{page.toLocaleString('fa-IR')} / {pageCount.toLocaleString('fa-IR')}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage(value => value + 1)} className="rounded-lg bg-slate-100 px-3 py-2 font-bold disabled:opacity-40">بعدی</button></div></footer>
    </>}
  </section>;
};

export default PantryUnitManager;
