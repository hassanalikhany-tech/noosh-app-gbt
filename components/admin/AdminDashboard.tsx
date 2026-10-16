
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, LogOut, Trash2, CalendarPlus, Users, Search, FileJson, ExternalLink, GitMerge, ImageIcon, CheckCircle, XCircle, FileSpreadsheet, Lock, ShieldAlert, SmartphoneNfc, UserPlus, UserCheck, UserX, Loader2, Award, Gift, QrCode, Ticket, TicketMinus, Info, Check, X, CreditCard, Eye, Fingerprint, Clock, Banknote, Shield, Settings2, Layers, Save, RefreshCw, BarChart3, PieChart, Activity, Bell, MessageSquare, Scale, Sparkles } from 'lucide-react';
import { UserService } from '../../services/userService';
import { UserProfile } from '../../types';
import DatabaseManager from './DatabaseManager';
import DuplicateResolver from './DuplicateResolver';
import ImageGuide from './ImageGuide';
import CsvToJsonConverter from './CsvToJsonConverter';
import PaymentLogs from './PaymentLogs';
import SecurityReports from './SecurityReports';
import FinancialSettings from './FinancialSettings';
import BackupManager from './BackupManager';
import VisitorSettlements from './VisitorSettlements';
import FinancialReports from './FinancialReports';
import SystemAnalytics from './SystemAnalytics';
import SecurityAlerts from './SecurityAlerts';
import NotificationManager from './NotificationManager';
import FeedbackManager from './FeedbackManager';
import UnitConsistencyManager from './UnitConsistencyManager';
import AiRecipeEnhancer from './AiRecipeEnhancer';
import { auth } from '../../services/firebase';
import { SecurityService } from '../../services/securityService';

interface AdminDashboardProps {
  onLogout: () => void;
  onSwitchToApp?: () => void;
}

