import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Eye, Info, Loader2, MessageCircle, RefreshCw, Search, Send, ShieldCheck, Tag, X } from 'lucide-react';
import { FeedbackService } from '../../services/feedbackService';
import { NotificationService } from '../../services/notificationService';
import { UserFeedback } from '../../types';

const categoryLabel = (category: UserFeedback['category']) => ({
  suggestion: 'پیشنهاد', issue: 'گزارش مشکل', criticism: 'انتقاد', feature_request: 'قابلیت جدید',
}[category] || 'بازخورد');
const statusLabel = (status: UserFeedback['status']) => ({
  new: 'جدید', reviewed: 'بررسی‌شده', to_be_reviewed: 'بررسی شود', to_be_followed_up: 'پیگیری شود',
  handled: 'رسیدگی شد', informed: 'اطلاع حاصل شد', referred: 'ارجاع شده',
}[status] || status);
const dateLabel = (date: number) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

const FeedbackManager: React.FC = () => {
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserFeedback | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [publicReply, setPublicReply] = useState('');
  const [includeSuggestion, setIncludeSuggestion] = useState(false);
  const [publicTitle, setPublicTitle] = useState('پاسخ نوش‌اپ به پیشنهاد یکی از همراهان');
  const [publicError, setPublicError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try { setFeedback(await FeedbackService.getAllFeedback()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'دریافت بازخوردها انجام نشد.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);

  const updateStatus = async (status: UserFeedback['status']) => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await FeedbackService.updateFeedbackStatus(selected.id, status);
      const updated = { ...selected, status };
      setSelected(updated);
      setFeedback(items => items.map(item => item.id === selected.id ? updated : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ذخیرهٔ وضعیت انجام نشد.'); }
    finally { setSaving(false); }
  };

  const openPublicReply = () => {
    setPublicTitle('پاسخ نوش‌اپ به پیشنهاد یکی از همراهان');
    setPublicReply('');
    setIncludeSuggestion(false);
    setPublicError('');
    setReplyOpen(true);
  };

  const sendPublicReply = async () => {
    if (!selected || !publicTitle.trim() || !publicReply.trim() || saving) return;
    setSaving(true);
    setPublicError('');
    try {
      const safeMessage = includeSuggestion && selected.message.trim()
        ? `پیشنهاد یکی از همراهان نوش‌اپ:\n«${selected.message.trim()}»\n\nپاسخ نوش‌اپ:\n${publicReply.trim()}`
        : publicReply.trim();
      await NotificationService.createNotification(publicTitle.trim(), safeMessage, 'all', 'ADMIN', [], selected.id);
      await FeedbackService.updateFeedbackStatus(selected.id, 'informed');
      const updated = { ...selected, status: 'informed' as const };
      setSelected(updated);
      setFeedback(items => items.map(item => item.id === selected.id ? updated : item));
      setReplyOpen(false);
    } catch (cause) {
      setPublicError(cause instanceof Error ? cause.message : 'ارسال پاسخ همگانی انجام نشد.');
    } finally { setSaving(false); }
  };

  const filtered = feedback.filter(item => `${item.user_name} ${item.message} ${categoryLabel(item.category)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const toPersian = (value: number) => value.toLocaleString('fa-IR');

  return <div className="space-y-5 animate-enter">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col items-start justify-between gap-4 bg-emerald-700 p-5 text-white sm:flex-row sm:items-center sm:p-7">
        <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><MessageCircle size={25}/></div><div><h2 className="text-xl font-black">صدای کاربران</h2><p className="mt-1 text-xs leading-6 text-emerald-100">نظرهایی که کاربران برای مدیریت فرستاده‌اند</p></div></div>
        <button type="button" onClick={() => void loadData()} aria-label="تازه‌سازی" className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
      </header>
      <div className="flex flex-wrap items-center gap-3 border-b bg-slate-50 p-4 sm:p-5">
        <label className="relative min-w-[200px] flex-1"><span className="sr-only">جستجو در بازخوردها</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="جستجو در پیام‌ها یا نام نمایشی…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm outline-none focus:border-emerald-600"/><Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/></label>
        <span className="rounded-xl border bg-white px-3 py-2.5 text-xs font-bold text-slate-600">کل پیام‌ها: {toPersian(feedback.length)}</span>
      </div>
      <p className="border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-xs leading-6 text-emerald-900">پیام‌ها در صف خصوصی مدیریت ذخیره می‌شوند. سایت شماره تلفن یا اطلاعات تماس کاربران را درخواست یا ذخیره نمی‌کند.</p>
      {error && <p role="alert" className="m-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <div className="flex items-center justify-center gap-3 py-16 text-slate-500"><Loader2 className="animate-spin" size={20}/>در حال دریافت بازخوردها…</div> : filtered.length ? <div className="divide-y divide-slate-100">
        {filtered.map(item => <button key={item.id} type="button" onClick={() => setSelected(item)} className="grid w-full grid-cols-1 gap-3 p-4 text-right transition hover:bg-emerald-50/50 sm:grid-cols-[minmax(130px,0.7fr)_minmax(0,2fr)_auto] sm:items-center sm:gap-5 sm:px-6">
          <span className="flex min-w-0 flex-col gap-1"><strong className="truncate text-sm text-slate-800">{item.user_name || 'همراه نوش‌اپ'}</strong><small className="text-[11px] text-slate-400">{dateLabel(item.created_at)}</small></span>
          <span className="min-w-0"><span className="mb-1 inline-block rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-800">{categoryLabel(item.category)}</span><span className="block truncate text-xs leading-6 text-slate-600">{item.message}</span></span>
          <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black ${item.status === 'new' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}><Clock size={13}/>{statusLabel(item.status)}<Eye size={13} className="mr-1"/></span>
        </button>)}
      </div> : <div className="px-5 py-16 text-center text-sm font-bold text-slate-400">{search ? 'پیامی با این جستجو پیدا نشد.' : 'هنوز پیامی دریافت نشده است.'}</div>}
    </section>

    {selected && <div className="fixed inset-0 z-[1200] grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title" className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 bg-emerald-700 px-5 py-4 text-white sm:px-6"><div><p className="text-xs font-bold text-emerald-100">{categoryLabel(selected.category)} · {dateLabel(selected.created_at)}</p><h3 id="feedback-detail-title" className="mt-1 text-lg font-black">پیام همراه نوش‌اپ</h3></div><button type="button" onClick={() => setSelected(null)} aria-label="بستن" className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><X size={19}/></button></header>
        <div className="space-y-5 overflow-y-auto p-5 sm:p-6"><p className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm leading-8 text-slate-800">{selected.message}</p>
          <div><h4 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700"><Tag size={16} className="text-emerald-700"/>وضعیت رسیدگی</h4><div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={() => void updateStatus('to_be_reviewed')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold disabled:opacity-50 ${selected.status === 'to_be_reviewed' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800'}`}><Eye size={15}/>بررسی شود</button>
            <button type="button" disabled={saving} onClick={() => void updateStatus('to_be_followed_up')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold disabled:opacity-50 ${selected.status === 'to_be_followed_up' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-800'}`}><Info size={15}/>پیگیری شود</button>
            <button type="button" disabled={saving} onClick={() => void updateStatus('handled')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold disabled:opacity-50 ${selected.status === 'handled' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'}`}><CheckCircle size={15}/>رسیدگی شد</button>
            <button type="button" disabled={saving} onClick={() => void updateStatus('informed')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold disabled:opacity-50 ${selected.status === 'informed' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}><ShieldCheck size={15}/>اطلاع حاصل شد</button>
          </div></div>
          {saving && <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="animate-spin" size={15}/>در حال ذخیرهٔ وضعیت…</p>}
          <button type="button" onClick={openPublicReply} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-xs font-black text-white transition hover:bg-indigo-800"><Send size={16}/>پاسخ عمومی از طریق اعلان برای همه</button>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
        </div>
      </section>
    </div>}

    {replyOpen && selected && <div className="fixed inset-0 z-[1300] grid place-items-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setReplyOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="public-reply-title" className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 bg-indigo-700 px-5 py-4 text-white"><div><p className="text-xs text-indigo-100">اعلان همگانی · همهٔ کاربران می‌بینند</p><h3 id="public-reply-title" className="mt-1 text-lg font-black">پاسخ عمومی به بازخورد</h3></div><button type="button" disabled={saving} onClick={() => setReplyOpen(false)} aria-label="بستن" className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><X size={19}/></button></header>
        <div className="space-y-4 p-5 sm:p-6">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950">فقط پاسخ و محتوای غیرخصوصی را منتشر کنید. شماره، نام یا اطلاعات شناسایی‌کننده را وارد نکنید. این اعلان در مرکز اعلان اپ دیده می‌شود؛ پیامک یا اعلان سیستمی گوشی نیست.</p>
          <label className="block text-xs font-bold text-slate-600">عنوان اعلان<input maxLength={120} value={publicTitle} onChange={event => setPublicTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-600"/></label>
          <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-700"><input type="checkbox" checked={includeSuggestion} onChange={event => setIncludeSuggestion(event.target.checked)} className="mt-1 accent-indigo-700"/><span>متن این بازخورد را هم نقل کن <span className="block text-[11px] text-slate-500">با فعال‌کردن این گزینه، متن کامل پیام برای همه منتشر می‌شود؛ پیش از ارسال مطمئن شوید اطلاعات خصوصی ندارد.</span></span></label>
          <label className="block text-xs font-bold text-slate-600">پاسخ نوش‌اپ<textarea required maxLength={4500} rows={5} value={publicReply} onChange={event => setPublicReply(event.target.value)} placeholder="پاسخ عمومی و مناسب برای همهٔ همراهان را بنویسید…" className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-indigo-600"/></label>
          {publicError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-700">{publicError}</p>}
          <button type="button" disabled={saving || !publicTitle.trim() || !publicReply.trim()} onClick={() => void sendPublicReply()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>}ارسال پاسخ همگانی</button>
        </div>
      </section>
    </div>}
  </div>;
};

export default FeedbackManager;
