
import React, { useState } from 'react';
import { 
  X, ChevronLeft, ChevronDown, BookOpen, Calendar, ChefHat, Search, 
  Trophy, ShoppingCart, Bell, Settings, Info, Sparkles, RefreshCw, 
  Printer, Share2, Heart, ThumbsDown, Filter, User, ShieldCheck, 
  MessageSquare, Camera, CheckCircle2, AlertTriangle, Wand2, Maximize,
  Award, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  content: {
    title: string;
    description: string;
    features: {
      name: string;
      description: string;
      icon?: any;
    }[];
  }[];
}

const GUIDE_DATA: GuideSection[] = [
  {
    id: 'plan',
    title: 'برنامه غذایی',
    icon: Calendar,
    color: 'teal',
    content: [
      {
        title: 'مدیریت و تنظیم برنامه‌ها',
        description: 'نـوش با تحلیل دقیق ذائقه و طبع شما، بهترین چیدمان غذایی را برای بازه‌های زمانی مختلف طراحی می‌کند.',
        features: [
          { name: 'برنامه روزانه اختصاصی', description: 'دریافت ۳ پیشنهاد غذا برای هر روز؛ یک پیشنهاد اصلی و دو جایگزین که اگر به هر دلیلی نپسندیدید یا امکان تهیه نداشتید، از آن‌ها استفاده کنید. همچنین کلید «جایگزینی آنی» برای دریافت گزینه‌های جدید در دسترس است.', icon: Calendar },
          { name: 'برنامه هفتگی متوازن', description: 'طراحی سفره‌ای متنوع برای ۷ روز هفته که تمام گروه‌های غذایی را شامل شود.', icon: Calendar },
          { name: 'برنامه ماهانه استراتژیک', description: 'برنامه‌ریزی ۳۰ روزه برای کسانی که دوست دارند از قبل برای خرید و پخت و پز آمادگی کامل داشته باشند.', icon: Calendar },
          { name: 'جایگزینی آنی', description: 'اگر به هر دلیل تمایلی به پخت یک غذای پیشنهادی ندارید، با یک کلیک، سیستم گزینه‌ای مشابه و متناسب با ذائقه شما جایگزین می‌کند.', icon: RefreshCw },
          { name: 'چاپ حرفه‌ای برنامه', description: 'امکان خروجی گرفتن و چاپ برنامه در قالب‌های استاندارد و زیبا جهت نصب روی درب یخچال یا استفاده در آشپزخانه.', icon: Printer },
          { name: 'فیلترهای سریع برنامه', description: 'امکان اعمال فیلترهای لحظه‌ای مانند «فقط محبوب‌ها»، «غذاهای سریع» یا «بدون گوشت» بر روی کل برنامه.', icon: Filter },
          { name: 'افزودن تمام اقلام مورد نیاز برنامه به سبد خرید', description: 'با استفاده از این قابلیت، می‌توانید تمامی مواد اولیه مورد نیاز برای کل برنامه غذایی (روزانه، هفتگی یا ماهانه) را به صورت یکجا و هوشمند به لیست خرید خود اضافه کنید تا هیچ قلمی فراموش نشود.', icon: ShoppingCart }
        ]
      }
    ]
  },
  {
    id: 'pantry',
    title: 'آشپزخانه من',
    icon: ChefHat,
    color: 'orange',
    content: [
      {
        title: 'آشپزی خلاقانه با موجودی منزل',
        description: 'دیگر نگران این نباشید که «با چی چی بپزم؟»؛ نـوش بر اساس آنچه در اختیار دارید به شما پیشنهاد می‌دهد.',
        features: [
          { name: 'انبارگردانی دیجیتال', description: 'ثبت و مدیریت لیست موادی که در یخچال، فریزر و کابینت‌های خود موجود دارید.', icon: ChefHat },
          { name: 'پیشنهاد بر اساس موجودی', description: 'سیستم به صورت خودکار لیست غذاهایی که با مواد فعلی شما قابل پخت هستند را استخراج می‌کند.', icon: Wand2 },
          { name: 'دستیار پخت هوشمند', description: 'راهنمایی گام به گام برای استفاده بهینه از مواد اولیه‌ای که در اختیار دارید.', icon: Sparkles },
          { name: 'کسری مواد اولیه', description: 'مشاهده دقیق موادی که برای پخت یک غذای خاص کم دارید و امکان افزودن مستقیم آن‌ها به لیست خرید.', icon: ShoppingCart }
        ]
      }
    ]
  },
  {
    id: 'search',
    title: 'جستجوی پیشرفته و بانک پخت',
    icon: Search,
    color: 'blue',
    content: [
      {
        title: 'دایره‌المعارف جامع آشپزی',
        description: 'دسترسی به هزاران دستور پخت اصیل ایرانی و بین‌المللی با جزئیات کامل.',
        features: [
          { name: 'جستجوی ترکیبی', description: 'جستجو بر اساس نام، مواد اولیه، زمان پخت یا حتی سختی دستور پخت.', icon: Search },
          { name: 'دسته‌بندی‌های تخصصی', description: 'فیلتر کردن بر اساس پلوها، خورشت‌ها، کباب‌ها، غذاهای نونی، فست‌فود، دسر و ...', icon: Filter },
          { name: 'شناسنامه کامل غذا', description: 'مشاهده طبع غذا (گرم/سرد)، میزان کالری تقریبی، زمان آماده‌سازی و مراحل دقیق پخت.', icon: Info },
          { name: 'محبوب‌های شخصی', description: 'ایجاد یک کتابخانه شخصی از غذاهایی که عاشقشان هستید برای دسترسی در کمتر از یک ثانیه.', icon: Heart },
          { name: 'لیست سیاه شخصی', description: 'حذف دائمی غذاهایی که به هر دلیل دوست ندارید از کل پیشنهادات اپلیکیشن.', icon: ThumbsDown }
        ]
      }
    ]
  },
  {
    id: 'challenges',
    title: 'چالش‌ها',
    icon: Trophy,
    color: 'amber',
    content: [
      {
        title: 'آشپزی با طعم هیجان',
        description: 'با شرکت در چالش‌های دوره‌ای، مهارت‌های خود را ارتقا دهید و به یک سرآشپز حرفه‌ای تبدیل شوید.',
        features: [
          { name: 'ماموریت‌های روزانه', description: 'چالش‌های کوچک برای امتحان کردن طعم‌های جدید یا روش‌های پخت متفاوت.', icon: Trophy },
          { name: 'تغییر سبک زندگی', description: 'چالش‌های سلامتی‌محور مانند «هفته بدون قند» یا «ماه گیاه‌خواری» جهت بهبود رژیم غذایی.', icon: CheckCircle2 }
        ]
      }
    ]
  },
  {
    id: 'shopping',
    title: 'لیست خرید هوشمند',
    icon: ShoppingCart,
    color: 'indigo',
    content: [
      {
        title: 'خرید هدفمند و اقتصادی',
        description: 'جلوگیری از خرید مواد اضافی و فراموشی اقلام ضروری با مدیریت یکپارچه لیست خرید.',
        features: [
          { name: 'تجمیع خودکار مواد', description: 'مواد لازم برای تمام غذاهای موجود در برنامه شما به صورت خودکار جمع‌آوری و لیست می‌شوند.', icon: ShoppingCart },
          { name: 'دسته‌بندی اقلام خرید', description: 'مرتب‌سازی خودکار اقلام بر اساس بخش‌های فروشگاه (میوه، پروتئین، لبنیات و ...) جهت سرعت در خرید.', icon: Filter },
          { name: 'مدیریت دستی لیست', description: 'امکان اضافه کردن اقلام غیرغذایی یا متفرقه به لیست خرید روزانه.', icon: Plus },
          { name: 'چاپ لیست خرید', description: 'تهیه نسخه کاغذی از لیست خرید برای استفاده در فروشگاه.', icon: Printer }
        ]
      }
    ]
  },
  {
    id: 'notifications',
    title: 'مرکز تعامل و اعلان',
    icon: Bell,
    color: 'rose',
    content: [
      {
        title: 'ارتباط مستقیم و هوشمند',
        description: 'هیچ اتفاق مهمی را در دنیای آشپزی نـوش از دست نخواهید داد.',
        features: [
          { name: 'یادآور پخت و پز', description: 'اعلان‌های به موقع برای شروع مراحل پخت یا آماده‌سازی مواد اولیه برنامه روزانه.', icon: Bell },
          { name: 'اخبار و بروزرسانی', description: 'اطلاع از اضافه شدن دستورهای پخت جدید و قابلیت‌های تازه اپلیکیشن.', icon: Bell },
          { name: 'وضعیت اشتراک', description: 'هشدار پیش از پایان مهلت اشتراک جهت جلوگیری از وقفه در خدمات.', icon: AlertTriangle },
          { name: 'پیام‌های اختصاصی', description: 'دریافت پیشنهادات و پیام‌های شخصی‌سازی شده از طرف تیم پشتیبانی.', icon: MessageSquare }
        ]
      }
    ]
  },
  {
    id: 'settings',
    title: 'تنظیمات و شخصی‌سازی عمیق',
    icon: Settings,
    color: 'slate',
    content: [
      {
        title: 'نـوش، دقیقاً همانطور که شما می‌خواهید',
        description: 'تمام جزئیات اپلیکیشن را بر اساس سبک زندگی و نیازهای سلامتی خود تنظیم کنید.',
        features: [
          { name: 'مدیریت طبع و مزاج', description: 'تنظیم دقیق طبع بدن (گرم، سرد، معتدل) تا پیشنهادات کاملاً با فیزیولوژی شما سازگار باشد.', icon: ShieldCheck },
          { name: 'فیلتر حساسیت‌های غذایی', description: 'تعریف لیست مواد ممنوعه (آلرژی‌زا یا ناخوشایند) برای حذف خودکار از تمام دستورها.', icon: ThumbsDown },
          { name: 'شخصی‌سازی پروفایل', description: 'مدیریت اطلاعات کاربری، تصویر پروفایل و تنظیمات امنیتی.', icon: User },
          { name: 'بازخورد مستقیم', description: 'امکان ارسال نظرات، گزارش خطا یا پیشنهاد افزودن غذای جدید به تیم توسعه.', icon: MessageSquare },
          { name: 'حالت تمام صفحه', description: 'بهینه‌سازی نمایش اپلیکیشن برای تبلت‌ها و گوشی‌های بزرگ جهت راحتی در محیط آشپزخانه.', icon: Maximize }
        ]
      }
    ]
  }
];

