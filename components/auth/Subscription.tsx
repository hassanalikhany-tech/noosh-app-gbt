
import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle2, ShieldAlert, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { UserService } from '../../services/userService';
import { PaymentService } from '../../services/paymentService';
import { UserProfile, AppConfig } from '../../types';

interface SubscriptionProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onLogout: () => void;
}

const Subscription: React.FC<SubscriptionProps> = ({ user, onUpdateUser, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<AppConfig | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [refId, setRefId] = useState('');

  useEffect(() => {
    // دریافت قیمت‌های بروز از سرور
    PaymentService.getPricing().then(setPricing);

    const urlParams = new URLSearchParams(window.location.search);
    const authority = urlParams.get('Authority');
    const status = urlParams.get('Status');

    if (authority && status === 'OK') {
      handleVerify(authority);
    } else if (status === 'NOK') {
      setVerifyStatus('failed');
    }
  }, []);

  const handleVerify = async (auth: string) => {
    setVerifyStatus('verifying');
    const result = await PaymentService.verifyPayment(auth);
    if (result.success) {
      setVerifyStatus('success');
      setRefId(result.refId || '');
      const updatedUser = await UserService.getCurrentUser();
      if (updatedUser) onUpdateUser(updatedUser);
    } else {
      setVerifyStatus('failed');
    }
  };

  const handleStartPayment = async (plan: 'monthly' | 'yearly') => {
    setLoading(true);
    const redirectUrl = await PaymentService.requestPayment(user, plan);
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      alert("خطا در اتصال به درگاه پرداخت. لطفا دوباره تلاش کنید.");
      setLoading(false);
    }
  };

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  if (!pricing && verifyStatus === 'idle') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-teal-600" size={40}/>
    </div>
  );

  if (verifyStatus === 'verifying') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="w-16 h-16 text-teal-600 animate-spin mb-6" />
        <h2 className="text-2xl font-black text-slate-800">در حال تایید تراکنش...</h2>
        <p className="text-slate-500 mt-2">لطفاً از صفحه خارج نشوید.</p>
      </div>
    );
  }

  if (verifyStatus === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 flex flex-col items-center text-center animate-enter">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={64} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">پرداخت با موفقیت انجام شد</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">اشتراک شما با موفقیت فعال شد. اکنون می‌توانید از تمامی امکانات اپلیکیشن نوش استفاده کنید.</p>
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
             <span className="text-xs font-bold text-slate-400 block mb-1">کد پیگیری زرین‌پال:</span>
             <span className="text-xl font-black text-slate-700 font-mono tracking-widest">{refId}</span>
          </div>
          <button onClick={() => window.location.href = '/'} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">ورود به برنامه</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white w-full max-w-lg overflow-hidden rounded-[3rem] shadow-2xl border border-gray-100 animate-enter">
        <div className="bg-gradient-to-br from-rose-600 to-pink-700 p-8 text-white text-center">
          <ShieldAlert size={64} className="mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-black mb-2">تمدید اشتراک ویژه</h1>
          <p className="opacity-90">برای دسترسی به بانک پخت‌ها، اشتراک خود را تمدید کنید.</p>
        </div>

        <div className="p-8">
          {verifyStatus === 'failed' && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 animate-shake">
              <XCircle size={24} />
              <div className="text-right">
                <p className="text-sm font-black">پرداخت ناموفق بود یا لغو شد.</p>
                <p className="text-[10px] opacity-70">اگر مبلغی کسر شده، طی ۷۲ ساعت به حساب شما بازمی‌گردد.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-8 text-gray-700 font-bold bg-gray-50 p-4 rounded-2xl">
             <span>وضعیت حساب:</span>
             <span className="text-rose-500 flex items-center gap-2">
               <Clock size={18} />
               منقضی شده
             </span>
          </div>

          <div className="space-y-4 mb-8">
            <button 
              onClick={() => handleStartPayment('monthly')}
              disabled={loading}
              className="w-full p-6 bg-white border-2 border-slate-100 hover:border-teal-500 rounded-[2rem] transition-all flex items-center justify-between group active:scale-95 shadow-sm"
            >
              <div className="text-right">
                <h4 className="font-black text-slate-800">اشتراک یک ماهه</h4>
                <p className="text-xs text-slate-400 font-bold">دسترسی کامل ۳۰ روزه</p>
              </div>
              <div className="text-left">
                <span className="text-xl font-black text-teal-600">{toPersian((pricing?.monthly_price || 250000) / 10)}</span>
                <span className="text-[10px] text-slate-400 font-bold mr-1">تومان</span>
              </div>
            </button>

            <button 
              onClick={() => handleStartPayment('yearly')}
              disabled={loading}
              className="w-full p-6 bg-teal-50 border-2 border-teal-200 hover:border-teal-500 rounded-[2rem] transition-all flex items-center justify-between group active:scale-95 shadow-md relative overflow-hidden"
            >
              <div className="absolute top-2 left-[-20px] bg-amber-400 text-slate-900 text-[8px] font-black py-1 px-8 -rotate-45 shadow-sm">تخفیف ویژه</div>
              <div className="text-right">
                <h4 className="font-black text-slate-800">اشتراک یک ساله</h4>
                <p className="text-xs text-slate-400 font-bold">دسترسی کامل ۳۶۵ روزه</p>
              </div>
              <div className="text-left">
                <span className="text-xl font-black text-teal-600">{toPersian((pricing?.yearly_price || 2500000) / 10)}</span>
                <span className="text-[10px] text-slate-400 font-bold mr-1">تومان</span>
              </div>
            </button>
          </div>

          <button 
            onClick={onLogout}
            className="w-full py-4 text-slate-400 hover:text-slate-600 font-black text-sm rounded-2xl transition-all"
          >
            خروج از حساب
          </button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
