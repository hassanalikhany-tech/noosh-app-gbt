import { GuestService } from '../../services/guestService';
import { englishDigits } from '../../utils/text';

import React, { useState, useEffect } from 'react';
import { Smartphone, ShieldCheck, Loader2, ArrowLeft, ArrowRight, AlertCircle, User, UserPlus, Info, Ticket, ShieldAlert, MonitorOff, ChefHat } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { SecurityService } from '../../services/securityService';

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthStep = 'start' | 'mobile' | 'registration' | 'otp' | 'device_check';

const RESEND_COOLDOWN = 60;

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [step, setStep] = useState<AuthStep>('start');
  const [mobile, setMobile] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [tempAuthData, setTempAuthData] = useState<any>(null);

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => document.getElementById('otp-input-0')?.focus(), 100);
    }
  }, [step]);

  useEffect(() => {
    const timer = setInterval(() => setResendTimer(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const verify = async () => {
      if (GuestService.isActive()) { setIsAuthenticated(true); return; }
      const { isValid, user } = await AuthService.checkSession();
      setIsAuthenticated(isValid && user?.isActive !== false);
    };
    verify().catch(() => setIsAuthenticated(false));

    // شنود رویداد خروج برای بازگشت به صفحه لاگین
    const handleLogoutEvent = () => {
      setIsAuthenticated(false);
      setStep('start');
      setOtp(['', '', '', '', '', '']);
      AuthService.clearPhoneVerification();
    };

    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const validateName = (name: string) => /^[\p{L}\p{M}\s'-]{2,}$/u.test(name.trim());

  const sendCode = async () => {
    const normalizedPhone = AuthService.normalizePhoneNumber(mobile);
    if (!normalizedPhone) return setError('شماره را با کد کشور وارد کنید؛ نمونه: ‎+1، ‎+44، ‎+61 یا شمارهٔ ایران با 09.');
    setIsLoading(true);
    setError('');
    try {
      setMobile(normalizedPhone);
      const res = await AuthService.sendOtp(normalizedPhone);
      if (res.success) {
        setOtp(['', '', '', '', '', '']);
        setStep('otp');
        setResendTimer(RESEND_COOLDOWN);
      } else setError(res.message);
    } catch { setError('ارسال کد انجام نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.'); }
    finally { setIsLoading(false); }
  };

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendCode();
  };

  const finishVerifiedLogin = async (verifiedUser: any) => {
    const deviceCheck = await SecurityService.validateDevice(verifiedUser.uid, btoa(navigator.userAgent).substring(0, 16));
    if (deviceCheck.isAllowed) setIsAuthenticated(true);
    else { setTempAuthData(verifiedUser); setStep('device_check'); }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(firstName) || !validateName(lastName)) return setError('نام و نام خانوادگی را با حروف وارد کنید.');
    setIsLoading(true);
    setError('');
    try {
      const res = await AuthService.completeRegistration(mobile, { firstName: firstName.trim(), lastName: lastName.trim(), referralCode });
      if (res.success && res.user) await finishVerifiedLogin(res.user);
      else setError(res.message || 'ثبت حساب کامل نشد. دوباره تلاش کنید.');
    } catch { setError('ثبت حساب کامل نشد. اتصال اینترنت را بررسی کنید.'); }
    finally { setIsLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return setError('کد تأیید ۶ رقمی را کامل وارد کنید.');
    setIsLoading(true);
    setError('');
    try {
      const res = await AuthService.verifyOtp(mobile, code);
      if (res.success && res.user) await finishVerifiedLogin(res.user);
      else if (res.success && res.needsRegistration) setStep('registration');
      else setError(res.message || 'کد وارد شده صحیح نیست.');
    } catch { setError('تأیید کد کامل نشد. اتصال اینترنت را بررسی کنید.'); }
    finally { setIsLoading(false); }
  };

  const handleReplaceDevice = async () => {
    if (!tempAuthData) return;
    setIsLoading(true);
    try {
        await SecurityService.replaceActiveDevice(tempAuthData.uid, btoa(navigator.userAgent).substring(0, 16));
        setIsAuthenticated(true);
    } catch (e) {
        setError("خطا در تعویض دستگاه.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const val = englishDigits(value).replace(/[^0-9]/g, '');
    if (!val && value !== '') return;
    if (val.length > 1) {
      const pastedCode = val.slice(0, 6).split('');
      setOtp([...pastedCode, ...Array(6 - pastedCode.length).fill('')]);
      document.getElementById(`otp-input-${Math.min(pastedCode.length, 5)}`)?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < 5) document.getElementById(`otp-input-${index + 1}`)?.focus();
  };

  const returnToPhoneEntry = () => {
    AuthService.clearPhoneVerification();
    setStep('mobile');
    setError('');
    setOtp(['', '', '', '', '', '']);
  };

  if (isAuthenticated === null) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white dir-rtl">
      <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
      <p className="font-black animate-pulse">در حال بررسی امنیت حساب...</p>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="auth-screen min-h-[100dvh] w-full flex items-center justify-center p-4 dir-rtl">
      <div className="auth-panel w-full max-w-md min-h-[620px] bg-white rounded-[3.5rem] shadow-2xl p-8 sm:p-10 animate-enter overflow-hidden transition-all duration-500 border border-white/20 flex flex-col justify-center">
        <div className="flex flex-col items-center mb-6 shrink-0">
          <img src="https://i.ibb.co/gMDKtj4p/3.png" alt="Logo" className="w-20 h-20 animate-float drop-shadow-xl logo-animate" />
          <div className="mt-3 text-center">
             <div className="flex items-baseline gap-1 justify-center" style={{ direction: 'ltr' }}>
                <span className="text-4xl font-black italic text-slate-900">NOOSH</span>
                <span className="text-xl font-black text-teal-600">APP</span>
             </div>
          </div>
        </div>
        <div id="recaptcha-container" className="auth-recaptcha-container" aria-label="بررسی امنیتی درخواست پیامک" />

        {step === 'start' && (
          <div className="space-y-4">
            <div className="text-center mb-5">
              <h1 className="text-2xl sm:text-[27px] font-black text-slate-900">به نوش خوش آمدی</h1>
            </div>

            <button type="button" onClick={() => { GuestService.start(); setIsAuthenticated(true); }} className="onboard-choice group w-full text-right p-5 sm:p-6 rounded-[1.6rem] bg-[#173d32] hover:bg-[#204c3f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 text-white shadow-lg shadow-emerald-950/10 transition-all">
              <span className="flex items-center gap-4">
                <span className="w-12 h-12 shrink-0 rounded-2xl bg-white/10 text-emerald-200 flex items-center justify-center"><ChefHat size={23} /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-black">ادامه به نوش</strong>
                  <small className="block text-[11px] leading-5 text-emerald-100/75 mt-1">شروع بدون ساخت حساب</small>
                </span>
                <ArrowLeft className="text-emerald-200 shrink-0 group-hover:-translate-x-1 transition-transform" size={19} />
              </span>
            </button>

            <div className="pt-2 text-center border-t border-slate-100">
              <button type="button" onClick={() => { setError(''); setStep('mobile'); }} className="inline-flex items-center gap-1 text-[11px] font-black text-teal-700 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg px-1 py-2">ورود یا ساخت حساب <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {step === 'mobile' && (
          <form onSubmit={handleMobileSubmit} className="space-y-6">
            <p className="text-slate-500 font-bold text-sm text-center">شماره موبایل را همراه کد کشور وارد کنید</p>
            <div className="relative group">
              <input type="tel" dir="ltr" inputMode="tel" autoComplete="tel" maxLength={24} value={mobile} onChange={e => setMobile(englishDigits(e.target.value))} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none text-xl font-black text-center focus:border-teal-500 transition-all shadow-inner" placeholder="+1 415 555 0132  یا  09xxxxxxxxx" required />
              <Smartphone className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            </div>
            <p className="-mt-3 text-center text-[10px] font-bold leading-6 text-slate-400">آمریکا و کانادا ‎+1 · اروپا کد کشور مانند ‎+44 یا ‎+49 · استرالیا ‎+61 · ایران 09 یا ‎+98</p>
            {error && <div className="p-4 bg-rose-50 text-rose-500 text-[11px] font-black rounded-2xl text-center border border-rose-100">{error}</div>}
            <button disabled={isLoading} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 active:scale-95 transition-all">
              {isLoading ? <Loader2 className="animate-spin" /> : 'ارسال کد تأیید'} <ArrowRight size={22} />
            </button>
          </form>
        )}

        {step === 'registration' && (
          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            <div className="text-center mb-2"><h2 className="text-xl font-black text-slate-800">خوش آمدید!</h2></div>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex gap-2 items-start">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-800 font-bold leading-tight">نام و نام خانوادگی را با حروف فارسی یا لاتین وارد کنید.</p>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <input type="text" autoComplete="given-name" placeholder="نام" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-center focus:border-teal-500 transition-all text-sm" required />
                <UserPlus className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              </div>
              <div className="relative group">
                <input type="text" autoComplete="family-name" placeholder="نام خانوادگی" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-center focus:border-teal-500 transition-all text-sm" required />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              </div>
              <div className="relative group">
                <input type="text" placeholder="کد معرف (اختیاری)" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} className="w-full px-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-center focus:border-emerald-500 transition-all text-sm" />
                <Ticket className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              </div>
            </div>
            {error && <div className="p-3 bg-rose-50 text-rose-500 text-[10px] font-black rounded-xl text-center border border-rose-100">{error}</div>}
            {error && <div className="p-3 bg-rose-50 text-rose-500 text-[10px] font-black rounded-xl text-center border border-rose-100">{error}</div>}
            <button disabled={isLoading} className="w-full py-4 bg-teal-600 text-white rounded-[1.5rem] font-black text-base flex items-center justify-center gap-3 transition-all">{isLoading ? <Loader2 className="animate-spin" /> : <>ساخت حساب کاربری <ArrowRight size={20} /></>}</button>
            <button type="button" onClick={returnToPhoneEntry} className="w-full text-slate-400 font-bold text-[10px] py-1">اصلاح شماره موبایل</button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center"><h2 className="text-2xl font-black text-slate-800">کد تأیید</h2><p className="text-slate-500 font-bold text-xs">کد ۶ رقمی ارسال‌شده به <bdi dir="ltr">{mobile}</bdi> را وارد کنید</p></div>
            <div className="flex justify-center gap-2" style={{ direction: 'ltr' }}>
              {otp.map((digit, idx) => (
                <input key={idx} id={`otp-input-${idx}`} type="tel" inputMode="numeric" autoComplete={idx === 0 ? 'one-time-code' : 'off'} aria-label={`رقم ${idx + 1} کد تأیید`} maxLength={6} value={digit} onChange={e => handleOtpChange(idx, e.target.value)} onKeyDown={e => e.key === 'Backspace' && !otp[idx] && idx > 0 && document.getElementById(`otp-input-${idx - 1}`)?.focus()} className="w-10 h-14 sm:w-11 sm:h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl text-2xl font-black text-center outline-none focus:border-teal-500 shadow-sm" />
              ))}
            </div>
            {error && <div className="p-3 bg-rose-50 text-rose-500 text-[10px] font-black rounded-xl text-center border border-rose-100">{error}</div>}
            <button disabled={isLoading} className="w-full py-4 bg-teal-600 text-white rounded-[1.5rem] font-black text-base flex items-center justify-center gap-3 active:scale-95 transition-all">
              {isLoading ? <Loader2 className="animate-spin" /> : 'ورود به سامانه'} <ShieldCheck size={20} />
            </button>
            <div className="flex flex-col items-center gap-3">
              <button type="button" disabled={resendTimer > 0 || isLoading} onClick={() => void sendCode()} className={`text-xs font-black transition-all ${resendTimer > 0 ? 'text-slate-300' : 'text-teal-600 hover:text-teal-800'}`}>
                {resendTimer > 0 ? `ارسال مجدد کد تا ${resendTimer.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])} ثانیه` : 'دریافت مجدد کد تایید'}
              </button>
              <button type="button" onClick={returnToPhoneEntry} className="text-slate-400 font-bold text-xs flex items-center justify-center gap-2"><ArrowLeft size={14} /> اصلاح شماره موبایل</button>
            </div>
          </form>
        )}

        {step === 'device_check' && (
          <div className="space-y-8 text-center">
            <div className="p-6 bg-rose-50 rounded-[2.5rem] border border-rose-100 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><MonitorOff size={32}/></div>
                <h2 className="text-2xl font-black text-rose-900">حساب روی دستگاه دیگری فعال است</h2>
                <p className="text-sm font-bold text-rose-700 leading-relaxed">
                    مطابق قوانین اشتراک اپلیکیشن نوش، هر اکانت تنها می‌تواند روی یک دستگاه سخت‌افزاری فعال باشد.
                </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-right space-y-2">
                <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase"><Info size={14}/> راهنما</div>
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                    با کلیک روی دکمه زیر، دسترسی دستگاه قبلی لغو شده و این گوشی به عنوان دستگاه اصلی شما ثبت می‌گردد. این کار باعث خروج شما از گوشی قبلی خواهد شد.
                </p>
            </div>
            <div className="space-y-4">
                <button onClick={handleReplaceDevice} disabled={isLoading} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl">
                  {isLoading ? <Loader2 className="animate-spin" /> : 'غیرفعال‌سازی قبلی و جایگزینی'} <ShieldAlert size={22} />
                </button>
                <button onClick={returnToPhoneEntry} className="text-slate-400 font-bold text-sm">انصراف و خروج</button>
            </div>
          </div>
        )}
        {step === 'mobile' && <div className="guest-entry">
          <button type="button" onClick={() => { setError(''); setStep('start'); }} className="mx-auto flex items-center gap-2 text-xs font-black text-teal-700 hover:text-teal-900"><ArrowRight size={15} /> بازگشت به انتخاب روش شروع</button>
        </div>}
      </div>
    </div>
  );

  return <>{children}</>;
};

export default AuthGate;