type AdminTab = 'users' | 'security-alerts' | 'analytics' | 'notifications' | 'feedback' | 'settlements' | 'financial-reports' | 'financial' | 'payments' | 'security-logs' | 'visitors' | 'images' | 'duplicates' | 'csv-converter' | 'database' | 'security-policy' | 'backup' | 'unit-consistency' | 'ai-enhancer';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onSwitchToApp }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingAction, setProcessingAction] = useState<{uid: string, action: string} | null>(null);
  const [selectedKycDoc, setSelectedKycDoc] = useState<any>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const uRes = await UserService.getAllUsers();
      if (uRes.success) setUsers(uRes.data);
      
      if (activeTab === 'analytics' || activeTab === 'security-alerts') {
          await SecurityService.logEvent("ADMIN", "System Admin", "admin_analytics_view", "low");
      }
      
      if (activeTab === 'visitors') {
        const vList = await UserService.getAllVisitors();
        setVisitors(vList);
      }
    } catch (err) {}
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadInitialData(); }, [activeTab]);

  const toPersian = (n: number | string | undefined | null) => {
    if (n === undefined || n === null) return '۰';
    return n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  };

  const handleKycAction = async (uid: string, status: 'verified' | 'rejected') => {
    setProcessingAction({ uid, action: 'kyc' });
    try {
      await UserService.verifyKyc(uid, status);
      await loadInitialData();
      if (selectedKycDoc && selectedKycDoc.user_id === uid) setSelectedKycDoc(null);
    } finally { setProcessingAction(null); }
  };

  const handleToggleVisitorRole = async (user: any) => {
    setProcessingAction({ uid: user.uid, action: 'role' });
    try {
      if (user.role !== 'visitor') {
        if (confirm(`آیا از ارتقای ${user.fullName} به سطح ویزیتور اطمینان دارید؟`)) {
          await UserService.promoteToVisitor(user.uid);
        }
      } else {
        if (confirm(`حذف دسترسی ویزیتوری برای ${user.fullName} و تبدیل به کاربر عادی؟`)) {
          await UserService.demoteFromVisitor(user.uid);
        }
      }
      await loadInitialData();
    } catch (err) {
      alert("خطا در تغییر سطح دسترسی");
    } finally {
      setProcessingAction(null);
    }
  };

  const processedUsers = useMemo(() => {
    let result = [...users];
    if (searchTerm) result = result.filter(u => (u.fullName || "").includes(searchTerm) || (u.mobileNumber || "").includes(searchTerm));
    return result;
  }, [users, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col dir-rtl text-right font-sans">
      <header className="bg-slate-900 text-white p-3 shadow-xl sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg"><ShieldCheck size={28} /></div>
            <h1 className="text-xl font-black uppercase tracking-tighter">پنل مدیریت اختصاصی نوش</h1>
          </div>
          <div className="flex gap-2">
            {onSwitchToApp && <button onClick={onSwitchToApp} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center gap-2 transition-all"><ExternalLink size={18} /> بازگشت به اپ</button>}
            <button onClick={onLogout} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"><LogOut size={18} /> خروج امن</button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b sticky top-[60px] z-40 overflow-x-auto no-scrollbar">
        <div className="container mx-auto flex gap-1 px-4 min-w-max">
          {[
            {id: 'users', label: 'کاربران', icon: Users},
            {id: 'notifications', label: 'نوتیفیکیشن‌ها', icon: Bell},
            {id: 'feedback', label: 'بازخورد کاربران', icon: MessageSquare},
            {id: 'security-alerts', label: 'هشدارهای امنیتی', icon: Bell},
            {id: 'analytics', label: 'آنالیتیکس هوشمند', icon: Activity},
            {id: 'settlements', label: 'تسویه ویزیتورها', icon: Banknote},
            {id: 'financial-reports', label: 'داشبورد مالی', icon: PieChart},
            {id: 'financial', label: 'تنظیمات قیمت', icon: Settings2},
            {id: 'payments', label: 'تراکنش‌ها', icon: CreditCard},
            {id: 'security-logs', label: 'امنیت', icon: ShieldAlert},
            {id: 'visitors', label: 'ویزیتورها', icon: Award},
            {id: 'duplicates', label: 'اصلاح پخت‌ها', icon: Layers},
            {id: 'ai-enhancer', label: 'بهینه‌ساز هوشمند', icon: Sparkles},
            {id: 'unit-consistency', label: 'مغایرت واحدها', icon: Scale},
            {id: 'database', label: 'بانک پخت‌ها', icon: FileJson},
            {id: 'csv-converter', label: 'مبدل اکسل', icon: FileSpreadsheet},
            {id: 'backup', label: 'پشتیبان‌گیری', icon: Save},
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as AdminTab)} 
              className={`py-2 px-4 font-black text-[11px] flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <tab.icon size={16} /> {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full"></div>}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto px-4 py-4">
        {activeTab === 'users' && (
          <div className="space-y-6 animate-enter">
            <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden border-slate-200">
               <div className="p-6 bg-slate-50 flex justify-between items-center border-b"><div className="relative"><input placeholder="جستجوی نام یا موبایل..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="px-6 py-3 bg-white border rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm w-72 pr-12" /><Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"/></div><div className="text-xs font-black text-slate-400">تعداد کل: {toPersian(processedUsers.length)}</div></div>
               <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 font-black text-[10px] uppercase opacity-60"><tr><th className="p-5">اطلاوات کاربر</th><th className="p-5 text-center">نوع حساب</th><th className="p-5 text-center">وضعیت تایید</th><th className="p-5 text-left">عملیات ادمین</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {processedUsers.map(user => {
                        const isOnline = user.lastActiveAt && (Date.now() - user.lastActiveAt < 1000 * 60 * 5);
                        return (
                          <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-lg border">
                                    {user.fullName?.[0] || user.username?.[0] || '?'}
                                  </div>
                                  {isOnline && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-800">{user.fullName || user.username}</span>
                                    {isOnline && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase">Online</span>}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-bold">{user.mobileNumber || user.phoneNumber || user.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-5 text-center"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${user.role === 'visitor' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{user.role || 'user'}</span></td>
                            <td className="p-5 text-center"><span className={`px-4 py-1.5 rounded-xl font-black text-[10px] border ${user.isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{user.isApproved ? 'فعال و تایید شده' : 'در انتظار تایید'}</span></td>
                            <td className="p-5 text-left"><div className="flex justify-end gap-2">
                               <button onClick={() => UserService.toggleUserApproval(user.uid, !!user.isApproved).then(loadInitialData)} className="p-2.5 bg-white border rounded-xl hover:bg-slate-50 transition-all shadow-sm" title={user.isApproved ? 'تعلیق' : 'تایید'}>{user.isApproved ? <UserX size={18} className="text-amber-500"/> : <UserCheck size={18} className="text-emerald-500"/>}</button>
                               
                               <button 
                                  onClick={() => handleToggleVisitorRole(user)} 
                                  disabled={processingAction?.uid === user.uid}
                                  className={`p-2.5 rounded-xl transition-all shadow-sm ${user.role === 'visitor' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`} 
                                  title={user.role === 'visitor' ? 'حذف ویزیتوری' : 'ارتقا به ویزیتور'}
                               >
                                  {processingAction?.uid === user.uid && processingAction.action === 'role' ? <Loader2 size={18} className="animate-spin"/> : user.role === 'visitor' ? <TicketMinus size={18}/> : <Award size={18}/>}
                               </button>
  
                               <button onClick={() => { if(confirm("حذف دائمی کاربر؟")) UserService.deleteUser(user.uid).then(loadInitialData); }} className="p-2.5 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                            </div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && <NotificationManager />}
        {activeTab === 'feedback' && <FeedbackManager />}
        {activeTab === 'security-alerts' && <SecurityAlerts />}
        {activeTab === 'analytics' && <SystemAnalytics />}
        {activeTab === 'settlements' && <VisitorSettlements />}
        {activeTab === 'financial-reports' && <FinancialReports />}
        {activeTab === 'financial' && <FinancialSettings />}
        {activeTab === 'payments' && <PaymentLogs />}
        {activeTab === 'security-logs' && <SecurityReports />}
        {activeTab === 'csv-converter' && <CsvToJsonConverter />}
        {activeTab === 'images' && <ImageGuide />}
        {activeTab === 'duplicates' && <DuplicateResolver />}
        {activeTab === 'unit-consistency' && <UnitConsistencyManager />}
        {activeTab === 'ai-enhancer' && <AiRecipeEnhancer />}
        {activeTab === 'database' && <DatabaseManager />}
        {activeTab === 'backup' && <BackupManager />}

        {activeTab === 'visitors' && (
          <div className="space-y-6 animate-enter">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-8 bg-indigo-600 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-4"><Award size={40}/><div className="flex flex-col"><h2 className="text-2xl font-black leading-none">احراز هویت و پورسانت ویزیتورها</h2><span className="text-[10px] opacity-60 font-bold mt-1 uppercase tracking-widest">Affiliate Management System</span></div></div>
                 <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 font-black text-sm flex items-center gap-2"><Users size={18}/> {toPersian(visitors.length)} همکار فعال</div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                   <thead className="bg-slate-50 font-black text-[10px] opacity-60"><tr><th className="p-5">مشخصات همکار</th><th className="p-5 text-center">کد معرفی یکتا</th><th className="p-5 text-center">مجموع پورسانت</th><th className="p-5 text-center">وضعیت مدارک</th><th className="p-5 text-left">اقدام مدیریتی</th></tr></thead>
                   <tbody className="divide-y divide-slate-100">
                     {visitors.map((v, i) => (
                       <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="p-5"><div className="flex flex-col"><span className="font-black text-slate-800">{v.fullName}</span><span className="text-[10px] text-slate-400 font-bold">{v.mobile}</span></div></td>
                         <td className="p-5 text-center"><span className="bg-slate-900 text-amber-400 px-5 py-1.5 rounded-xl font-mono font-black text-base shadow-lg border border-white/5">{v.referral_code}</span></td>
                         <td className="p-5 text-center"><div className="flex flex-col"><span className="font-black text-emerald-600 text-lg">{toPersian(v.total_commission)} <span className="text-[10px]">تومان</span></span><span className="text-[9px] text-slate-400 font-bold">{toPersian(v.referrals_count)} معرفی موفق</span></div></td>
                         <td className="p-5 text-center">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border inline-flex items-center gap-2 ${
                                v.kyc_status === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                v.kyc_status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' : 
                                v.kyc_status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-300 border-slate-100'
                            }`}>
                                {v.kyc_status === 'verified' ? <ShieldCheck size={14}/> : v.kyc_status === 'pending' ? <Clock size={14}/> : <ShieldAlert size={14}/>}
                                {v.kyc_status === 'verified' ? 'تایید نهایی' : v.kyc_status === 'pending' ? 'در انتظار بررسی' : v.kyc_status === 'rejected' ? 'رد شده' : 'فاقد مدارک'}
                            </span>
                         </td>
                         <td className="p-5 text-left">
                           {v.financialInfo ? (
                             <button onClick={() => setSelectedKycDoc(v)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[11px] shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"><Eye size={16}/> بررسی مدارک</button>
                           ) : (
                             <span className="text-[10px] font-bold text-slate-300 italic">هنوز ثبت نکرده</span>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {selectedKycDoc && (
            <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-enter" onClick={() => setSelectedKycDoc(null)}>
                <div className="w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
                    <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3"><Fingerprint size={28}/> <h3 className="text-xl font-black">بررسی هویت و حساب بانکی</h3></div>
                        <button onClick={() => setSelectedKycDoc(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1"><span className="text-[10px] font-black text-slate-400">نام کامل صاحب حساب</span><p className="font-black text-slate-800 border-b pb-2">{selectedKycDoc.financialInfo.fullName}</p></div>
                            <div className="space-y-1"><span className="text-[10px] font-black text-slate-400">کد ملی</span><p className="font-black text-slate-800 border-b pb-2">{selectedKycDoc.financialInfo.national_id}</p></div>
                            <div className="col-span-2 space-y-1"><span className="text-[10px] font-black text-slate-400">شماره شبا (IBAN)</span><p className="font-mono text-indigo-600 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100 text-left ltr">{selectedKycDoc.financialInfo.iban}</p></div>
                            <div className="space-y-1"><span className="text-[10px] font-black text-slate-400">تاریخ تولد</span><p className="font-black text-slate-800 border-b pb-2">{selectedKycDoc.financialInfo.birth_date}</p></div>
                        </div>

                        {selectedKycDoc.financialInfo.id_card_image_url && (
                            <div className="space-y-3">
                                <span className="text-[10px] font-black text-slate-400">تصویر مدارک بارگذاری شده</span>
                                <div className="w-full h-48 bg-slate-100 rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner group relative cursor-zoom-in">
                                    <img src={selectedKycDoc.financialInfo.id_card_image_url} alt="ID Card" className="w-full h-full object-contain" />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button onClick={() => handleKycAction(selectedKycDoc.user_id, 'verified')} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3">تایید نهایی</button>
                            <button onClick={() => handleKycAction(selectedKycDoc.user_id, 'rejected')} className="flex-1 py-4 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl font-black">رد مدارک</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
