
import React, { useState, useEffect } from 'react';
import { Bell, X, Info, CheckCircle, Clock, ShieldAlert, Sparkles, MessageSquare, ArrowRight, Trash2 } from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import { Notification, UserProfile } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>(user.readNotificationIds || []);
  const [deletedIds, setDeletedIds] = useState<string[]>(user.deletedNotificationIds || []);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  useEffect(() => {
    setReadIds(user.readNotificationIds || []);
    setDeletedIds(user.deletedNotificationIds || []);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      const fetchNotifs = async () => {
        setLoading(true);
        try {
          const data = await NotificationService.getUserNotifications(user.uid, user.role || 'user', user.subscriptionExpiry > Date.now());
          setNotifications(data);
        } catch (e) {
          console.error("Failed to load notifications");
        } finally {
          setLoading(false);
        }
      };
      fetchNotifs();
    }
  }, [isOpen, user]);

  const markAsRead = async (id: string) => {
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      await NotificationService.markAsRead(user.uid, id);
    }
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = [...deletedIds, id];
    setDeletedIds(next);
    await NotificationService.deleteNotificationForUser(user.uid, id);
    if (selectedNotif?.id === id) setSelectedNotif(null);
  };

  const handleNotifClick = (n: Notification) => {
    markAsRead(n.id);
    setSelectedNotif(n);
  };

  if (!isOpen) return null;

  const visibleNotifications = notifications.filter(n => !deletedIds.includes(n.id));

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 no-print animate-enter">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div 
        className="relative w-full max-w-2xl bg-white sm:rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border border-white/20 flex flex-col transition-all duration-300" 
        style={{ 
          marginTop: 'auto',
          marginBottom: 'auto',
          height: '100dvh',
          maxHeight: '100dvh' 
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl shadow-lg"><Bell size={20}/></div>
              <div>
                <h3 className="text-lg font-black leading-none">مرکز خبرنامه نوش</h3>
                <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest mt-1">Notifications & Updates</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-3 no-scrollbar relative bg-slate-50/50">
           {loading ? (
             <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-300">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="font-black text-xs">در حال دریافت خبرها...</span>
             </div>
            ) : visibleNotifications.length === 0 ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300 text-center px-10">
                <Sparkles size={48} className="opacity-10 mb-2"/>
                <p className="font-black text-slate-400 text-xs leading-relaxed">فعلاً خبر جدیدی برای شما نیست.</p>
             </div>
           ) : (
             visibleNotifications.map(n => {
                const isUnread = !readIds.includes(n.id);
                return (
                    <div 
                        key={n.id} 
                        onClick={() => handleNotifClick(n)}
                        className={`p-5 rounded-[2rem] border-2 transition-all cursor-pointer relative group ${
                            isUnread ? 'bg-white border-indigo-500 shadow-lg ring-4 ring-indigo-50/30' : 'bg-white border-slate-100'
                        }`}
                    >
                       <div className="flex gap-4">
                          <div className={`p-3 rounded-2xl shadow-sm h-fit ${isUnread ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                             <MessageSquare size={18}/>
                          </div>
                          <div className="flex-grow">
                             <div className="flex justify-between items-start">
                                <h4 className={`text-sm transition-all ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-500'}`}>{n.title}</h4>
                                <button 
                                  onClick={(e) => deleteNotif(e, n.id)}
                                  className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="حذف پیام"
                                >
                                  <Trash2 size={14} />
                                </button>
                             </div>
                             <p className={`text-[10px] mt-1.5 leading-relaxed line-clamp-2 ${isUnread ? 'font-black text-slate-600' : 'font-bold text-slate-400'}`}>{n.message}</p>
                             <div className="flex items-center gap-2 mt-3 text-[8px] font-black text-slate-300">
                                <Clock size={10}/> {new Intl.DateTimeFormat('fa-IR', {timeStyle: 'short', dateStyle: 'medium'}).format(new Date(n.send_time))}
                             </div>
                          </div>
                       </div>
                    </div>
                );
             })
           )}

           {/* Expanded View */}
           {selectedNotif && (
             <div className="absolute inset-0 z-50 bg-white p-6 flex flex-col animate-enter overflow-y-auto">
                <button onClick={() => setSelectedNotif(null)} className="self-start px-4 py-2 bg-slate-100 rounded-xl text-slate-500 mb-6 hover:bg-slate-200 transition-all flex items-center gap-2 font-black text-[10px]">
                   <ArrowRight size={14}/> بازگشت به لیست خبرها
                </button>
                <div className="flex items-center gap-4 mb-6">
                   <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl"><Bell size={24}/></div>
                   <div>
                      <h2 className="text-xl font-black text-slate-900 leading-tight">{selectedNotif.title}</h2>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">{new Intl.DateTimeFormat('fa-IR', {dateStyle: 'full', timeStyle: 'short'}).format(new Date(selectedNotif.send_time))}</p>
                   </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                   <p className="text-slate-700 text-base font-bold leading-relaxed text-justify whitespace-pre-wrap">
                      {selectedNotif.message}
                   </p>
                </div>
                <div className="mt-8 pt-8 text-center opacity-10 logo-animate">
                   <img src="https://i.ibb.co/gMDKtj4p/3.png" className="w-12 h-12 mx-auto grayscale" alt="Noosh" />
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
