
import React, { useState, useEffect } from 'react';
import { Banknote, TrendingUp, Save, Clock, Info, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { PaymentService } from '../../services/paymentService';
import { AppConfig } from '../../types';

const FinancialSettings: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState({ monthly: 0, yearly: 0 });

  const loadConfig = async () => {
    setLoading(true);
    const data = await PaymentService.getPricing();
    setConfig(data);
    setPrices({ monthly: data.monthly_price, yearly: data.yearly_price });
    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await PaymentService.updatePricing(prices.monthly, prices.yearly);
      await loadConfig();
      alert("قیمت‌های جدید با موفقیت در کل سیستم اعمال شد.");
    } finally {
      setSaving(false);
    }
  };

  const toPersian = (num: number) => num.toLocaleString('fa-IR');

  if (loading) return (
    <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
        <Loader2 className="animate-spin" size={40}/>
        <span className="font-black">در حال دریافت تنظیمات مالی...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-enter">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 bg-emerald-600 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-[1.5rem] shadow-xl">
              <Banknote size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-none">تنظیمات حق اشتراک</h2>
              <p className="text-[10px] opacity-70 font-bold mt-2 uppercase tracking-widest">Subscription Pricing Management</p>
            </div>
          </div>
          <button onClick={loadConfig} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
            <RefreshCw size={24} />
          </button>
        </div>

        <div className="p-10 space-y-10">
            <div className="grid md:grid-cols-2 gap-10">
                {/* Monthly Plan */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-slate-700 font-black text-sm pr-2">
                        <Clock size={18} className="text-emerald-500" /> قیمت اشتراک یک ماهه
                    </label>
                    <div className="relative group">
                        <input 
                            type="number"
                            value={prices.monthly}
                            onChange={e => setPrices({...prices, monthly: parseInt(e.target.value) || 0})}
                            className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-emerald-500 font-black text-xl text-center transition-all"
                        />
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">ریال</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold px-4">
                        معادل {toPersian(prices.monthly / 10)} تومان در ماه
                    </p>
                </div>

                {/* Yearly Plan */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-slate-700 font-black text-sm pr-2">
                        <TrendingUp size={18} className="text-indigo-500" /> قیمت اشتراک یک ساله
                    </label>
                    <div className="relative group">
                        <input 
                            type="number"
                            value={prices.yearly}
                            onChange={e => setPrices({...prices, yearly: parseInt(e.target.value) || 0})}
                            className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-black text-xl text-center transition-all"
                        />
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">ریال</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold px-4">
                        معادل {toPersian(prices.yearly / 10)} تومان در سال
                    </p>
                </div>
            </div>

            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl text-amber-500 shadow-sm shrink-0"><Info size={24}/></div>
                <div className="space-y-1">
                    <h4 className="font-black text-amber-800 text-sm">قانون حفاظت از پورسانت‌های گذشته</h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed font-bold">
                        با تغییر مبالغ در این صفحه، تنها خریدهای «جدید» تحت تاثیر قرار می‌گیرند. پورسانت‌هایی که ویزیتورها تا پیش از این لحظه دریافت کرده‌اند، ثابت مانده و تحت هیچ شرایطی تغییر نخواهد کرد. پورسانت‌های جدید به صورت خودکار ۲۰٪ و ۱۰٪ از قیمت‌های جدید محاسبه خواهند شد.
                    </p>
                </div>
            </div>

            <button 
                disabled={saving}
                onClick={handleSave}
                className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3"
            >
                {saving ? <Loader2 className="animate-spin"/> : <ShieldCheck size={24}/>}
                ذخیره و اعمال سراسری قیمت‌ها
            </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialSettings;
