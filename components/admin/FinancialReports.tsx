
import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Wallet, CheckCircle, Clock, Users, RefreshCw, Loader2, ArrowUpRight } from 'lucide-react';
import { SettlementService } from '../../services/settlementService';

const FinancialReports: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await SettlementService.getFinancialSummary();
    setSummary(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={48}/></div>;

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><PieChart className="text-indigo-600"/> داشبورد تحلیلی مالی</h2>
         <button onClick={loadData} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><RefreshCw size={20}/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform"></div>
            <div className="relative z-10 space-y-4">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl w-fit shadow-xl"><Wallet size={24}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase">کل پورسانت‌های تولید شده</p><h4 className="text-2xl font-black text-slate-800 mt-1">{toPersian(summary.total_commissions.toLocaleString())} <span className="text-[10px]">ریال</span></h4></div>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform"></div>
            <div className="relative z-10 space-y-4">
                <div className="p-4 bg-emerald-500 text-white rounded-2xl w-fit shadow-xl"><CheckCircle size={24}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase">مجموع تسویه شده</p><h4 className="text-2xl font-black text-emerald-600 mt-1">{toPersian(summary.paid_commissions.toLocaleString())} <span className="text-[10px]">ریال</span></h4></div>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-50 rounded-full group-hover:scale-150 transition-transform"></div>
            <div className="relative z-10 space-y-4">
                <div className="p-4 bg-amber-500 text-white rounded-2xl w-fit shadow-xl"><Clock size={24}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase">تعهدات مالی (در انتظار)</p><h4 className="text-2xl font-black text-amber-600 mt-1">{toPersian(summary.pending_commissions.toLocaleString())} <span className="text-[10px]">ریال</span></h4></div>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-50 rounded-full group-hover:scale-150 transition-transform"></div>
            <div className="relative z-10 space-y-4">
                <div className="p-4 bg-rose-500 text-white rounded-2xl w-fit shadow-xl"><Users size={24}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase">تعداد همکاران فعال</p><h4 className="text-2xl font-black text-slate-800 mt-1">{toPersian(summary.visitor_count)} <span className="text-[10px]">ویزیتور</span></h4></div>
            </div>
         </div>
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
           <div className="shrink-0 p-6 bg-white/10 rounded-[2rem] border border-white/10"><TrendingUp size={64} className="text-emerald-400"/></div>
           <div className="space-y-4">
              <h3 className="text-3xl font-black leading-tight">چشم‌انداز سودآوری سیستم معرفی</h3>
              <p className="text-slate-400 leading-relaxed font-bold">در حال حاضر {toPersian(Math.round((summary.paid_commissions / (summary.total_commissions || 1)) * 100))} درصد از کل پورسانت‌های تعلق گرفته به ویزیتورها با موفقیت تسویه شده است. شفافیت مالی اولویت اصلی اپلیکیشن نوش است.</p>
              <div className="flex gap-4 pt-2">
                 <div className="px-5 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 text-xs font-black">وضعیت شبکه: پایدار</div>
                 <div className="px-5 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 text-xs font-black">تراکنش‌های روز: {toPersian(12)} مورد</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
