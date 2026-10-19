import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, History } from 'lucide-react';
import { UserProfile } from '../types';
import { UserService } from '../services/userService';
import { useDialogFocus } from '../utils/useDialogFocus';
export default function InventoryHistory({ user, onUpdateUser }: { user: UserProfile; onUpdateUser: (user: UserProfile) => void }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200"><History size={16}/> سابقهٔ مصرف</button>{open && <HistoryDialog user={user} onUpdateUser={onUpdateUser} onClose={() => setOpen(false)}/>}</>;
}
function HistoryDialog({ user, onUpdateUser, onClose }: { user: UserProfile; onUpdateUser: (user: UserProfile) => void; onClose: () => void }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const ref = useDialogFocus(onClose);
  const undo = async (id: string) => {
    if (busy) return;
    setBusy(id); setError('');
    try { onUpdateUser(await UserService.undoCooking(id)); }
    catch(e) { setError(e instanceof Error ? e.message : 'بازگردانی انجام نشد.'); }
    finally { setBusy(''); }
  };
  return createPortal(<div className="fixed inset-0 z-[12000] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-md" onClick={onClose}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inventory-history-title" dir="rtl" onClick={e => e.stopPropagation()} className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#f5f8f4] text-slate-800 shadow-2xl outline-none"><header className="flex items-center justify-between border-b border-emerald-100 bg-white p-5"><div><h2 id="inventory-history-title" className="text-lg font-black">سابقهٔ مصرف انبار</h2><p className="mt-1 text-xs text-slate-500">مقدار مصرف و ضریب‌های تقریبی در زمان پخت نگهداری می‌شوند.</p></div><button type="button" aria-label="بستن سابقه" onClick={onClose} className="rounded-full bg-slate-100 p-2"><X size={20}/></button></header><div className="space-y-4 overflow-y-auto p-4 sm:p-6">{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{!(user.cookingTransactions || []).length && <p className="p-8 text-center text-sm text-slate-500">پس از زدن «پختم»، سابقهٔ مصرف اینجا ثبت می‌شود.</p>}{[...(user.cookingTransactions || [])].reverse().map(tx => <article key={tx.id} className="rounded-2xl border border-emerald-100 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="font-black">{tx.dishName}</strong><p className="mt-1 text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString('fa-IR')} · {tx.servings.toLocaleString('fa-IR')} نفر</p></div>{tx.reversedAt ? <span className="rounded-lg bg-slate-100 p-2 text-xs text-slate-500">بازگردانده شد</span> : <button type="button" disabled={Boolean(busy)} onClick={() => void undo(tx.id)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900"><RotateCcw size={15}/>{busy === tx.id ? 'در حال بازگردانی…' : 'بازگرداندن این پخت'}</button>}</div>{tx.changes.length ? <ul className="mt-3 divide-y divide-slate-100">{tx.changes.map(change => <li key={change.inventoryId} className="py-3 text-xs leading-6"><strong>{change.name}: </strong>{change.before.toLocaleString('fa-IR')} ← مصرف {change.consumed.toLocaleString('fa-IR')} ← باقی‌مانده {change.after.toLocaleString('fa-IR')} {change.unit}<p className="text-[10px] text-slate-500">{change.estimated ? 'محاسبه با میانگین تقریبی · ' : ''}{change.reason}</p></li>)}</ul> : <p className="mt-3 text-xs text-amber-800">ماده‌ای از اقلام ثبت‌شده قابل کسر نبود.</p>}{tx.notes?.length ? <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-800">{tx.notes.map((note, index) => <li key={index}>• {note}</li>)}</ul> : null}</article>)}</div></section></div>, document.body);
}
