import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus, Trash2, X } from 'lucide-react';
import { InventoryBatch, InventoryItem } from '../types';
import { getInventoryBatches, sumInventoryBatches } from '../utils/inventoryBatches';
import { useDialogFocus } from '../utils/useDialogFocus';

const newId = () => globalThis.crypto?.randomUUID?.() || `lot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const fa = (value: number) => value.toLocaleString('fa-IR', { maximumFractionDigits: 3 });

export default function InventoryBatchManager({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: (batches: InventoryBatch[]) => void }) {
  const dialogRef = useDialogFocus(onClose);
  const [batches, setBatches] = useState<InventoryBatch[]>(() => getInventoryBatches(item));
  const [amount, setAmount] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const total = useMemo(() => sumInventoryBatches(batches), [batches]);
  const update = (id: string, patch: Partial<InventoryBatch>) => setBatches(current => current.map(row => row.id === id ? { ...row, ...patch } : row));

  return <div className="fixed inset-0 z-[12000] grid place-items-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-5" onMouseDown={onClose}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inventory-batches-title" onMouseDown={event => event.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#f6f8f4] shadow-2xl sm:rounded-[2rem]">
      <header className="flex items-center justify-between gap-3 bg-[#276556] px-4 py-4 text-white sm:px-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><CalendarDays size={20}/></span><div><h2 id="inventory-batches-title" className="font-black">تاریخ مصرف {item.name}</h2><p className="mt-1 text-xs text-white/75">موجودی فعلی: {fa(total)} {item.unit}</p></div></div>
        <button type="button" onClick={onClose} aria-label="بستن پنجره" className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><X size={20}/></button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <p className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs leading-6 text-slate-600">هر بار خرید را جدا ثبت کن تا اپ هنگام مصرف، سری‌ای را که زودتر منقضی می‌شود اول کم کند. برای موجودی قدیمی هم می‌توانی تاریخش را همین‌جا وارد کنی.</p>
        <div className="space-y-2">
          {batches.map((batch, index) => <div key={batch.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <label className="text-[11px] font-bold text-slate-600">مقدار سری {fa(index + 1)}<span className="mt-1 flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-2"><input type="number" min="0" step="any" value={batch.amount} onChange={event => update(batch.id, { amount: Number(event.target.value) || 0 })} className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-800 outline-none" aria-label={`مقدار سری ${fa(index + 1)}`} /><small className="shrink-0 text-[10px] text-slate-500">{item.unit}</small></span></label>
            <label className="text-[11px] font-bold text-slate-600">تاریخ انقضا<input type="date" value={batch.expiresOn || ''} onChange={event => update(batch.id, { expiresOn: event.target.value || undefined })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-[#276556] focus:ring-2 focus:ring-emerald-100" /></label>
            <button type="button" aria-label={`حذف سری ${fa(index + 1)}`} onClick={() => setBatches(current => current.filter(row => row.id !== batch.id))} className="grid h-10 w-10 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 size={16}/></button>
          </div>)}
          {!batches.length && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">هنوز سری خریدی ثبت نشده است.</p>}
        </div>
        <form onSubmit={event => { event.preventDefault(); const parsed = Number(amount); if (!Number.isFinite(parsed) || parsed <= 0) return; setBatches(current => [...current, { id: newId(), amount: parsed, ...(expiresOn ? { expiresOn } : {}), receivedAt: Date.now() }]); setAmount(''); setExpiresOn(''); }} className="grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-[11px] font-bold text-slate-700">مقدار خرید تازه<input type="number" min="0.001" step="any" value={amount} onChange={event => setAmount(event.target.value)} placeholder={`مثلاً ۱ ${item.unit}`} className="mt-1 h-10 w-full rounded-lg border border-emerald-100 bg-white px-3 text-sm font-bold outline-none focus:border-[#276556]" /></label>
          <label className="text-[11px] font-bold text-slate-700">تاریخ انقضا (اختیاری)<input type="date" value={expiresOn} onChange={event => setExpiresOn(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-emerald-100 bg-white px-2 text-sm outline-none focus:border-[#276556]" /></label>
          <button type="submit" disabled={!Number.isFinite(Number(amount)) || Number(amount) <= 0} className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-[#276556] px-3 text-xs font-black text-white disabled:opacity-40"><Plus size={15}/>افزودن سری</button>
        </form>
        <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm"><span className="font-bold text-slate-600">جمع موجودی سری‌ها</span><strong className={Math.abs(total - item.amount) < 0.001 ? 'text-[#276556]' : 'text-rose-700'}>{fa(total)} {item.unit}</strong></div>
        {Math.abs(total - item.amount) >= 0.001 && <p role="alert" className="text-xs font-bold text-rose-700">مجموع سری‌ها باید با موجودی ثبت‌شده ({fa(item.amount)} {item.unit}) برابر باشد؛ با افزودن یا حذف سری‌ها، مقدار کل نیز تغییر می‌کند.</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">انصراف</button><button type="button" disabled={batches.some(batch => !Number.isFinite(batch.amount) || batch.amount <= 0)} onClick={() => onSave(batches)} className="rounded-xl bg-[#276556] px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">ذخیره تاریخ‌ها</button></footer>
    </section>
  </div>;
}
