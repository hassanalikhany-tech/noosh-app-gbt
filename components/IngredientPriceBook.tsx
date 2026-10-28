import React, { useMemo, useState } from 'react';
import { Check, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { PANTRY_ITEMS } from '../data/pantry';
import { IngredientPrice, UserProfile } from '../types';
import { UserService } from '../services/userService';
import { getIngredientIdentity } from '../utils/recipeHelpers';

const units = ['کیلوگرم', 'گرم', 'لیتر', 'میلی‌لیتر', 'عدد', 'پیمانه', 'قاشق غذاخوری', 'قاشق چایخوری'];
const fa = (value: number) => value.toLocaleString('fa-IR', { maximumFractionDigits: 2 });

export default function IngredientPriceBook({ user, onUpdateUser }: { user: UserProfile; onUpdateUser: (user: UserProfile) => void }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('کیلوگرم');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => [...new Set(PANTRY_ITEMS.flatMap(category => category.items))].sort((a, b) => a.localeCompare(b, 'fa')), []);
  const priceBook = user.ingredientPrices || {};
  const rows = Object.entries(priceBook).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'fa'));

  const reset = () => { setName(''); setQuantity('1'); setUnit('کیلوگرم'); setPrice(''); setEditingId(null); };
  const savePrice = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    const qty = Number(quantity), totalPrice = Number(price);
    if (!cleanName || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(totalPrice) || totalPrice <= 0) { setMessage('نام ماده، مقدار خرید و قیمت باید کامل و بزرگ‌تر از صفر باشند.'); return; }
    const ingredientId = getIngredientIdentity(cleanName);
    const nextBook = { ...priceBook, [ingredientId]: { ingredientId, name: cleanName, quantity: qty, unit, totalPrice, updatedAt: Date.now() } as IngredientPrice };
    if (editingId && editingId !== ingredientId) delete nextBook[editingId];
    setBusy(true); setMessage('');
    try { const updated = await UserService.updateProfile(user.username, { ingredientPrices: nextBook }); onUpdateUser(updated); setMessage('قیمت خرید ذخیره شد و از این پس برآورد رسپی‌ها از آن استفاده می‌کند.'); reset(); }
    catch { setMessage('ذخیرهٔ قیمت انجام نشد؛ فضای ذخیره‌سازی مرورگر را بررسی کن.'); }
    finally { setBusy(false); }
  };
  const edit = (id: string, entry: IngredientPrice) => { setEditingId(id); setName(entry.name); setQuantity(String(entry.quantity)); setUnit(entry.unit); setPrice(String(entry.totalPrice)); setMessage(''); };
  const remove = async (id: string) => {
    const nextBook = { ...priceBook }; delete nextBook[id]; setBusy(true);
    try { const updated = await UserService.updateProfile(user.username, { ingredientPrices: nextBook }); onUpdateUser(updated); setMessage('قیمت از دفترچه حذف شد.'); if (editingId === id) reset(); }
    catch { setMessage('حذف قیمت انجام نشد.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-4" dir="rtl">
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-emerald-50 bg-gradient-to-l from-[#edf5ef] to-white p-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#276556] text-white"><ReceiptText size={19}/></span><div><h2 className="font-black text-slate-900">قیمت خرید مواد</h2><p className="mt-1 text-xs leading-6 text-slate-600">قیمت بسته‌ای که وارد می‌کنی به همان واحد خرید ذخیره می‌شود. مثلاً «۱ کیلوگرم برنج = ۱۲۰٬۰۰۰ تومان». هر بار قیمت بازار را عوض کردی، مقدار تازه را ثبت کن.</p></div></header>
      <div className="space-y-4 p-4 sm:p-5">
        <form onSubmit={event => void savePrice(event)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.3fr)_110px_145px_150px_auto] lg:items-end">
          <label className="text-xs font-bold text-slate-700">مادهٔ غذایی<input list="noosh-price-foods" value={name} onChange={event => setName(event.target.value)} placeholder="مثلاً برنج ایرانی" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#276556] focus:ring-2 focus:ring-emerald-100"/><datalist id="noosh-price-foods">{options.map(item => <option key={item} value={item}/>)}</datalist></label>
          <label className="text-xs font-bold text-slate-700">مقدار خرید<input type="number" min="0.001" step="any" value={quantity} onChange={event => setQuantity(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#276556]"/></label>
          <label className="text-xs font-bold text-slate-700">واحد خرید<select value={unit} onChange={event => setUnit(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-[#276556]">{units.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-700">قیمت کل (تومان)<input type="number" min="1" step="any" value={price} onChange={event => setPrice(event.target.value)} placeholder="مثلاً ۱۲۰۰۰۰" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#276556]"/></label>
          <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#276556] px-4 text-sm font-black text-white hover:bg-[#205345] disabled:opacity-50">{editingId ? <Check size={16}/> : <Plus size={16} />}{editingId ? 'ذخیره' : 'ثبت قیمت'}</button>
          {editingId && <button type="button" onClick={reset} className="h-10 text-xs font-bold text-slate-500 hover:text-slate-800">لغو ویرایش</button>}
        </form>
        {message && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-6 text-emerald-900">{message}</p>}
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] leading-6 text-amber-950">برآورد بر پایهٔ قیمت‌هایی است که خودت ثبت کرده‌ای. برای مواد بدون قیمت، تبدیل نامطمئن یا «به میزان لازم»، هزینه‌ای حدس زده نمی‌شود؛ هرجا بخشی از مواد قیمت نداشته باشد، جمع به‌عنوان «مواد قیمت‌گذاری‌شده» نمایش داده می‌شود، نه هزینهٔ کامل غذا.</div>
      </div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-black text-slate-900">دفترچهٔ قیمت‌های من</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-[#276556]">{rows.length.toLocaleString('fa-IR')} ماده</span></div>
      {rows.length ? <div className="divide-y divide-slate-100">{rows.map(([id, entry]) => <article key={id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><strong className="text-sm text-slate-800">{entry.name}</strong><p className="mt-1 text-xs text-slate-500">{fa(entry.quantity)} {entry.unit} · {fa(entry.totalPrice)} تومان · هر {entry.quantity ? fa(entry.totalPrice / entry.quantity) : '—'} تومان به‌ازای هر {entry.unit}</p></div><div className="flex gap-1"><button type="button" onClick={() => edit(id, entry)} aria-label={`ویرایش قیمت ${entry.name}`} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-[#276556]"><Pencil size={15}/></button><button type="button" disabled={busy} onClick={() => void remove(id)} aria-label={`حذف قیمت ${entry.name}`} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15}/></button></div></article>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center"><p className="text-sm font-bold text-slate-700">هنوز قیمت محلی ثبت نکرده‌ای</p><p className="mt-1 text-xs leading-5 text-slate-500">با ثبت چند مادهٔ پرمصرف، جمع تقریبی هزینهٔ رسپی و برنامه‌ات نمایان می‌شود.</p></div>}
    </section>
  </div>;
}
