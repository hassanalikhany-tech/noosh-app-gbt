import React, { useState } from 'react';
import { X, Send, MessageSquare, AlertCircle, CheckCircle, HelpCircle, Zap, Info, Loader2, Tag } from 'lucide-react';
import { FeedbackService } from '../services/feedbackService';
import { UserProfile, FeedbackCategory } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, user }) => {
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    try {
      const userId = user?.uid || "unknown";
      const userName = user?.fullName || "کاربر نوش";
      const userMobile = user?.mobileNumber || user?.uid || "بدون شماره";

      await FeedbackService.submitFeedback(
        userId,
        userName,
        userMobile,
        category,
        message.trim()
      );
      
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setMessage('');
      }, 2500);
    } catch (err) {
      console.error("Feedback error:", err);
      alert("خطا در ارتباط با سرور. لطفاً مجدداً تلاش کنید.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 pt-2 no-print animate-enter">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Container - مختصات اصلاح شده (۷ ردیف بالاتر) و محدودیت ارتفاع جدید برای فاصله ۲ ردیفی از فوتر */}
      {/* fix: Changed </div> to > to correctly open the div tag and nest its children */}
      <div 
        className="relative w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col transition-all duration-300" 
        style={{ 
          maxHeight: 'calc(100dvh - 210px)' // بالا آوردن ضلع پایین برای ایجاد فاصله دو ردیفی با فوتر
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 text-white rounded-[1.25rem] shadow-lg"><MessageSquare size={20}/></div>
              <div>
                <h3 className="text-lg font-black leading-none">صدای شما (ارسال نظر)</h3>
                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Direct Feedback System</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-6 sm:p-10 no-scrollbar bg-slate-50/50">
           {isSuccess ? (
              <div className="py-16 flex flex-col items-center text-center gap-5 animate-enter">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-bounce"><CheckCircle size={40}/></div>
                 <h4 className="text-xl font-black text-slate-800">پیام شما دریافت شد</h4>
              </div>
           ) : (
              <form onSubmit={handleSubmit} className="space-y-8 animate-enter">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 pr-2 flex items-center gap-2 uppercase tracking-widest"><Tag size={12}/> موضوع پیام</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                       {[
                         { id: 'suggestion', label: 'پیشنهاد', icon: Zap, color: 'indigo' },
                         { id: 'issue', label: 'گزارش مشکل', icon: AlertCircle, color: 'rose' },
                         { id: 'criticism', label: 'انتقاد', icon: Info, color: 'amber' },
                         { id: 'feature_request', label: 'قابلیت جدید', icon: HelpCircle, color: 'teal' }
                       ].map(cat => (
                         <button 
                           key={cat.id} 
                           type="button"
                           onClick={() => setCategory(cat.id as FeedbackCategory)}
                           className={`px-3 py-3 rounded-2xl border-2 font-black text-[10px] flex flex-col items-center gap-2 transition-all ${category === cat.id ? `bg-${cat.color === 'blue' ? 'blue-600' : cat.color + '-500'} border-${cat.color === 'blue' ? 'blue-700' : cat.color + '-600'} text-white shadow-md` : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                         >
                           <cat.icon size={16}/> {cat.label}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 pr-2 flex items-center gap-2 uppercase tracking-widest"><MessageSquare size={12}/> متن پیام شما</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                        <textarea 
                          required
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder="پیام خود را اینجا بنویسید..."
                          className="flex-grow h-40 bg-white border-2 border-slate-100 rounded-[2rem] p-6 outline-none focus:border-emerald-500 font-bold text-sm text-slate-800 resize-none transition-all shadow-inner"
                        />
                        <button 
                          type="submit" 
                          disabled={isSending || !message.trim()}
                          className="sm:w-48 bg-slate-900 text-white rounded-[2rem] font-black text-lg flex flex-col items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-50 py-6 sm:py-0"
                        >
                           {isSending ? <Loader2 size={28} className="animate-spin"/> : <Send size={28}/>}
                           <span className="text-sm">ارسال برای مدیریت</span>
                        </button>
                    </div>
                 </div>
              </form>
           )}
           <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
