
import React, { useState, useEffect } from 'react';
import { CreditCard, Download, CheckCircle, RefreshCw, Loader2, User, Hash, Banknote, ShieldCheck, FileSpreadsheet, Clock } from 'lucide-react';
import { SettlementService } from '../../services/settlementService';

const VisitorSettlements: React.FC = () => {
  const [readyList, setReadyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await SettlementService.getVisitorsReadyForSettlement();
    setReadyList(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleExportExcel = () => {
    if (readyList.length === 0) return alert("لیست خالی است.");
    SettlementService.createSettlementExcel(readyList);
  };

  const handleConfirmPaid = async (item: any) => {
    if (!confirm(`آیا از ثبت پرداخت مبلغ ${toPersian(item.totalAmount.toLocaleString())} ریال به ${item.fullName} اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) return;
    
    setProcessingId(item.visitor_id);
    try {
        const ids = item.logs.map((l: any) => l.id);
        await SettlementService.finalizeSettlement(item.visitor_id, item.totalAmount, ids);
        await loadData();
        alert("تسویه با موفقیت ثبت شد.");
    } finally {
        setProcessingId(null);
    }
  };

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  return (
    <div className="space-y-6 animate-enter">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 bg-indigo-900 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-400 text-slate-950 rounded-[1.5rem] shadow-xl">
              <Banknote size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-none">تسویه حساب ویزیتورها</h2>
              <p className="text-[10px] text-amber-300 font-bold mt-2 uppercase tracking-widest">Commission Payout Manager</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportExcel} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-xs flex items-center gap-2 transition-all">
                <FileSpreadsheet size={18}/> ایجاد فایل پرداخت اکسل
            </button>
            <button onClick={loadData} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
              <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
           <div className="flex items-center gap-2 text-slate-400 font-black text-xs">
              <Clock size={16}/> نمایش ویزیتورهای واجد شرایط (بالای ۵۰۰ هزار ریال)
           </div>
           <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 font-black text-[10px]">
              تعداد آماده تسویه: {toPersian(readyList.length)} نفر
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="p-5">اطلاعات ویزیتور</th>
                <th className="p-5 text-center">شماره شبا مقصد</th>
                <th className="p-5 text-center">مجموع پورسانت (ریال)</th>
                <th className="p-5 text-center">تعداد معرفی‌ها</th>
                <th className="p-5 text-left">عملیات مالی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {readyList.map(item => (
                <tr key={item.visitor_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><User size={20}/></div>
                        <div className="flex flex-col">
                            <span className="font-black text-slate-800">{item.fullName}</span>
                            <span className="text-[9px] text-slate-400 font-bold">{item.mobile}</span>
                        </div>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block font-mono text-[10px] ltr text-indigo-600">
                        {item.financial?.iban || 'ثبت نشده!'}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className="text-lg font-black text-emerald-600">{toPersian(item.totalAmount.toLocaleString())}</span>
                  </td>
                  <td className="p-5 text-center font-black text-slate-400">
                    {toPersian(item.logs.length)} مورد
                  </td>
                  <td className="p-5 text-left">
                    <button 
                        disabled={processingId === item.visitor_id || !item.financial?.iban}
                        onClick={() => handleConfirmPaid(item)}
                        className={`px-5 py-2.5 rounded-xl font-black text-[11px] shadow-lg flex items-center gap-2 transition-all active:scale-95 ${
                            !item.financial?.iban ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                      {processingId === item.visitor_id ? <Loader2 size={16} className="animate-spin"/> : <ShieldCheck size={16}/>}
                      ثبت پرداخت نهایی
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {readyList.length === 0 && !loading && (
            <div className="py-20 text-center text-slate-300 font-black italic">هیچ درخواست تسویه جدیدی وجود ندارد.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitorSettlements;
