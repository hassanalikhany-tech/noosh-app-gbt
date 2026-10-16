
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Wallet, ArrowUpRight, ArrowDownRight, Activity, PieChart, FileSpreadsheet, RefreshCw, Loader2, Target, ShieldAlert, Smartphone, Monitor } from 'lucide-react';
import { AnalyticsService } from '../../services/analyticsService';
import { AnalyticsData } from '../../types';

const SystemAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const result = await AnalyticsService.getDashboardMetrics();
    setData(result);
    setLoading(false);
  };

  useEffect(() => { loadAnalytics(); }, []);

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  if (loading || !data) return (
    <div className="py-32 flex flex-col items-center justify-center gap-6">
        <Loader2 className="animate-spin text-indigo-600" size={60} />
        <p className="font-black text-slate-400 animate-pulse">در حال تحلیل هوشمند داده‌های سیستم...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-enter">
      {/* هدر اکشن‌ها */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-900 text-teal-400 rounded-3xl shadow-2xl"><Activity size={32}/></div>
            <div>
                <h2 className="text-3xl font-black text-slate-800">داشبورد هوش تجاری نوش</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Business Intelligence & User Insights</p>
            </div>
         </div>
         <div className="flex gap-3">
            <button onClick={() => AnalyticsService.exportUserReport()} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95">
                <FileSpreadsheet size={20}/> استخراج داده‌های CRM
            </button>
            <button onClick={loadAnalytics} className="p-4 bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                <RefreshCw size={24}/>
            </button>
         </div>
      </div>

      {/* کارت‌های KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[5rem] group-hover:scale-125 transition-transform"></div>
            <div className="relative z-10 flex flex-col gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Users size={24}/></div>
                <div><span className="text-[10px] font-black text-slate-400 uppercase">نرخ تبدیل (CR)</span><h4 className="text-3xl font-black text-slate-800 mt-1">{toPersian(data.conversionRate.toFixed(1))}%</h4></div>
                <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg"><ArrowUpRight size={12}/> رشد پایدار</div>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[5rem] group-hover:scale-125 transition-transform"></div>
            <div className="relative z-10 flex flex-col gap-4">
                <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><Target size={24}/></div>
                <div><span className="text-[10px] font-black text-slate-400 uppercase">نرخ ریزش (Churn)</span><h4 className="text-3xl font-black text-slate-800 mt-1">{toPersian(data.churnRate.toFixed(1))}%</h4></div>
                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 bg-slate-50 w-fit px-2 py-1 rounded-lg">اشتراک‌های منقضی</div>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[5rem] group-hover:scale-125 transition-transform"></div>
            <div className="relative z-10 flex flex-col gap-4">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Wallet size={24}/></div>
                <div><span className="text-[10px] font-black text-slate-400 uppercase">کل درآمد ناخالص</span><h4 className="text-2xl font-black text-slate-800 mt-1">{toPersian(data.totalRevenue.toLocaleString())} <span className="text-[10px]">ریال</span></h4></div>
                <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg"><ArrowUpRight size={12}/> پرداخت‌های موفق</div>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[5rem] group-hover:scale-125 transition-transform"></div>
            <div className="relative z-10 flex flex-col gap-4">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><BarChart3 size={24}/></div>
                <div><span className="text-[10px] font-black text-slate-400 uppercase">پورسانت‌های جاری</span><h4 className="text-2xl font-black text-slate-800 mt-1">{toPersian(data.visitorStats.pendingCommissions.toLocaleString())} <span className="text-[10px]">ریال</span></h4></div>
                <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded-lg">تعهدات ویزیتوری</div>
            </div>
         </div>
      </div>

      {/* بخش آنالیز بصری و نمودارها */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]"></div>
              <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-center">
                      <h3 className="text-xl font-black flex items-center gap-3"><PieChart className="text-teal-400"/> توزیع پلن‌های اشتراک</h3>
                      <span className="text-[10px] font-bold text-slate-500">Live Snapshot</span>
                  </div>
                  
                  <div className="flex flex-col gap-6">
                      <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-black"><span>اشتراک یک ساله (Yearly)</span><span>{toPersian(data.planDistribution.yearly)} کاربر</span></div>
                          <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-teal-500 transition-all duration-1000" style={{ width: `${(data.planDistribution.yearly / (data.activeSubscribers || 1)) * 100}%` }}></div></div>
                      </div>
                      <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-black"><span>اشتراک ماهانه (Monthly)</span><span>{toPersian(data.planDistribution.monthly)} کاربر</span></div>
                          <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(data.planDistribution.monthly / (data.activeSubscribers || 1)) * 100}%` }}></div></div>
                      </div>
                  </div>

                  <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-between">
                      <div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase">درآمد از پلن‌های سالانه</span><h5 className="text-lg font-black text-teal-400">{toPersian(data.yearlyRevenue.toLocaleString())} ریال</h5></div>
                      <TrendingUp size={32} className="text-teal-500/30" />
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black flex items-center gap-3 text-slate-800"><Smartphone className="text-indigo-600"/> سلامت پایگاه داده کاربران</h3>
                  <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black border border-emerald-100">تحلیل پایدار</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-2 text-center">
                      <span className="text-4xl font-black text-slate-800">{toPersian(data.totalUsers)}</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase">کل کاربران ثبت‌نامی</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-2 text-center">
                      <span className="text-4xl font-black text-indigo-600">{toPersian(data.activeSubscribers)}</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase">مشترکین فعال لحظه‌ای</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-2 text-center">
                      <span className="text-4xl font-black text-amber-600">{toPersian(data.visitorStats.totalVisitors)}</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase">تعداد کل همکاران (ویزیتور)</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-2 text-center">
                      <span className="text-4xl font-black text-emerald-600">{toPersian(data.visitorStats.activeReferrals)}</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase">دعوت‌های موفق و فعال</p>
                  </div>
              </div>

              <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600"><Monitor size={20}/></div>
                  <p className="text-[11px] text-indigo-800 font-bold leading-relaxed">بیش از <span className="font-black">۸۲٪</span> کاربران از اپلیکیشن در پلتفرم‌های موبایلی استفاده می‌کنند. بهینه‌سازی UI موبایل اولویت است.</p>
              </div>
          </div>
      </div>

      {/* هشدار پایش هوشمند */}
      <div className="bg-rose-50 border border-rose-100 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-8 animate-pulse">
          <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0"><ShieldAlert size={32}/></div>
          <div className="space-y-1">
              <h4 className="text-lg font-black text-rose-900">سامانه پایش هوشمند ریزش (Churn Watcher)</h4>
              <p className="text-sm font-bold text-rose-700 leading-relaxed">در حال حاضر سیستم آنالیزی نشان می‌دهد که {toPersian(data.churnRate.toFixed(1))} درصد از کاربران پس از اتمام اشتراک تمدید نکرده‌اند. پیشنهاد می‌شود کمپین‌های بازگشت کاربر (Retargeting) را فعال کنید.</p>
          </div>
      </div>
    </div>
  );
};

export default SystemAnalytics;