const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-500/5 to-blue-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500 text-white rounded-2xl shadow-lg shadow-teal-200">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">راهنمای استفاده از اپلیکیشن</h2>
              <p className="text-xs text-slate-400 font-bold mt-1">آموزش کامل تمام بخش‌ها و امکانات نـوش</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 text-slate-400 hover:text-rose-500 rounded-2xl transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-8 no-scrollbar">
          <div className="space-y-4">
            {GUIDE_DATA.map((section) => (
              <div 
                key={section.id}
                className={`border-2 rounded-[2rem] transition-all overflow-hidden ${
                  activeSection === section.id 
                    ? `border-${section.color}-500 bg-${section.color}-50/30` 
                    : 'border-slate-50 bg-white hover:border-slate-100'
                }`}
              >
                <button 
                  onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                  className="w-full p-5 sm:p-6 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl sm:rounded-2xl bg-${section.color}-100 text-${section.color}-600 group-hover:scale-110 transition-transform`}>
                      <section.icon size={22} />
                    </div>
                    <span className="text-base sm:text-lg font-black text-slate-700">{section.title}</span>
                  </div>
                  <div className={`transition-transform duration-300 ${activeSection === section.id ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} className="text-slate-300" />
                  </div>
                </button>

                <AnimatePresence>
                  {activeSection === section.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-8 space-y-8"
                    >
                      {section.content.map((item, idx) => (
                        <div key={idx} className="space-y-6">
                          <div className="bg-white/60 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                              <Sparkles size={18} className={`text-${section.color}-500`} />
                              {item.title}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.description}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {item.features.map((feature, fIdx) => (
                              <div key={fIdx} className="p-5 bg-white rounded-3xl border border-slate-100 hover:border-teal-100 hover:shadow-md transition-all group">
                                <div className="flex items-start gap-4">
                                  {feature.icon && (
                                    <div className={`mt-1 p-2 bg-slate-50 text-slate-400 group-hover:bg-${section.color}-50 group-hover:text-${section.color}-500 rounded-lg transition-colors`}>
                                      <feature.icon size={16} />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-sm font-black text-slate-700 mb-1">{feature.name}</h4>
                                    <p className="text-xs text-slate-400 font-bold leading-relaxed">{feature.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Info size={16} />
            <span className="text-[10px] sm:text-xs font-bold">این راهنما به صورت دوره‌ای با افزودن امکانات جدید بروزرسانی می‌شود.</span>
          </div>
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            متوجه شدم
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UserGuide;
