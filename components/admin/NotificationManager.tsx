
import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, Clock, History, Loader2, CheckCircle, Info, ShieldAlert, MessageSquare, User, Search, X, CheckSquare, Square } from 'lucide-react';
import { NotificationService } from '../../services/notificationService';
import { UserService } from '../../services/userService';
import { Notification, UserProfile } from '../../types';

const NotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({ 
    title: '', 
    message: '', 
    target: 'all' as 'all' | 'active' | 'visitors' | 'specific'
  });

  const loadData = async () => {
    setLoading(true);
    const [notifs, usersRes] = await Promise.all([
      NotificationService.getAllNotifications(),
      UserService.getAllUsers()
    ]);
    setNotifications(notifs);
    if (usersRes.success) setAllUsers(usersRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return;
    if (formData.target === 'specific' && selectedUids.length === 0) {
      alert("لطفاً حداقل یک کاربر را برای ارسال گزینش کنید.");
      return;
    }
    setSending(true);
    try {
      await NotificationService.createNotification(
        formData.title, 
        formData.message, 
        formData.target, 
        "ADMIN",
        formData.target === 'specific' ? selectedUids : []
      );
      setFormData({ title: '', message: '', target: 'all' });
      setSelectedUids([]);
      await loadData();
      alert("اعلان با موفقیت برای تمامی گیرندگان ارسال شد.");
    } finally {
      setSending(false);
    }
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const filteredUsersForSelector = allUsers.filter(u => 
    u.fullName?.includes(userSearchTerm) || u.uid?.includes(userSearchTerm)
  );

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  return (
    <div className="space-y-8 animate-enter">
      <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-10 border-b pb-8">
           <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100"><Bell size={32}/></div>
           <div>
              <h2 className="text-2xl font-black text-slate-800">مرکز اعلان‌های هوشمند</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Smart Notification Hub</p>
           </div>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
           <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 pr-2">عنوان اعلان</label>
                 <input 
                    placeholder="مثلاً: خبرهای جدید در نوش..." 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 pr-2">گروه هدف</label>
                 <select 
                    value={formData.target}
                    onChange={e => setFormData({...formData, target: e.target.value as any})}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-black text-sm"
                 >
                    <option value="all">همه کاربران</option>
                    <option value="active">فقط کاربران فعال (دارای اشتراک)</option>
                    <option value="visitors">فقط ویزیتورها</option>
                    <option value="specific">کاربران گزینش شده (انتخاب از لیست)</option>
                 </select>
              </div>
           </div>

           {formData.target === 'specific' && (
              <div className="p-6 bg-indigo-50 rounded-3xl border-2 border-dashed border-indigo-200 animate-enter space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><Users size={20}/></div>
                       <div>
                          <h4 className="font-black text-indigo-900 text-sm">لیست گیرندگان گزینش شده</h4>
                          <p className="text-[10px] text-indigo-500 font-bold">{toPersian(selectedUids.length)} کاربر انتخاب شده است</p>
                       </div>
                    </div>
                    <button 
                       type="button"
                       onClick={() => setIsUserSelectorOpen(true)}
                       className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-2xl font-black text-xs shadow-sm hover:bg-indigo-100 transition-all active:scale-95"
                    >
                       {selectedUids.length > 0 ? 'ویرایش لیست گیرندگان' : 'انتخاب کاربران از لیست'}
                    </button>
                 </div>
                 
                 {selectedUids.length > 0 && (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 no-scrollbar">
                       {selectedUids.map(uid => {
                          const user = allUsers.find(u => u.uid === uid);
                          return (
                             <div key={uid} className="px-3 py-1.5 bg-white rounded-lg border border-indigo-100 text-[10px] font-black text-indigo-600 flex items-center gap-2">
                                {user?.fullName || uid}
                                <button type="button" onClick={() => toggleUserSelection(uid)} className="hover:text-rose-500"><X size={12}/></button>
                             </div>
                          );
                       })}
                    </div>
                 )}
              </div>
           )}

           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">متن پیام</label>
              <textarea 
                placeholder="متن کامل پیام را اینجا بنویسید..."
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="w-full h-32 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-bold text-sm resize-none"
              />
           </div>
           <button 
             type="submit" 
             disabled={sending}
             className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
           >
             {sending ? <Loader2 size={24} className="animate-spin"/> : <Send size={24}/>}
             ارسال
           </button>
        </form>
      </div>

      {/* مدال انتخاب کاربران */}
      {isUserSelectorOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-enter">
           <div className="w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-[80vh]">
              <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl"><Users size={24}/></div>
                    <div><h3 className="text-xl font-black">گزینش گیرندگان</h3><p className="text-[10px] text-indigo-200 font-bold">برای انتخاب کاربر روی نام یا چک‌باکس کلیک کنید</p></div>
                 </div>
                 <button onClick={() => setIsUserSelectorOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
              </div>

              <div className="p-6 border-b border-slate-100 bg-slate-50">
                 <div className="relative">
                    <input 
                       placeholder="جستجوی نام یا موبایل کاربر..."
                       value={userSearchTerm}
                       onChange={e => setUserSearchTerm(e.target.value)}
                       className="w-full px-12 py-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-500 font-bold text-sm"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                 </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-2 no-scrollbar">
                 {filteredUsersForSelector.map(user => {
                    const isSelected = selectedUids.includes(user.uid);
                    return (
                       <div 
                          key={user.uid}
                          onClick={() => toggleUserSelection(user.uid)}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-50 hover:bg-slate-50'}`}
                       >
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {user.fullName?.[0] || 'U'}
                             </div>
                             <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-sm">{user.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{user.mobileNumber}</span>
                             </div>
                          </div>
                          <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>
                             {isSelected ? <CheckSquare size={18}/> : <Square size={18} className="text-slate-200"/>}
                          </div>
                       </div>
                    );
                 })}
                 {filteredUsersForSelector.length === 0 && (
                    <div className="py-20 text-center text-slate-300 font-black italic">کاربری یافت نشد.</div>
                 )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                 <div className="text-xs font-black text-slate-500">مجموع انتخاب شده: {toPersian(selectedUids.length)} نفر</div>
                 <button 
                    onClick={() => setIsUserSelectorOpen(false)}
                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                 >
                    تایید و اتمام انتخاب
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-200">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3"><History className="text-indigo-600"/> تاریخچه ارسال‌ها</h3>
            <div className="relative w-full md:w-72">
               <input 
                  placeholder="جستجو در عنوان یا متن..."
                  value={historySearchTerm}
                  onChange={e => setHistorySearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-xs"
               />
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            </div>
         </div>
         <div className="space-y-4">
            {notifications
              .filter(n => n.title.includes(historySearchTerm) || n.message.includes(historySearchTerm))
              .map(n => (
                <div key={n.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div className="flex gap-4">
                      <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm h-fit"><MessageSquare size={20}/></div>
                      <div>
                         <h4 className="font-black text-slate-800">{n.title}</h4>
                         <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                         <div className="flex gap-2 mt-3">
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-indigo-600">
                                {n.target_group === 'all' ? 'همه' : n.target_group === 'active' ? 'فعال' : n.target_group === 'visitors' ? 'ویزیتور' : `گزینش شده: ${toPersian(n.target_uids?.length || 0)} نفر`}
                            </span>
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400">{new Intl.DateTimeFormat('fa-IR', {timeStyle: 'short', dateStyle: 'medium'}).format(new Date(n.send_time))}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full"><CheckCircle size={14}/> ارسال شده</div>
                </div>
            ))}
            {notifications.length === 0 && !loading && (
                <div className="py-12 text-center text-slate-300 font-black italic">هنوز هیچ اعلانی ارسال نشده است.</div>
            )}
         </div>
      </div>
    </div>
  );
};

export default NotificationManager;
