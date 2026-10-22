import React, { FormEvent, useEffect, useState } from 'react';
import { Bell, Loader2, RefreshCw, Send } from 'lucide-react';
import { NotificationService } from '../../services/notificationService';
import { Notification } from '../../types';

const NotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try { setNotifications(await NotificationService.getAllNotifications()); setNotice(''); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'دریافت اعلان‌ها انجام نشد.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !message.trim() || sending) return;
    setSending(true);
    setNotice('');
    try {
      const sent = await NotificationService.createNotification(title, message, 'all', 'ADMIN');
      setNotifications(items => [sent, ...items]);
      setTitle(''); setMessage('');
      setNotice('اعلان همگانی ثبت شد و در مرکز اعلان همراهان نوش‌اپ نمایش داده می‌شود.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'ارسال اعلان انجام نشد.'); }
    finally { setSending(false); }
  };

  return <div className="space-y-5 animate-enter">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-4 bg-indigo-700 p-5 text-white sm:p-7"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><Bell size={24}/></div><div><h2 className="text-xl font-black">اعلان همگانی</h2><p className="mt-1 text-xs leading-6 text-indigo-100">پیام عمومی که همهٔ کاربران در مرکز اعلان اپ می‌بینند</p></div></header>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-7">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">این اعلان برای همهٔ همراهان قابل مشاهده است؛ اطلاعات شخصی، شماره تماس یا متن خصوصی را در آن ننویسید. اعلان درون اپ نمایش داده می‌شود و پیامک یا اعلان سیستمی گوشی نیست.</p>
        <label className="block text-xs font-bold text-slate-600">عنوان اعلان<input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="مثلاً: پاسخ نوش‌اپ به پیشنهاد همراهان" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-600"/></label>
        <label className="block text-xs font-bold text-slate-600">متن عمومی<textarea required maxLength={5000} rows={5} value={message} onChange={event => setMessage(event.target.value)} placeholder="متن امن و عمومی پاسخ را بنویسید…" className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-indigo-600"/></label>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={sending || !title.trim() || !message.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-black text-white disabled:opacity-50">{sending ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>}ارسال به همه</button><button type="button" onClick={() => void load()} aria-label="تازه‌سازی اعلان‌ها" className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-600"><RefreshCw size={17} className={loading ? 'animate-spin' : ''}/></button></div>
        {notice && <p role="status" className={`rounded-xl px-4 py-3 text-xs leading-6 ${notice.includes('انجام نشد') || notice.includes('نامعتبر') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>{notice}</p>}
      </form>
    </section>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b bg-slate-50 px-5 py-4"><h3 className="font-black text-slate-800">اعلان‌های ثبت‌شده</h3></div>
      {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="animate-spin" size={18}/>در حال دریافت…</div> : notifications.length ? <div className="divide-y divide-slate-100">{notifications.map(item => <article key={item.id} className="px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-black text-slate-800">{item.title}</h4><time className="text-[11px] text-slate-400">{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.send_time))}</time></div><p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-slate-600">{item.message}</p></article>)}</div> : <p className="py-12 text-center text-sm text-slate-400">هنوز اعلانی ثبت نشده است.</p>}
    </section>
  </div>;
};

export default NotificationManager;
