import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, CalendarDays, Search } from 'lucide-react';
import { PurchaseRecord, UserProfile } from '../types';
import { convertIngredientQuantity } from '../utils/recipeHelpers';
import { normalizePersian } from '../utils/text';

type SortKey = 'name' | 'purchasedAt' | 'amount' | 'unitPrice' | 'totalPrice' | 'remaining';
type PriceFilter = 'all' | 'priced' | 'unpriced';
const fa = (value: number) => value.toLocaleString('fa-IR', { maximumFractionDigits: 2 });

export default function PurchaseReport({ user }: { user: UserProfile }) {
  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('purchasedAt');
  const [descending, setDescending] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ranges, setRanges] = useState({ amount: { min: '', max: '' }, unitPrice: { min: '', max: '' }, totalPrice: { min: '', max: '' }, remaining: { min: '', max: '' } });

  const rows = useMemo(() => (user.purchaseHistory || []).map(purchase => {
    const stock = user.inventory?.find(item => item.id === purchase.inventoryId);
    const batch = stock?.stockBatches?.find(item => item.id === purchase.id);
    const remainingConversion = stock && batch ? convertIngredientQuantity(batch.amount, stock.unit, purchase.unit, stock.name, purchase.name) : null;
    const remaining = batch && remainingConversion ? remainingConversion.amount : 0;
    return { ...purchase, purchasedAt: purchase.lastPurchasedAt || purchase.purchasedAt, remaining };
  }).filter(row => {
    if (query.trim() && !normalizePersian(row.name).includes(normalizePersian(query.trim()))) return false;
    if (priceFilter === 'priced' && !row.unitPrice) return false;
    if (priceFilter === 'unpriced' && row.unitPrice) return false;
    const purchased = new Date(Number.isFinite(row.lastPurchasedAt) ? row.lastPurchasedAt! : Number.isFinite(row.purchasedAt) ? row.purchasedAt : 0);
    const date = `${purchased.getFullYear()}-${String(purchased.getMonth() + 1).padStart(2, '0')}-${String(purchased.getDate()).padStart(2, '0')}`;
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    for (const key of ['amount', 'unitPrice', 'totalPrice', 'remaining'] as const) {
      const value = Number(row[key] || 0), range = ranges[key];
      if (range.min !== '' && value < Number(range.min)) return false;
      if (range.max !== '' && value > Number(range.max)) return false;
    }
    return true;
  }).sort((a, b) => {
    const left = a[sortKey], right = b[sortKey];
    const comparison = typeof left === 'string' && typeof right === 'string' ? left.localeCompare(right, 'fa') : Number(left || 0) - Number(right || 0);
    return descending ? -comparison : comparison;
  }), [user.purchaseHistory, user.inventory, query, priceFilter, sortKey, descending, dateFrom, dateTo, ranges]);

  const sort = (key: SortKey) => {
    if (sortKey === key) setDescending(value => !value);
    else { setSortKey(key); setDescending(key === 'purchasedAt'); }
  };
  const hasFilters = Boolean(query || priceFilter !== 'all' || dateFrom || dateTo || (['amount', 'unitPrice', 'totalPrice', 'remaining'] as const).some(key => ranges[key].min || ranges[key].max));
  const clearFilters = () => { setQuery(''); setPriceFilter('all'); setDateFrom(''); setDateTo(''); setRanges({ amount: { min: '', max: '' }, unitPrice: { min: '', max: '' }, totalPrice: { min: '', max: '' }, remaining: { min: '', max: '' } }); };
  const header = (key: SortKey, label: string) => <th scope="col" aria-sort={sortKey === key ? descending ? 'descending' : 'ascending' : 'none'} className="whitespace-nowrap px-3 py-3 text-right"><button type="button" onClick={() => sort(key)} className="inline-flex min-h-9 items-center gap-1 font-black hover:text-[#276556]">{label}{sortKey === key ? descending ? <ArrowDown size={14}/> : <ArrowUp size={14}/> : <ArrowDownUp size={13} className="opacity-40"/>}</button></th>;

  return <div className="space-y-4" dir="rtl">
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-emerald-50 bg-gradient-to-l from-[#edf5ef] to-white p-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#276556] text-white"><CalendarDays size={19}/></span><div><h2 className="font-black text-slate-900">گزارش خریدهای انبار</h2><p className="mt-1 text-xs leading-6 text-slate-600">قیمت هر سری در زمان خرید ثبت می‌شود. مقدار باقی‌مانده از موجودی فعلی خوانده می‌شود؛ گزارش تاریخچهٔ خریدها را هم نگه می‌دارد.</p></div></header>
      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_160px_150px_150px]">
        <label className="relative"><span className="sr-only">جستجوی نام ماده</span><Search size={16} className="absolute right-3 top-3.5 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجو با نام ماده…" className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-[#276556] focus:ring-2 focus:ring-emerald-100"/></label>
        <label className="text-xs font-bold text-slate-600"><span className="sr-only">فیلتر ثبت قیمت</span><select value={priceFilter} onChange={event => setPriceFilter(event.target.value as PriceFilter)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#276556]"><option value="all">همهٔ خریدها</option><option value="priced">دارای قیمت</option><option value="unpriced">بدون قیمت</option></select></label>
        <label className="text-[11px] font-bold text-slate-500">از تاریخ<input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#276556]"/></label>
        <label className="text-[11px] font-bold text-slate-500">تا تاریخ<input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#276556]"/></label>
      </div>
      <details className="mx-4 mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3"><summary className="min-h-10 cursor-pointer py-3 text-xs font-black text-slate-700">فیلتر مقدارها و قیمت‌ها</summary><div className="grid gap-3 pb-3 sm:grid-cols-2 lg:grid-cols-4">{([
        ['amount','مقدار خرید'],['unitPrice','قیمت هر واحد'],['totalPrice','مبلغ خرید'],['remaining','مقدار باقی‌مانده'],
      ] as const).map(([key,label]) => <fieldset key={key} className="grid grid-cols-2 gap-2"><legend className="col-span-2 mb-1 text-[11px] font-bold text-slate-600">{label} · کمینه / بیشینه</legend><input type="number" min="0" step="any" value={ranges[key].min} onChange={event => setRanges(value => ({ ...value, [key]: { ...value[key], min: event.target.value } }))} placeholder="از" aria-label={`حداقل ${label}`} className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#276556]"/><input type="number" min="0" step="any" value={ranges[key].max} onChange={event => setRanges(value => ({ ...value, [key]: { ...value[key], max: event.target.value } }))} placeholder="تا" aria-label={`حداکثر ${label}`} className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#276556]"/></fieldset>)}</div></details>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500"><span>{fa(rows.length)} سری خرید</span><div className="flex items-center gap-3"><span>برای مرتب‌سازی هر ستون، عنوان آن را بزن.</span>{hasFilters && <button type="button" onClick={clearFilters} className="font-bold text-[#276556] underline">پاک‌کردن فیلترها</button>}</div></div>
      {rows.length ? <div className="overflow-x-auto"><table className="min-w-[960px] w-full text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{header('name','ماده')}{header('purchasedAt','آخرین خرید')}{header('amount','مجموع خرید سری')}{header('unitPrice','میانگین قیمت هر واحد')}{header('totalPrice','مجموع هزینهٔ سری')}{header('remaining','باقی‌مانده')}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} className="hover:bg-emerald-50/40"><td className="px-3 py-3 font-black text-slate-800">{row.name}{row.approximate && <span className="mr-1 text-amber-700" title="تبدیل یا قیمت این سری تقریبی است">≈</span>}</td><td className="px-3 py-3 text-slate-600">{new Date(row.purchasedAt).toLocaleDateString('fa-IR')}</td><td className="px-3 py-3 text-slate-700">{fa(row.amount)} {row.unit}</td><td className="px-3 py-3 text-slate-700">{row.unitPrice ? `${fa(row.unitPrice)} تومان / ${row.unit}` : <span className="text-slate-400">ثبت نشده</span>}</td><td className="px-3 py-3 font-bold text-slate-800">{row.totalPrice ? `${fa(row.totalPrice)} تومان` : '—'}</td><td className="px-3 py-3 text-slate-700">{fa(row.remaining)} {row.unit}</td></tr>)}</tbody></table></div> : <div className="m-4 rounded-xl border border-dashed border-slate-300 p-7 text-center"><p className="font-bold text-slate-700">خریدی با این فیلتر پیدا نشد</p><p className="mt-1 text-xs leading-5 text-slate-500">ثبت خرید و قیمت هر واحد را هنگام افزودن ماده به انبار یا از مدیریت سری‌های خرید انجام بده.</p></div>}
    </section>
  </div>;
}
