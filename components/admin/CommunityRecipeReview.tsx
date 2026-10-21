import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChefHat, ChevronDown, Clock3, Globe2, LoaderCircle, RefreshCw, ShieldCheck, Trash2, Users } from 'lucide-react';
import { CATEGORY_LABELS, Dish } from '../../types';

interface CommunitySubmission {
  id: string;
  creatorName: string;
  submittedAt: string;
  dish: Dish & { imageData?: string };
}

const CommunityRecipeReview: React.FC = () => {
  const [requests, setRequests] = useState<CommunitySubmission[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<CommunitySubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const load = useCallback(async (nextCursor?: string | null, append = false) => {
    setLoading(true); setError('');
    try {
      const url = new URL('/.netlify/functions/admin-community-recipes', window.location.origin);
      if (nextCursor) url.searchParams.set('cursor', nextCursor);
      const response = await fetch(url, { credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'دریافت صف بررسی انجام نشد.');
      setRequests(current => append ? [...current, ...result.requests] : result.requests);
      setCursor(result.cursor || null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'صف درخواست‌ها بارگذاری نشد.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (request: CommunitySubmission, action: 'approve' | 'reject', reason = '') => {
    if (working) return;
    setWorking(request.id); setError(''); setMessage('');
    try {
      const response = await fetch('/.netlify/functions/admin-community-recipes', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: request.id, action, ...(action === 'reject' ? { reason } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'ثبت تصمیم انجام نشد.');
      setRequests(current => current.filter(item => item.id !== request.id));
      setRejecting(null); setRejectionReason('');
      setMessage(action === 'approve'
        ? `«${result.name}» در GitHub ثبت شد (${result.commit?.slice(0, 7) || 'ثبت موفق'}). Netlify انتشار عمومی را آغاز می‌کند.`
        : `درخواست «${request.dish.name}» رد شد؛ سازنده می‌تواند وضعیت را در بخش رسپی‌های شخصی ببیند.`);
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'ثبت تصمیم انجام نشد. درخواست در صف باقی ماند.'); }
    finally { setWorking(''); }
  };

  return <section className="space-y-5" dir="rtl">
    <div className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-emerald-950/5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8f1eb] text-[#276556]"><Globe2 size={23}/></div><div><p className="text-xs font-black text-[#276556]">گنجینهٔ مشترک نوش‌اپ</p><h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">رسپی‌های پیشنهادی کاربران</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">درخواست‌ها تا زمان تصمیم شما در صف خصوصی Netlify می‌مانند. با تأیید، رسپی و عکس در GitHub ثبت و پس از انتشار Netlify در فهرست عمومی دیده می‌شود.</p></div></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#173c2b] px-3.5 text-xs font-bold text-white disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تازه‌سازی صف</button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-[11px]"><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-bold text-amber-900"><ShieldCheck size={14}/> فقط شما انتشار را تأیید می‌کنید</span><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 font-bold text-slate-600"><ChefHat size={14}/> نام سازنده کنار رسپی درج می‌شود</span></div>
    </div>

    {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{error}</p>}
    {loading && !requests.length && <p role="status" className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500"><LoaderCircle className="mx-auto mb-2 animate-spin"/>در حال خواندن درخواست‌ها…</p>}
    {!loading && !requests.length && !error && <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center"><ChefHat className="mx-auto h-9 w-9 text-emerald-700"/><h3 className="mt-3 font-black text-slate-800">درخواستی در صف نیست</h3><p className="mt-1 text-xs leading-6 text-slate-500">هر وقت کاربری رسپی‌اش را برای انتشار بفرستد، اینجا برای بررسی می‌بینی.</p></div>}

    <div className="grid gap-4 xl:grid-cols-2">{requests.map(request => {
      const dish = request.dish;
      return <article key={request.id} className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-emerald-950/5">
        <div className="grid sm:grid-cols-[190px_minmax(0,1fr)]">
          <div className="relative min-h-48 bg-[#eef4ef] sm:min-h-full">{dish.imageData ? <img src={dish.imageData} alt={`عکس ارسالی ${dish.name}`} className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 grid place-items-center text-emerald-800"><ChefHat size={42}/></div>}<span className="absolute bottom-2 right-2 rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-700">{CATEGORY_LABELS[dish.category] || dish.category}</span></div>
          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-lg font-black text-slate-900">{dish.name}</h3><p className="mt-1 text-xs font-bold text-[#276556]">به نام {request.creatorName}{dish.nationality ? ` · ${dish.nationality}` : ''}</p></div><span className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-900">در انتظار بررسی</span></div>
            <p className="mt-3 line-clamp-3 text-xs leading-6 text-slate-600">{dish.description || 'توضیحی ثبت نشده است.'}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-600"><span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1"><Users size={13}/> {Number(dish.servings || 4).toLocaleString('fa-IR')} نفر</span><span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1"><Clock3 size={13}/> {Number(dish.cookTime || 0).toLocaleString('fa-IR')} دقیقه</span><span className="rounded-lg bg-slate-50 px-2 py-1">{dish.ingredients.length.toLocaleString('fa-IR')} قلم</span></div>
          </div>
        </div>
        <details className="border-t border-slate-100 px-4 py-3 sm:px-5"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-black text-[#276556]"><ChevronDown size={15}/> مشاهدهٔ مواد و مراحل پخت</summary><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><h4 className="text-xs font-black text-slate-800">مواد لازم</h4><ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">{dish.ingredients.map((item,index)=><li key={index}>{item.item} — {item.amount} {item.unit}</li>)}</ul></div><div><h4 className="text-xs font-black text-slate-800">مراحل پخت</h4><ol className="mt-2 list-inside list-decimal space-y-1.5 text-xs leading-5 text-slate-600">{dish.recipeSteps.map((step,index)=><li key={index}>{step}</li>)}</ol></div></div></details>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-[#fbfcfb] p-3 sm:px-5"><button type="button" onClick={() => { setRejecting(request); setRejectionReason(''); }} disabled={Boolean(working)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-rose-700 ring-1 ring-rose-200 disabled:opacity-50"><Trash2 size={15}/> رد درخواست</button><button type="button" onClick={() => void decide(request, 'approve')} disabled={Boolean(working)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#276556] px-4 text-xs font-black text-white shadow-sm hover:bg-[#347866] disabled:opacity-50">{working === request.id ? <LoaderCircle size={15} className="animate-spin"/> : <Check size={15}/>} تأیید و انتشار برای همه</button></footer>
      </article>;
    })}</div>
    {cursor && <div className="text-center"><button type="button" onClick={() => void load(cursor, true)} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#276556] ring-1 ring-emerald-900/15"><ChevronDown size={17}/> درخواست‌های قدیمی‌تر</button></div>}
    {rejecting && <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/50 p-4" onClick={() => setRejecting(null)}><section role="dialog" aria-modal="true" aria-labelledby="reject-recipe-title" className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-2xl sm:p-6" onClick={event => event.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-black text-rose-700">رد درخواست عمومی</span><h3 id="reject-recipe-title" className="mt-1 text-lg font-black text-slate-900">برای سازنده راهنما بگذار</h3><p className="mt-1 text-xs leading-5 text-slate-500">«{rejecting.dish.name}» به صف انتشار عمومی اضافه نمی‌شود.</p></div><button type="button" aria-label="بستن" onClick={() => setRejecting(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500">×</button></div><label className="mt-4 block"><span className="mb-1.5 block text-xs font-bold text-slate-700">علت رد یا پیشنهاد اصلاح</span><textarea autoFocus maxLength={400} rows={4} value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} placeholder="مثلاً مقدار یکی از مواد مشخص نیست؛ لطفاً واحد و مقدارش را کامل کن." className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"/></label><div className="mt-4 flex gap-2"><button type="button" onClick={() => void decide(rejecting, 'reject', rejectionReason)} disabled={!rejectionReason.trim() || Boolean(working)} className="min-h-11 flex-1 rounded-xl bg-rose-700 px-4 text-sm font-black text-white disabled:opacity-40">ثبت رد و ارسال بازخورد</button><button type="button" onClick={() => setRejecting(null)} className="min-h-11 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-600">انصراف</button></div></section></div>}
  </section>;
};

export default CommunityRecipeReview;
