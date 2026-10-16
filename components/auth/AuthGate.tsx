import { GuestService } from '../../services/guestService';
import { englishDigits } from '../../utils/text';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Loader2, ArrowLeft, ArrowRight, AlertCircle, User, UserPlus, Info, Ticket, ShieldAlert, MonitorOff } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { SecurityService } from '../../services/securityService';

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthStep = 'mobile' | 'registration' | 'otp' | 'device_check';

const RESEND_COOLDOWN = 60;

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [step, setStep] = useState<AuthStep>('mobile');
  const [mobile, setMobile] = useState('+');
  const [countryCode, setCountryCode] = useState('');
  const [nationalNumber, setNationalNumber] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
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
      const timeout = window.setTimeout(() => document.getElementById('otp-input-0')?.focus(), 100);
      return () => window.clearTimeout(timeout);
    }
    if (step === 'mobile' && isAuthenticated === false) {
      const timeout = window.setTimeout(() => phoneInputRef.current?.focus(), 100);
      return () => window.clearTimeout(timeout);
    }
  }, [step, isAuthenticated]);

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
      setMobile('+');
      setCountryCode('');
      setNationalNumber('');
      setStep('mobile');
      setOtp(['', '', '', '', '', '']);
      AuthService.clearPhoneVerification();
    };

    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const validateName = (name: string) => /^[\p{L}\p{M}\s'-]{2,}$/u.test(name.trim());

  const sendCode = async () => {
    const normalizedPhone = AuthService.normalizePhoneNumber(mobile);
    if (!normalizedPhone) return setError('شمارهٔ همراه را همراه با کد کشور وارد کنید.');
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

  const handleCountryCodeChange = (input: string) => {
    const digits = englishDigits(input).replace(/\D/g, '').slice(0, 3);
    setCountryCode(digits);
    setMobile(`+${digits}${nationalNumber}`);
  };

  const handleNationalNumberChange = (input: string) => {
    const digits = englishDigits(input).replace(/\D/g, '').slice(0, 14);
    setNationalNumber(digits);
    setMobile(`+${countryCode}${digits}`);
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

        {step === 'mobile' && (
          <div className="space-y-4">
          <form onSubmit={handleMobileSubmit} className="space-y-5">
            <div className="text-center">
              <h1 className="text-2xl sm:text-[27px] font-black text-slate-900">ورود یا ساخت حساب</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">بعد از + ابتدا کد کشور و سپس شمارهٔ تلفن همراه را وارد کنید</p>
            </div>
            <div dir="ltr" className="group flex items-stretch rounded-2xl bg-slate-100/80 p-2 transition-colors focus-within:bg-white">
              <label className="flex w-[6.5rem] shrink-0 flex-col justify-center rounded-xl px-2 py-2 transition-colors focus-within:bg-teal-50/70">
                <span dir="rtl" className="mb-1 text-center text-[10px] font-bold text-slate-500">کد کشور</span>
                <span className="flex items-center justify-center gap-1.5">
                  <span aria-hidden="true" className="text-lg font-black text-teal-700 select-none">+</span>
                  <input ref={phoneInputRef} id="phone-input" type="tel" dir="ltr" inputMode="tel" autoComplete="tel-country-code" autoFocus maxLength={3} value={countryCode} onChange={e => handleCountryCodeChange(e.target.value)} aria-label="کد کشور پس از علامت +" className="w-12 bg-transparent text-center text-lg font-black text-slate-800 outline-none placeholder:text-slate-400" required />
                </span>
              </label>
              <span aria-hidden="true" className="my-2 w-px shrink-0 bg-slate-300/70" />
              <label className="flex min-w-0 flex-1 flex-col justify-center rounded-xl px-3 py-2 transition-colors focus-within:bg-teal-50/70">
                <span dir="rtl" className="mb-1 text-center text-[10px] font-bold text-slate-500">شماره تلفن همراه</span>
                <input id="phone-number-input" type="tel" dir="ltr" inputMode="tel" autoComplete="tel-national" maxLength={Math.max(1, 15 - countryCode.length)} value={nationalNumber} onChange={e => handleNationalNumberChange(e.target.value)} aria-label="شماره تلفن همراه، بدون کد کشور" className="w-full bg-transparent px-1 py-1 text-left text-lg font-black text-slate-800 outline-none placeholder:text-slate-400" placeholder="شماره تلفن" required />
              </label>
            </div>
            {error && <div className="p-4 bg-rose-50 text-rose-500 text-[11px] font-black rounded-2xl text-center border border-rose-100">{error}</div>}
            <button disabled={isLoading} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 active:scale-95 transition-all">
              {isLoading ? <Loader2 className="animate-spin" /> : 'ارسال کد تأیید'} <ArrowRight size={22} />
            </button>
          </form>
          <div className="pt-3 text-center border-t border-slate-100">
            <button type="button" onClick={() => { GuestService.start(); setIsAuthenticated(true); }} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-600 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
              ورود به‌عنوان مهمان <ArrowLeft size={17} />
            </button>
          </div>
          </div>
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
