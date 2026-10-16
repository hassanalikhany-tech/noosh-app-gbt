
import React, { useState, useEffect } from 'react';
import { MessageCircle, Search, Filter, CheckCircle, Clock, User, Phone, Tag, Trash2, ShieldCheck, Loader2, Info, RefreshCw, Eye, Send, Reply, Share2, CheckSquare, AlertCircle, HelpCircle, X } from 'lucide-react';
import { FeedbackService } from '../../services/feedbackService';
import { NotificationService } from '../../services/notificationService';
import { UserService } from '../../services/userService';
import { UserFeedback, UserProfile } from '../../types';

const FeedbackManager: React.FC = () => {
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Modal states
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [data, usersRes] = await Promise.all([
      FeedbackService.getAllFeedback(),
      UserService.getAllUsers()
    ]);
    setFeedback(data);
    if (usersRes.success) {
      setAdmins(usersRes.data.filter((u: UserProfile) => u.role === 'admin' || u.isAdmin));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusUpdate = async (id: string, status: UserFeedback['status']) => {
    setProcessingId(id);
    try {
      await FeedbackService.updateFeedbackStatus(id, status);
      await loadData();
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(prev => prev ? { ...prev, status } : null);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReply = async () => {
    if (!selectedFeedback || !replyMessage) return;
    setProcessingId(selectedFeedback.id);
    try {
      await NotificationService.createNotification(
        "پاسخ به بازخورد شما",
        replyMessage,
        'specific',
        "ADMIN",
        [selectedFeedback.user_id]
      );
      alert("پاسخ شما به صورت اعلان برای کاربر ارسال شد.");
      setReplyMessage('');
      setIsReplyOpen(false);
    } catch (e) {
      alert("خطا در ارسال پاسخ");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefer = async () => {
    if (!selectedFeedback || !selectedAdminId) return;
    setProcessingId(selectedFeedback.id);
    try {
      const assignedAdmin = admins.find(a => a.uid === selectedAdminId);
      const assignedToName = assignedAdmin ? (assignedAdmin.fullName || assignedAdmin.username) : "نامشخص";
      const assignedAt = Date.now();

      await FeedbackService.updateFeedbackStatus(selectedFeedback.id, 'referred', {
        assigned_to_name: assignedToName,
        assigned_at: assignedAt
      });
      
      await NotificationService.createNotification(
        "ارجاع بازخورد کاربر",
        `بازخورد از ${selectedFeedback.user_name} به شما ارجاع شد: ${selectedFeedback.message.substring(0, 50)}...`,
        'specific',
        "ADMIN",
        [selectedAdminId]
      );
      await loadData();
      alert("بازخورد با موفقیت ارجاع داده شد.");
      setIsReferralOpen(false);
      setSelectedFeedback(prev => prev ? { ...prev, status: 'referred', assigned_to_name: assignedToName, assigned_at: assignedAt } : null);
    } catch (e) {
      alert("خطا در ارجاع");
    } finally {
      setProcessingId(null);
    }
  };

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  const filtered = feedback.filter(f => 
    (f.user_name || "").includes(searchTerm) || 
    (f.message || "").includes(searchTerm) ||
    (f.user_mobile || "").includes(searchTerm)
  );

  const getStatusInfo = (status: UserFeedback['status']) => {
    switch(status) {
      case 'new': return { label: 'جدید', color: 'bg-amber-100 text-amber-700', icon: Clock };
      case 'reviewed': return { label: 'بررسی شده', color: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck };
      case 'to_be_reviewed': return { label: 'بررسی شود', color: 'bg-blue-100 text-blue-700', icon: Eye };
      case 'to_be_followed_up': return { label: 'پیگیری شود', color: 'bg-indigo-100 text-indigo-700', icon: Phone };
      case 'handled': return { label: 'رسیدگی شد', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'informed': return { label: 'اطلاع حاصل شد', color: 'bg-slate-100 text-slate-700', icon: Info };
      case 'referred': return { label: 'ارجاع شده', color: 'bg-purple-100 text-purple-700', icon: Share2 };
      default: return { label: status, color: 'bg-slate-100 text-slate-500', icon: HelpCircle };
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch(cat) {
      case 'suggestion': return 'پیشنهاد';
      case 'issue': return 'گزارش مشکل';
      case 'criticism': return 'انتقاد';
      case 'feature_request': return 'قابلیت جدید';
      default: return cat;
    }
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 bg-emerald-600 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-[1.5rem] shadow-xl"><MessageCircle size={32}/></div>
              <div>
                 <h2 className="text-2xl font-black leading-none">صدای کاربران (بازخورد)</h2>
                 <p className="text-[10px] opacity-70 font-bold mt-2 uppercase tracking-widest">User Feedback & Voice Hub</p>
              </div>
           </div>
           <button onClick={loadData} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
             <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>

        <div className="p-6 bg-slate-50 border-b flex items-center gap-4">
           <div className="relative flex-grow max-w-md">
              <input 
                placeholder="جستجو در پیام‌ها یا نام کاربر..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 font-black text-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
           </div>
           <div className="mr-auto px-4 py-2 bg-white rounded-xl border font-black text-[10px] text-slate-400">کل بازخوردها: {toPersian(feedback.length)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="p-5">فرستنده</th>
                <th className="p-5">موضوع / دسته‌بندی</th>
                <th className="p-5">متن بازخورد</th>
                <th className="p-5 text-center">وضعیت</th>
                <th className="p-5 text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(f => {
                const statusInfo = getStatusInfo(f.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <tr key={f.id} className={`transition-all cursor-pointer ${f.status === 'new' ? 'bg-emerald-50/20' : 'hover:bg-slate-50'}`} onClick={() => setSelectedFeedback(f)}>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{f.user_name}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{f.user_mobile}</span>
                      </div>
                    </td>
                    <td className="p-5">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${
                          f.category === 'issue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          f.category === 'suggestion' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-500'
                       }`}>
                          {getCategoryLabel(f.category)}
                       </span>
                    </td>
                    <td className="p-5">
                       <p className="max-w-xs text-xs font-bold text-slate-600 leading-relaxed truncate" title={f.message}>{f.message}</p>
                       <span className="text-[9px] text-slate-300 font-bold block mt-1">{new Intl.DateTimeFormat('fa-IR', {dateStyle: 'medium'}).format(new Date(f.created_at))}</span>
                    </td>
                    <td className="p-5 text-center">
                       <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black inline-flex items-center gap-2 ${statusInfo.color} ${f.status === 'new' ? 'animate-pulse' : ''}`}>
                          <StatusIcon size={14}/>
                          {statusInfo.label}
                       </span>
                    </td>
                    <td className="p-5 text-left">
                       <button 
                          className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                          onClick={(e) => { e.stopPropagation(); setSelectedFeedback(f); }}
                       >
                          <Eye size={16}/>
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="py-20 text-center text-slate-300 font-black italic">هیچ بازخوردی یافت نشد.</div>
          )}
        </div>
      </div>

      {/* مدال نمایش کامل پیام و عملیات */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-enter">
           <div className="w-full max-w-3xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl"><MessageCircle size={24}/></div>
                    <div>
                      <h3 className="text-xl font-black">جزئیات بازخورد کاربر</h3>
                      <p className="text-[10px] text-emerald-100 font-bold">ارسال شده توسط {selectedFeedback.user_name} در {new Intl.DateTimeFormat('fa-IR', {dateStyle: 'long', timeStyle: 'short'}).format(new Date(selectedFeedback.created_at))}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedFeedback(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                       <Tag size={16} className="text-emerald-600"/>
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">متن پیام ({getCategoryLabel(selectedFeedback.category)})</span>
                    </div>
                    <p className="text-slate-800 font-bold leading-relaxed whitespace-pre-wrap text-lg">{selectedFeedback.message}</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><User size={24}/></div>
                       <div>
                          <p className="text-[10px] text-slate-400 font-black">نام کاربر</p>
                          <p className="font-black text-slate-800">{selectedFeedback.user_name}</p>
                       </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><Phone size={24}/></div>
                       <div>
                          <p className="text-[10px] text-slate-400 font-black">شماره تماس</p>
                          <p className="font-black text-slate-800" dir="ltr">{selectedFeedback.user_mobile}</p>
                       </div>
                    </div>
                 </div>

                 {selectedFeedback.status === 'referred' && selectedFeedback.assigned_to_name && (
                   <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-4 animate-enter">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm"><Share2 size={24}/></div>
                      <div>
                         <p className="text-[10px] text-purple-400 font-black">ارجاع شده به</p>
                         <p className="font-black text-purple-800">{selectedFeedback.assigned_to_name}</p>
                         {selectedFeedback.assigned_at && (
                           <p className="text-[8px] text-purple-300 font-bold mt-0.5">
                             در تاریخ: {new Intl.DateTimeFormat('fa-IR', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(selectedFeedback.assigned_at))}
                           </p>
                         )}
                      </div>
                   </div>
                 )}

                 <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><CheckSquare size={18} className="text-emerald-600"/> تعیین وضعیت و اقدامات</h4>
                    <div className="flex flex-wrap gap-3">
                       <button 
                          onClick={() => handleStatusUpdate(selectedFeedback.id, 'to_be_reviewed')}
                          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${selectedFeedback.status === 'to_be_reviewed' ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                       >
                          <Eye size={16}/> بررسی شود
                       </button>
                       <button 
                          onClick={() => handleStatusUpdate(selectedFeedback.id, 'to_be_followed_up')}
                          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${selectedFeedback.status === 'to_be_followed_up' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                       >
                          <Phone size={16}/> پیگیری شود
                       </button>
                       <button 
                          onClick={() => handleStatusUpdate(selectedFeedback.id, 'handled')}
                          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${selectedFeedback.status === 'handled' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                       >
                          <CheckCircle size={16}/> رسیدگی شد
                       </button>
                       <button 
                          onClick={() => handleStatusUpdate(selectedFeedback.id, 'informed')}
                          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${selectedFeedback.status === 'informed' ? 'bg-slate-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                       >
                          <Info size={16}/> اطلاع حاصل شد
                       </button>
                       <button 
                          onClick={() => setIsReferralOpen(true)}
                          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${selectedFeedback.status === 'referred' ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                       >
                          <Share2 size={16}/> بررسی و اقدام مقتضی (ارجاع)
                       </button>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100 flex gap-4">
                    <button 
                       onClick={() => setIsReplyOpen(true)}
                       className="flex-grow py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                       <Reply size={20}/> پاسخ و ارسال نوتیفیکیشن به کاربر
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* مدال پاسخ (Reply) */}
      {isReplyOpen && selectedFeedback && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-enter">
           <div className="w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <Reply size={20}/>
                    <h4 className="font-black">ارسال پاسخ به {selectedFeedback.user_name}</h4>
                 </div>
                 <button onClick={() => setIsReplyOpen(false)}><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4">
                 <textarea 
                    placeholder="متن پاسخ خود را اینجا بنویسید..."
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm resize-none"
                 />
                 <button 
                    onClick={handleReply}
                    disabled={!replyMessage || processingId === selectedFeedback.id}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                 >
                    {processingId === selectedFeedback.id ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                    ارسال پاسخ نهایی
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* مدال ارجاع (Referral) */}
      {isReferralOpen && selectedFeedback && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-enter">
           <div className="w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-6 bg-purple-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <Share2 size={20}/>
                    <h4 className="font-black">ارجاع بازخورد به همکاران</h4>
                 </div>
                 <button onClick={() => setIsReferralOpen(false)}><X size={20}/></button>
              </div>
              <div className="p-6 space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 pr-2">انتخاب ادمین / همکار مقصد</label>
                    <select 
                       value={selectedAdminId}
                       onChange={e => setSelectedAdminId(e.target.value)}
                       className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-purple-500 font-black text-sm"
                    >
                       <option value="">انتخاب کنید...</option>
                       {admins.map(admin => (
                          <option key={admin.uid} value={admin.uid}>{admin.fullName} ({admin.role === 'admin' ? 'مدیر ارشد' : 'همکار'})</option>
                       ))}
                    </select>
                 </div>
                 <button 
                    onClick={handleRefer}
                    disabled={!selectedAdminId || processingId === selectedFeedback.id}
                    className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                 >
                    {processingId === selectedFeedback.id ? <Loader2 size={18} className="animate-spin"/> : <CheckSquare size={18}/>}
                    تایید و ارجاع نهایی
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManager;
