import React, { FormEvent, useEffect, useState } from 'react';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import LocalAdminDashboard from './LocalAdminDashboard';

type AuthState = 'checking' | 'ready' | 'signed-out' | 'unconfigured';

const AdminAccessGate: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [state, setState] = useState<AuthState>('checking');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const checkSession = async () => {
    try {
      const response = await fetch('/.netlify/functions/admin-auth', { credentials: 'same-origin' });
      const result = await response.json();
      setState(!result.configured ? 'unconfigured' : result.authenticated ? 'ready' : 'signed-out');
    } catch {
      setState('unconfigured');
    }
  };
  useEffect(() => { void checkSession(); }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/.netlify/functions/admin-auth', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'ورود مدیر انجام نشد.');
      setPassword(''); setState('ready');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ارتباط با سرویس مدیریت انجام نشد.'); }
    finally { setBusy(false); }
  };

  if (state === 'checking') return <div className="min-h-screen grid place-items-center bg-[#f5f7f2]"><Loader2 className="animate-spin text-emerald-800" /></div>;
  const signOut = async () => {
    try { await fetch('/.netlify/functions/admin-auth', { method: 'DELETE', credentials: 'same-origin' }); } finally { setState('signed-out'); }
  };
  if (state === 'ready') return <LocalAdminDashboard onExit={onExit} onLogout={() => void signOut()} />;

  return <main dir="rtl" className="min-h-screen grid place-items-center bg-[#173c2b] px-4 py-10 text-slate-900">
    <section className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><ShieldCheck size={28} /></div>
      <h1 className="mt-5 text-center text-2xl font-black">ورود امن مدیر نوش</h1>
      <p className="mt-2 text-center text-sm leading-7 text-slate-500">پس از ورود، تغییرهای فهرست غذاها در GitHub ثبت می‌شوند تا Netlify نسخهٔ عمومی را به‌روز کند.</p>
      {state === 'unconfigured' ? <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-950">
        <strong>اتصال انتشار خودکار هنوز راه‌اندازی نشده است.</strong>
        <p className="mt-2">در Netlify، بخش Environment variables، سه متغیر محرمانهٔ <code>ADMIN_PASSWORD</code>، <code>ADMIN_SESSION_SECRET</code> و <code>GITHUB_TOKEN</code> را برای Production تنظیم کن و سایت را دوباره deploy کن. راهنمای کامل در docs/admin-publishing.md مخزن است. توکن فقط در Function می‌ماند و به مرورگر فرستاده نمی‌شود.</p>
        <button type="button" onClick={() => void checkSession()} className="mt-3 rounded-xl bg-amber-900 px-4 py-2 font-bold text-white">بررسی دوباره</button>
      </div> : <form onSubmit={signIn} className="mt-6 space-y-4">
        <label className="block text-sm font-bold">رمز مدیریت<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl bg-slate-50 px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-700" /></label>
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173c2b] px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={18} /> : <LockKeyhole size={18} />} ورود به مدیریت</button>
      </form>}
      {message && <p role="alert" className="mt-4 text-sm text-rose-700">{message}</p>}
      <button onClick={onExit} className="mt-5 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold">بازگشت به سایت</button>
    </section>
  </main>;
};

export default AdminAccessGate;
