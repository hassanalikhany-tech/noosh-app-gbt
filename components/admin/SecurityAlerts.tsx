
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Bell, CheckCircle, Search, Download, RefreshCw, Loader2, User, Smartphone, Globe, Clock, Filter, AlertTriangle, ShieldCheck, BarChart3, PieChart } from 'lucide-react';
import { AlertService } from '../../services/alertService';
import { SecurityAlert, RiskLevel } from '../../types';

const SecurityAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    const data = await AlertService.getSecurityAlerts();
    setAlerts(data);
    setLoading(false);
  };

  useEffect(() => { loadAlerts(); }, []);

  const handleAcknowledge = async (alertId: string) => {
    setProcessingId(alertId);
    try {
      await AlertService.acknowledgeAlert(alertId, "SYSTEM_ADMIN");
      await loadAlerts();
    } finally {
      setProcessingId(null);
    }
  };

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  const filtered = alerts.filter(a => {
    const matchesSearch = (a.user_id || "").includes(searchTerm) || (a.event_type || "").includes(searchTerm);
    const matchesRisk = filterRisk === 'all' || a.risk_level === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const getEventLabel = (type: string) => {
    switch(type) {
        case 'multi_device': return 'استفاده اشتراکی (چند دستگاه)';
        case 'referral_fraud': return 'تقلب در کد معرف';
        case 'payment_anomaly': return 'ناهنجاری در پرداخت';
        case 'login_brute_force': return 'حمله ورود (Brute Force)';
        case 'location_jump': return 'تغییر ناگهانی موقعیت';
        default: return type;
    }
  };

  if (loading && alerts.length === 0) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-rose-600" size={48} />
        <span className="font-black text-slate-400">در حال پایش وضعیت امنیت سیستم...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-enter">
      {/* هدر و آمار سریع */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-rose-600 text-white rounded-[2rem] shadow-2xl shadow-rose-200">
            <ShieldAlert size={36} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800">دیدبان امنیت و ضدتقلب</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Intelligent Anti-Fraud & Risk Monitor</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => AlertService.exportAlertsToExcel(alerts)} className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-sm shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
             <Download size={20}/> خروج اکسل
          </button>
          <button onClick={loadAlerts} className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-black transition-all">
             <RefreshCw size={24} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full opacity-50"></div>
            <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl relative z-10"><Bell size={28}/></div>
            <div className="relative z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase">هشدارهای جدید</span>
                <h4 className="text-3xl font-black text-rose-600 mt-1">{toPersian(alerts.filter(a=>a.status==='new').length)}</h4>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full opacity-50"></div>
            <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl relative z-10"><AlertTriangle size={28}/></div>
            <div className="relative z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase">تخلفات پرریسک</span>
                <h4 className="text-3xl font-black text-amber-600 mt-1">{toPersian(alerts.filter(a=>a.risk_level==='high').length)}</h4>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full opacity-50"></div>
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl relative z-10"><ShieldCheck size={28}/></div>
            <div className="relative z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase">نرخ سلامت سیستم</span>
                <h4 className="text-3xl font-black text-emerald-600 mt-1">٪{toPersian(98)}</h4>
            </div>
         </div>
      </div>

      {/* فیلترها و لیست اصلی */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="relative w-full md:w-96">
              <input 
                placeholder="جستجوی کاربر یا نوع تخلف..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-rose-500 font-bold text-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => setFilterRisk('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${filterRisk === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border-slate-200'}`}>همه</button>
              <button onClick={() => setFilterRisk('high')} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${filterRisk === 'high' ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>ریسک بالا</button>
              <button onClick={() => setFilterRisk('medium')} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${filterRisk === 'medium' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>ریسک متوسط</button>
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-right text-sm">
             <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-400">
               <tr>
                 <th className="p-5">کاربر هدف</th>
                 <th className="p-5">نوع هشدار امنیتی</th>
                 <th className="p-5 text-center">ریسک / امتیاز</th>
                 <th className="p-5 text-center">شناسه دستگاه / IP</th>
                 <th className="p-5 text-left">اقدام مدیریتی</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filtered.map(alert => (
                 <tr key={alert.id} className={`transition-colors ${alert.status === 'new' ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
                   <td className="p-5">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><User size={20}/></div>
                         <div className="flex flex-col">
                            <span className="font-black text-slate-800">{alert.user_name || "کاربر ناشناس"}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{alert.user_id}</span>
                         </div>
                      </div>
                   </td>
                   <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-700">{getEventLabel(alert.event_type)}</span>
                        <span className="text-[9px] text-slate-400 font-bold mt-1 flex items-center gap-1"><Clock size={10}/> {new Intl.DateTimeFormat('fa-IR', {timeStyle:'short', dateStyle:'short'}).format(new Date(alert.timestamp))}</span>
                      </div>
                   </td>
                   <td className="p-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                            alert.risk_level === 'high' ? 'bg-rose-100 text-rose-700' :
                            alert.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>{alert.risk_level}</span>
                        <span className="text-[10px] font-black text-slate-300">امتیاز: {toPersian(alert.risk_score)}</span>
                      </div>
                   </td>
                   <td className="p-5 text-center">
                      <div className="flex flex-col items-center gap-1 opacity-60">
                         <span className="text-[9px] font-mono flex items-center gap-1 border-b border-dashed"><Smartphone size={10}/> {alert.device_id}</span>
                         <span className="text-[9px] font-mono flex items-center gap-1"><Globe size={10}/> {alert.ip}</span>
                      </div>
                   </td>
                   <td className="p-5 text-left">
                      {alert.status !== 'acknowledged' ? (
                        <button 
                            disabled={processingId === alert.id}
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[11px] shadow-lg flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                          {processingId === alert.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>}
                          تایید بررسی
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-2 text-emerald-600 font-black text-[10px]">
                           <ShieldCheck size={16}/> بایگانی شد
                        </div>
                      )}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
           {filtered.length === 0 && !loading && (
             <div className="py-24 text-center text-slate-300 font-black italic flex flex-col items-center gap-4">
                <ShieldCheck size={64} className="opacity-10"/>
                هیچ مورد مشکوکی در حال حاضر وجود ندارد. امنیت سیستم پایدار است.
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SecurityAlerts;
