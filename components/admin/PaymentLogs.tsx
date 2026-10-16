
import React, { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Hash } from 'lucide-react';
import { PaymentService } from '../../services/paymentService';
import { PaymentRecord } from '../../types';

const PaymentLogs: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await PaymentService.getAllPayments();
    setPayments(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  
  const filtered = payments.filter(p => 
    (p.user_full_name || "").includes(searchTerm) || 
    (p.ref_id || "").includes(searchTerm) ||
    (p.authority || "").includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-enter">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-teal-500 text-slate-950 rounded-[1.5rem] shadow-xl shadow-teal-500/20">
              <CreditCard size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-none">مدیریت پرداخت‌ها</h2>
              <p className="text-[10px] text-teal-400 font-bold mt-2 uppercase tracking-widest">Zarinpal Transaction Ledger</p>
            </div>
          </div>
          <button onClick={loadData} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="p-6 bg-slate-50 border-b flex items-center gap-4">
           <div className="relative flex-grow max-w-md">
              <input 
                placeholder="جستجوی کاربر یا کد پیگیری..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-teal-500 font-black text-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
           </div>
           <div className="mr-auto px-4 py-2 bg-white rounded-xl border font-black text-[10px] text-slate-400">تعداد کل تراکنش‌ها: {toPersian(payments.length)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="p-5">مشخصات کاربر</th>
                <th className="p-5 text-center">مبلغ (ریال)</th>
                <th className="p-5 text-center">پلن</th>
                <th className="p-5 text-center">کد پیگیری / Authority</th>
                <th className="p-5 text-center">وضعیت</th>
                <th className="p-5 text-left">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800">{p.user_full_name}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{p.user_id}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center font-black text-slate-700">{toPersian(p.amount.toLocaleString())}</td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${p.plan_type === 'yearly' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {p.plan_type === 'yearly' ? 'سالانه' : 'ماهانه'}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {p.ref_id ? (
                        <span className="font-black text-emerald-600 flex items-center gap-1"><Hash size={12}/> {p.ref_id}</span>
                      ) : (
                        <span className="text-[9px] font-mono text-slate-300 truncate max-w-[100px]">{p.authority}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 border ${
                      p.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      p.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {p.status === 'success' ? <CheckCircle size={14}/> : p.status === 'pending' ? <Clock size={14}/> : <XCircle size={14}/>}
                      {p.status === 'success' ? 'موفق' : p.status === 'pending' ? 'در انتظار' : 'ناموفق'}
                    </span>
                  </td>
                  <td className="p-5 text-left text-[10px] font-bold text-slate-400">
                    {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(p.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="py-20 text-center text-slate-300 font-black italic">هیچ تراکنشی یافت نشد.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentLogs;
