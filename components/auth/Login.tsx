
import { Mail, User, ArrowRight, AlertCircle, Loader2, ScanFace, CheckCircle2, Lock, CheckSquare, Square, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { UserService } from '../../services/userService';
import { UserProfile } from '../../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

// Adding missing GoogleIcon component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [bioStatus, setBioStatus] = useState<'idle' | 'scanning'>('idle');
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });
  const [appVersion, setAppVersion] = useState("V15.67"); // مقدار پیش‌فرض هماهنگ با متادیتا فعلی

  useEffect(() => {
    // خواندن داینامیک نسخه از فایل متادیتا
    const fetchMetadata = async () => {
      try {
        const response = await fetch('/metadata.json');
        if (response.ok) {
          const data = await response.json();
          if (data.name) {
            // استخراج بخش نسخه (مثلاً از "NOOSH APP V15.67" بخش "V15.67" را برمی‌دارد)
            const parts = data.name.split(' ');
            const version = parts[parts.length - 1];
            setAppVersion(version);
          }
        }
      } catch (err) {
        console.error("Failed to fetch app version from metadata:", err);
      }
    };
    fetchMetadata();

    const savedEmail = localStorage.getItem('noosh_saved_email');
    if (savedEmail) setFormData(prev => ({ ...prev, email: savedEmail }));
    
    const isBioActive = localStorage.getItem('noosh_biometric_active') === 'true';
    if (isBioActive && mode === 'login') handleTriggerBiometric();
  }, []);

  const handleTriggerBiometric = async () => {
    setBioStatus('scanning');
    const result = await UserService.loginWithBiometric();
    if (result.success && result.user) onLogin(result.user);
    setBioStatus('idle');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const result = await UserService.loginWithGoogle();
    if (result.success && result.user) onLogin(result.user);
    else setError(result.message || 'خطا در ورود با گوگل');
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') {
        setIsLoading(true);
        const res = await UserService.sendResetPassword(formData.email);
        if (res.success) setSuccess('لینک بازنشانی به ایمیل شما ارسال شد.');
        else setError(res.message);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError('');
    const result = mode === 'login' 
      ? await UserService.login(formData.email.trim(), formData.password)
      : await UserService.register({ ...formData });

    if (result.success && result.user) {
        if (rememberMe) localStorage.setItem('noosh_saved_email', formData.email);
        onLogin(result.user);
    } else {
        setError(result.message || 'خطا در عملیات');
    }
    setIsLoading(false);
  };

  const toPersianDigits = (num: string) => num.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'['0123456789'.indexOf(d)]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-100 p-4 sm:p-8 font-sans dir-rtl overflow-hidden">
      <div className="w-full max-w-6xl h-full max-h-[850px] flex flex-col lg:flex-row bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden border border-white">
        
        {/* بخش برندینگ (تیره) */}
        <div className="hidden lg:flex lg:w-1/2 metallic-navy relative flex-col items-center justify-center p-16 text-white overflow-hidden">
          <div className="animate-float mb-10 relative z-10 logo-animate">
            <img src="https://i.ibb.co/gMDKtj4p/3.png" alt="Logo" className="w-52 h-52 object-contain drop-shadow-[0_0_40px_rgba(45,212,191,0.5)]" />
          </div>
          <div className="text-center space-y-4 relative z-10">
            <div className="flex flex-col items-center" style={{ direction: 'ltr' }}>
              <div className="flex flex-row items-baseline justify-center gap-2">
                <span className="text-7xl font-black italic tracking-tighter">NOOSH</span>
                <span className="text-3xl font-black text-teal-400 italic">APP</span>
              </div>
              <div className="text-sm font-black text-teal-500/60 tracking-[0.6em] uppercase mt-2">
                {appVersion}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        </div>

        {/* بخش فرم (روشن) */}
        <div className="w-full lg:w-1/2 h-full flex flex-col justify-center p-8 sm:p-20 relative bg-white overflow-y-auto no-scrollbar">
          
          <div className="lg:hidden mb-12 flex flex-col items-center gap-3 logo-animate">
              <img src="https://i.ibb.co/gMDKtj4p/3.png" className="w-24 h-24 animate-float" alt="Logo" />
              <div className="text-center">
                 <div className="flex items-baseline justify-center gap-1" style={{ direction: 'ltr' }}>
                    <span className="text-4xl font-black italic text-slate-900">NOOSH</span>
                    <span className="text-xl font-black text-teal-600">APP</span>
                 </div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {appVersion}
                 </div>
              </div>
          </div>

          <div className="w-full max-w-md mx-auto space-y-8 animate-enter">
            <div className="text-center lg:text-right">
              <h2 className="text-4xl font-black text-slate-800 mb-2">
                {mode === 'login' ? 'خوش آمدید' : mode === 'register' ? 'عضویت در نوش' : 'بازیابی حساب'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 pr-4 uppercase tracking-[0.2em]">Full Name</label>
                  <div className="relative group">
                      <input type="text" placeholder="نام و نام خانوادگی" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-7 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold text-sm focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all pr-14" required />
                      <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={22} />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 pr-4 uppercase tracking-[0.2em]">Email Address</label>
                 <div className="relative group">
                      <input type="email" placeholder="example@email.com" dir="ltr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-7 py-4 bg-slate-50 border border-slate-100 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5 rounded-[1.5rem] outline-none transition-all font-bold text-sm text-left pr-14" required />
                      <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={22} />
                 </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-2">
                   <div className="px-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Security Password</label>
                   </div>
                   <div className="relative group">
                      <input type="password" placeholder="••••••••" dir="ltr" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-7 py-4 bg-slate-50 border border-slate-100 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/5 rounded-[1.5rem] outline-none transition-all font-bold text-sm text-left pr-14" required />
                      <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={22} />
                   </div>
                </div>
              )}

              {mode === 'login' && (
                  <div className="flex items-center gap-3 px-4">
                      <button type="button" onClick={() => setRememberMe(!rememberMe)} className="text-teal-600 transition-all active:scale-95 flex-shrink-0">
                          {rememberMe ? (
                            <div className="bg-teal-600 rounded-lg p-0.5 shadow-[0_5px_15px_-3px_rgba(13,148,136,0.6)] border-2 border-teal-500 flex items-center justify-center w-[30px] h-[30px]">
                               <Check size={24} className="text-white" strokeWidth={4} />
                            </div>
                          ) : (
                            <Square size={30} className="text-slate-300 border-[3px] border-slate-200 rounded-lg" />
                          )}
                      </button>
                      <span className="text-base font-black text-slate-800 cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>مرا به خاطر بسپار</span>
                  </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[11px] font-black flex items-center gap-3 border border-rose-100 animate-shake">
                  <AlertCircle size={20} /> {error}
                </div>
              )}
              
              {success && (
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[11px] font-black flex items-center gap-3 border border-emerald-100">
                  <CheckCircle2 size={20} /> {success}
                </div>
              )}

              <div className="space-y-4 pt-2">
                  <button type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[1.75rem] shadow-xl shadow-slate-200 flex items-center justify-center gap-4 active:scale-[0.98] transition-all">
                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : mode === 'login' ? 'ورود به حساب' : mode === 'register' ? 'ثبت‌نام و شروع' : 'ارسال لینک بازنشانی'}
                    <ArrowRight size={22} />
                  </button>

                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')} className="w-full text-[15px] font-black text-teal-700 hover:text-teal-800 transition-colors flex items-center justify-center gap-1 py-2 underline decoration-teal-600/50 underline-offset-[10px]">
                        آیا رمز خود را فراموش کرده اید ؟
                    </button>
                  )}
              </div>

              {mode !== 'forgot' && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button type="button" onClick={handleGoogleLogin} className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-100 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                    <GoogleIcon /> حساب گوگل
                  </button>
                  <button type="button" onClick={handleTriggerBiometric} className="flex items-center justify-center gap-3 py-4 bg-teal-50 text-teal-700 rounded-2xl font-black text-xs border border-teal-100 transition-all active:scale-95 shadow-sm">
                    {bioStatus === 'scanning' ? <Loader2 size={16} className="animate-spin" /> : <ScanFace size={20} />} ورود سریع
                  </button>
                </div>
              )}

              <div className="pt-4 text-center border-t border-slate-50 mt-6">
                <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setSuccess(''); setError(''); }} className="text-slate-500 font-black text-sm hover:text-teal-600 transition-all">
                  {mode === 'login' ? 'ساخت حساب کاربری جدید' : mode === 'register' ? 'قبلاً ثبت‌نام کرده‌اید؟ وارد شوید' : 'بازگشت به صفحه ورود'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
