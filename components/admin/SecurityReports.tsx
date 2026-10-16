
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Smartphone, Globe, Clock, User, AlertTriangle, Eye, ShieldCheck, Shield } from 'lucide-react';
import { SecurityService } from '../../services/securityService';
import { SecurityLog } from '../../types';

const SecurityReports: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    const data = await SecurityService.getSecurityLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  
  const filtered = logs.filter(l => 
    (l.user_full_name || "").includes(searchTerm) || 
    (l.event_type || "").includes(searchTerm)
  );

  const getEventLabel = (type: string) => {
    switch(type) {
        case 'device_change': return 'تغییر دستگاه سخت‌افزاری';
        case 'multiple_login': return 'ورود همزمان چندگانه';
        case 'suspicious_ip': return 'آی‌پی مشکوک (تغییر ناگهانی)';
        case 'session_replace': return 'جایگزینی نشست وب';
        case 'login_failed': return 'تلاش ناموفق برای ورود';
        default: return type;
    }
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-500 text-white rounded-[1.5rem] shadow-xl shadow-rose-500/20">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-none">مرکز امنیت و مانیتورینگ</h2>
              <p className="text-[10px] text-rose-400 font-bold mt-2 uppercase tracking-widest">Subscription Guard & Security Logs</p>
            </div>
          </div>
          <button onClick={loadLogs} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="p-6 bg-slate-50 border-b flex items-center gap-4">
           <div className="relative flex-grow max-w-md">
              <input 
                placeholder="جستجوی کاربر یا نوع رویداد..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-rose-500 font-black text-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
           </div>
           <div className="mr-auto px-4 py-2 bg-white rounded-xl border font-black text-[10px] text-slate-400">آخرین ۱۰۰ رویداد ثبت شده</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="p-5">کاربر</th>
                <th className="p-5">نوع رویداد امنیتی</th>
                <th className="p-5 text-center">سطح ریسک</th>
                <th className="p-5 text-center">جزئیات فنی</th>
                <th className="p-5 text-left">زمان ثبت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><User size={16}/></div>
                        <div className="flex flex-col">
                            <span className="font-black text-slate-800">{log.user_full_name}</span>
                            <span className="text-[9px] text-slate-400 font-bold">{log.user_id}</span>
                        </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="font-black text-slate-600">{getEventLabel(log.event_type)}</span>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 mx-auto w-24 ${
                      log.risk_level === 'high' ? 'bg-rose-100 text-rose-700' :
                      log.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {log.risk_level === 'high' ? <ShieldAlert size={10}/> : log.risk_level === 'medium' ? <AlertTriangle size={10}/> : <ShieldCheck size={10}/>}
                      {log.risk_level}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex flex-col items-center gap-1 opacity-60">
                        <span className="text-[9px] font-mono flex items-center gap-1"><Smartphone size={10}/> {log.device_id}</span>
                        <span className="text-[9px] font-mono flex items-center gap-1"><Globe size={10}/> {log.ip}</span>
                    </div>
                  </td>
                  <td className="p-5 text-left text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-1 justify-end">
                        <Clock size={12}/>
                        {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.timestamp))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="py-20 text-center text-slate-300 font-black italic">هیچ فعالیت مشکوکی یافت نشد. امنیت برقرار است.</div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 space-y-2">
            <h4 className="font-black text-emerald-800 flex items-center gap-2"><ShieldCheck size={18}/> نشست امن وب</h4>
            <p className="text-[10px] text-emerald-700 font-bold leading-relaxed">هر کاربر در هر لحظه تنها مجاز به داشتن یک نشست فعال در مرورگر است. ورود جدید باعث خروج خودکار قبلی می‌شود.</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 space-y-2">
            <h4 className="font-black text-amber-800 flex items-center gap-2"><Smartphone size={18}/> قفل سخت‌افزاری</h4>
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">اشتراک‌ها بر پایه دستگاه موبایل (Device Bound) هستند. استفاده تیمی از یک اشتراک غیرممکن است.</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 space-y-2">
            <h4 className="font-black text-rose-800 flex items-center gap-2"><Shield size={18}/> پایش ریسک</h4>
            <p className="text-[10px] text-rose-700 font-bold leading-relaxed">تغییر آی‌پی‌های مشکوک (Proxy/VPN) و ورود از لوکیشن‌های مختلف به صورت خودکار مانیتور و لاگ می‌شود.</p>
        </div>
      </div>
    </div>
  );
};

export default SecurityReports;
