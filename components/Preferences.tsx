import BackupManager from './admin/BackupManager';
import PersonalRecipes from './PersonalRecipes';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { UserProfile, DishCategory, CATEGORY_LABELS, NatureType, VisitorProfile } from '../types';
import { UserService } from '../services/userService';
import { LogOut, User, Sun, Snowflake, Scale, Heart, Plus, ThumbsDown, RotateCcw, ShieldCheck, Award, Info, Layers, Minus, FilterX, X, Check, CheckCircle, AlertTriangle, UserX, Search, MessageSquare, Camera, Leaf, Zap, Trophy, ChefHat, Sparkles, Smartphone, Share, Download, ExternalLink, ReceiptText } from 'lucide-react';
import { RecipeService } from '../services/recipeService';
import { PANTRY_ITEMS } from '../data/pantry';
import { CHALLENGES } from '../data/challenges';
import DishVisual from './DishVisual';
import FeedbackModal from './FeedbackModal';
import PurchaseReport from './PurchaseReport';

interface PreferencesProps {
  user: UserProfile;
  onUpdateUser: (update: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  onLogout: () => void;
  onNotify?: (title: string, message: string, icon: any, color: string) => void;
  onToggleFilter?: (filter: 'onlyFavoritesMode' | 'quickMealsMode' | 'meatlessMode') => void;
  installPrompt?: { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> } | null;
  isAppInstalled?: boolean;
  onInstallPromptConsumed?: () => void;
}

const ToggleSwitch = ({ isActive, onChange, label }: { isActive: boolean; onChange: () => void; label: string }) => {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      type="button"
      role="switch" aria-checked={isActive} aria-label={label}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        isActive ? 'bg-teal-500' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none absolute top-0.5 right-0.5 h-4 w-4 transform rounded-full bg-white shadow transition-all duration-200 ease-in-out ${
          isActive ? 'translate-x-[-20px]' : 'translate-x-[0px]'
        }`}
      />
    </button>
  );
};

const Preferences: React.FC<PreferencesProps> = ({ user, onUpdateUser, onLogout, onNotify, onToggleFilter, installPrompt, isAppInstalled, onInstallPromptConsumed }) => {
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [settingsTab, setSettingsTab] = useState<'planning' | 'taste' | 'recipes' | 'purchases' | 'device'>('planning');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      onInstallPromptConsumed?.();
      return;
    }
    setShowInstallHelp(value => !value);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit
      if (onNotify) onNotify('خطای تصویر', 'حجم تصویر باید کمتر از ۱ مگابایت باشد.', AlertTriangle, 'rose');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const updatedUser = await UserService.updateProfile(user.username, { avatar: base64 });
        onUpdateUser(updatedUser);
        if (onNotify) onNotify('بروزرسانی موفق', 'تصویر پروفایل شما با موفقیت تغییر کرد.', CheckCircle, 'emerald');
      } catch (err) {
        if (onNotify) onNotify('خطا', 'مشکلی در ذخیره تصویر پیش آمد.', AlertTriangle, 'rose');
      }
    };
    reader.readAsDataURL(file);
  };

  const savePreferences = async (updates: Partial<UserProfile>) => {
    try {
      const updated = await UserService.updateProfile(user.username, updates);
      onUpdateUser(updated);
    } catch {
      onNotify?.('ذخیره انجام نشد', 'فضای ذخیره‌سازی مرورگر را بررسی کنید و دوباره تلاش کنید.', AlertTriangle, 'rose');
    }
  };

  const toggleCategory = (cat: DishCategory) => {
    const current = user.excludedCategories || [];
    void savePreferences({ excludedCategories: current.includes(cat) ? current.filter(value => value !== cat) : [...current, cat] });
  };

  const toggleNature = (nature: NatureType) => {
      const currentNatures = user.preferredNatures || ['balanced'];
      const isActive = currentNatures.includes(nature);
      let newNatures: NatureType[];
      if (isActive) {
        if (currentNatures.length <= 1) {
          if (onNotify) onNotify('خطای تنظیمات', 'حداقل یک طبع باید فعال بماند.', AlertTriangle, 'rose');
          return;
        }
        newNatures = currentNatures.filter(n => n !== nature);
      } else {
        newNatures = [...currentNatures, nature];
      }
      void savePreferences({ preferredNatures: newNatures });
  };

  const toggleIngredient = (ing: string) => {
      let current = [...(user.dislikedIngredients || [])];
      if (current.includes(ing)) {
        current = current.filter(i => i !== ing);
      } else {
        current = [...current, ing];
      }
      void savePreferences({ dislikedIngredients: current });
  };

  const toPersian = (num: number | string | undefined | null) => {
    if (num === undefined || num === null) return '۰';
    return num.toString().replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  };

  const changeFamilySize = async (nextSize: number) => {
    const familySize = Math.max(1, Math.min(20, Math.round(nextSize)));
    try {
      const updatedUser = await UserService.updateProfile(user.username, { familySize });
      onUpdateUser(updatedUser);
    } catch {
      if (onNotify) onNotify('ذخیره انجام نشد', 'تعداد اعضای خانواده ذخیره نشد؛ دوباره تلاش کنید.', AlertTriangle, 'rose');
    }
  };

  const handleRemoveFavorite = async (e: React.MouseEvent, dishId: string) => {
    e.stopPropagation();
    try {
      const updatedUser = await UserService.toggleFavorite(user.username, dishId);
      onUpdateUser(updatedUser);
    } catch (err) {}
  };

  const handleRemoveBlacklist = async (e: React.MouseEvent, dishId: string) => {
    e.stopPropagation();
    try {
      const updatedUser = await UserService.toggleBlacklist(user.username, dishId);
      onUpdateUser(updatedUser);
    } catch (err) {}
  };

  const favoritesList = useMemo(() => RecipeService.getAllDishes(user).filter(d => (user.favoriteDishIds || []).includes(d.id)), [user.favoriteDishIds, user.personalRecipeEdits]);
  const blacklistedList = useMemo(() => RecipeService.getAllDishes(user).filter(d => (user.blacklistedDishIds || []).includes(d.id)), [user.blacklistedDishIds, user.personalRecipeEdits]);
  
  const commonIngredients = useMemo(() => {
    const all = PANTRY_ITEMS.flatMap(c => c.items);
    if (!ingredientSearch) return all.slice(0, 15);
    return all.filter(i => i.includes(ingredientSearch)).slice(0, 20);
  }, [ingredientSearch]);

  const handleToggleChallenge = async (challengeId: string) => {
    const isCurrentlyActive = user.activeChallengeId === challengeId;
    const nextActiveId = isCurrentlyActive ? null : challengeId;
    const selectedChallenge = CHALLENGES.find(c => c.id === challengeId);
    
    try {
      const updatedUser = await UserService.updateProfile(user.username, { activeChallengeId: nextActiveId });
      onUpdateUser(updatedUser);
      if (onNotify && selectedChallenge) {
        if (isCurrentlyActive) {
          onNotify(
            'چالش غیرفعال شد',
            'برنامه غذایی شما به حالت عادی بازگشت.',
            'bg-slate-600',
            Trophy
          );
        } else {
          onNotify(
            `چالش ${selectedChallenge.title} فعال شد`,
            selectedChallenge.description,
            'emerald',
            selectedChallenge.icon
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMainChallengeToggle = async () => {
    try {
      if (user.activeChallengeId) {
        const updatedUser = await UserService.updateProfile(user.username, { activeChallengeId: null });
        onUpdateUser(updatedUser);
        if (onNotify) {
          onNotify(
            'چالش غیرفعال شد',
            'برنامه غذایی شما به حالت عادی بازگشت.',
            'bg-slate-600',
            Trophy
          );
        }
      } else {
        const updatedUser = await UserService.updateProfile(user.username, { activeChallengeId: 'vegan-week' });
        onUpdateUser(updatedUser);
        if (onNotify) {
          onNotify(
            'چالش هفته گیاه‌خواری فعال شد',
            'یک هفته بدون گوشت قرمز، مرغ و ماهی. تمرکز روی سبزیجات و حبوبات.',
            'emerald',
            Leaf
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const settingsTabs = [
    { id: 'planning', label: 'برنامه و فیلترها', icon: Sparkles },
    { id: 'taste', label: 'سلیقه و پرهیزها', icon: Heart },
    { id: 'recipes', label: 'رسپی‌های من', icon: ChefHat },
    { id: 'purchases', label: 'گزارش خریدها', icon: ReceiptText },
    { id: 'device', label: 'دستگاه و پشتیبان', icon: Smartphone },
  ] as const;

  const handleSettingsTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = settingsTabs.findIndex(tab => tab.id === settingsTab);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? settingsTabs.length - 1
      : (currentIndex + (event.key === 'ArrowLeft' ? 1 : -1) + settingsTabs.length) % settingsTabs.length;
    setSettingsTab(settingsTabs[nextIndex].id);
    document.getElementById(`settings-tab-${settingsTabs[nextIndex].id}`)?.focus();
  };

  return (
    <div className="preferences-page flex flex-col h-full [@media(orientation:landscape)_and_(max-height:500px)]:h-auto animate-enter">
      {/* هدر شیشه‌ای دقیق با فونت استاندارد */}
      <div className="sticky top-0 [@media(orientation:landscape)_and_(max-height:500px)]:relative z-[900] bg-white/40 backdrop-blur-2xl px-4 py-3 sm:py-6 sm:px-10">
          <div className="backdrop-blur-3xl bg-white/50 border border-white/60 rounded-[1.75rem] sm:rounded-[3.5rem] p-4 sm:p-10 shadow-xl shadow-slate-200/50 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-8">
              <div className="flex items-center gap-3 sm:gap-6 text-right w-full sm:w-auto">
                <div 
                  className="relative group cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-100 rounded-2xl sm:rounded-[2.5rem] flex items-center justify-center shadow-inner overflow-hidden border-2 border-white ring-4 ring-slate-50">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-slate-300 sm:w-12 sm:h-12" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 sm:bottom-1 sm:right-1 w-6 h-6 sm:w-8 sm:h-8 bg-teal-500 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                    <Camera size={14} className="sm:w-5 sm:h-5" />
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleAvatarChange} 
                  />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-slate-800 leading-none">
                    {user.uid === 'local-guest' ? 'مهمان عزیز' : user.fullName || user.phoneNumber || user.mobileNumber || user.username || "کاربر نـوش"}
                  </h2>
                  {user.role && user.role !== 'user' && user.role !== 'normal' && (
                    <p className="text-teal-600 text-[8px] sm:text-xs font-black mt-1 sm:mt-2 uppercase tracking-widest">
                      {user.role === 'admin' ? 'ادمین' : user.role === 'visitor' ? 'ویزیتور' : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                 {!!document.fullscreenElement && (
                   <button onClick={() => document.exitFullscreen()} className="flex-1 sm:flex-none px-3 py-2.5 sm:px-8 sm:py-4 bg-slate-100 text-slate-700 rounded-xl sm:rounded-[1.5rem] font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-[10px] sm:text-sm shadow-sm">
                     <X size={16} className="sm:w-5" /> خروج از تمام صفحه
                   </button>
                 )}
                 <button onClick={() => setIsFeedbackOpen(true)} className="flex-1 sm:flex-none px-3 py-2.5 sm:px-8 sm:py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl sm:rounded-[1.5rem] font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-[10px] sm:text-sm shadow-sm"><MessageSquare size={16} className="sm:w-5" /> ارسال نظر</button>
                 {user.uid !== 'local-guest' && <button onClick={onLogout} className="flex-1 sm:flex-none px-3 py-2.5 sm:px-8 sm:py-4 bg-rose-600 text-white rounded-xl sm:rounded-[1.5rem] font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-[10px] sm:text-sm"><LogOut size={16} className="sm:w-5" /> خروج</button>}
              </div>
            </div>
          </div>
      </div>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} user={user} />

      <div className="flex-grow overflow-y-auto [@media(orientation:landscape)_and_(max-height:500px)]:overflow-visible px-3 sm:px-8 pb-16 no-scrollbar">
          <div className="max-w-5xl mx-auto py-3 sm:py-5 space-y-4 sm:space-y-5">
            <div role="tablist" aria-label="بخش‌های تنظیمات" className="settings-tabs sticky top-0 z-30 -mx-3 flex gap-2 overflow-x-auto border-b border-slate-200/80 bg-[#f5f7f2]/95 px-3 py-2 backdrop-blur-md sm:-mx-8 sm:px-8">
              {settingsTabs.map(tab => {
                const TabIcon = tab.icon;
                const selected = settingsTab === tab.id;
                return <button key={tab.id} id={`settings-tab-${tab.id}`} type="button" role="tab" aria-selected={selected} aria-controls={`settings-panel-${tab.id}`} tabIndex={selected ? 0 : -1} onClick={() => setSettingsTab(tab.id)} onKeyDown={handleSettingsTabKeyDown} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-black transition sm:flex-1 sm:px-4 sm:text-sm ${selected ? 'bg-[#276556] text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-[#276556]'}`}>
                  <TabIcon size={16} />{tab.label}
                </button>;
              })}
            </div>
            {settingsTab === 'recipes' && <div id="settings-panel-recipes" role="tabpanel" aria-labelledby="settings-tab-recipes"><PersonalRecipes user={user} onUpdateUser={nextUser => onUpdateUser(nextUser)} /></div>}
            {settingsTab === 'purchases' && <div id="settings-panel-purchases" role="tabpanel" aria-labelledby="settings-tab-purchases"><PurchaseReport user={user} /></div>}
            {settingsTab === 'device' && <div id="settings-panel-device" role="tabpanel" aria-labelledby="settings-tab-device" className="space-y-3"><BackupManager personalOnly />
              <nav aria-label="اطلاعات و پشتیبانی" className="grid gap-2 rounded-2xl border border-emerald-100 bg-white p-3 sm:grid-cols-2">
                <a href="/privacy.html" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f6f0] px-4 text-sm font-bold text-[#276556] transition hover:bg-[#e5efe5]">حریم خصوصی و داده‌های شما</a>
                <a href="/support.html" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f6f0] px-4 text-sm font-bold text-[#276556] transition hover:bg-[#e5efe5]">راهنمای پشتیبانی</a>
              </nav>
              <div className="grid gap-3 md:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-l from-[#eaf4ef] via-white to-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#276556] text-white shadow-sm"><Smartphone size={19}/></div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900">نوش را مثل اپ روی گوشی باز کن</h2>
                      <p className="mt-1 text-[11px] leading-5 text-slate-600">با افزودن به صفحهٔ اصلی، بدون نوار آدرس باز می‌شود.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => isAppInstalled ? setShowInstallHelp(value => !value) : void installApp()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#276556] px-3.5 py-2 text-[11px] font-black text-white transition hover:bg-[#347866]">
                    {isAppInstalled ? <CheckCircle size={17}/> : installPrompt ? <Download size={17}/> : <Share size={17}/>}
                    {isAppInstalled ? 'نوش نصب شده است' : installPrompt ? 'نصب نوش' : 'راهنمای افزودن به صفحهٔ اصلی'}
                  </button>
                </div>
                {showInstallHelp && !isAppInstalled && <div className="mt-4 grid gap-2 border-t border-emerald-100 pt-3 text-[11px] leading-5 text-slate-700 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/80 p-4"><p className="flex items-center gap-2 font-black text-slate-900"><Share size={16} className="text-[#276556]"/> آیفون و آیپد</p><p className="mt-2">صفحهٔ نوش را در <strong>Safari</strong> باز کن، دکمهٔ اشتراک‌گذاری را بزن و <strong>Add to Home Screen / افزودن به صفحهٔ اصلی</strong> را انتخاب کن.</p></div>
                  <div className="rounded-2xl bg-white/80 p-4"><p className="flex items-center gap-2 font-black text-slate-900"><Smartphone size={16} className="text-[#276556]"/> اندروید</p><p className="mt-2">منوی مرورگر <strong>Chrome</strong> را باز کن و <strong>Install app / نصب برنامه</strong> یا <strong>Add to Home screen / افزودن به صفحهٔ اصلی</strong> را بزن.</p></div>
                  <p className="sm:col-span-2 text-[11px] text-slate-500">اگر گزینهٔ نصب نمایش داده نشد، سایت را مستقیم در مرورگر اصلی گوشی باز کن و دوباره منوی اشتراک‌گذاری یا مرورگر را بررسی کن.</p>
                </div>}
                {showInstallHelp && isAppInstalled && <p className="mt-3 border-t border-emerald-100 pt-3 text-[11px] leading-5 text-emerald-900">نوش از صفحهٔ اصلی گوشی به شکل مستقل اجرا می‌شود. برای حذف نوار مرورگر، آیکن نوش را از صفحهٔ اصلی باز کن.</p>}
              </section>
              </div>
            </div>}

            {settingsTab === 'planning' && <div id="settings-panel-planning" role="tabpanel" aria-labelledby="settings-tab-planning" className="space-y-4">
              {/* تنظیمات برنامه‌ریزی و فیلترهای سریع */}
              <section className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:p-5">
                <div>
                  <h2 className="text-base sm:text-xl font-black text-slate-800">تعداد اعضای خانواده</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-6">مقدار مواد رسپی‌ها، کسری خرید و محاسبهٔ انبار بر پایهٔ این تعداد تنظیم می‌شود. دستورهای اصلی برای ۴ نفر ثبت شده‌اند.</p>
                </div>
                <div className="flex items-center justify-between sm:justify-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-2 min-w-44">
                  <button type="button" aria-label="کم کردن تعداد اعضای خانواده" disabled={(user.familySize || 4) <= 1} onClick={() => void changeFamilySize((user.familySize || 4) - 1)} className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 grid place-items-center hover:text-rose-600 disabled:opacity-40"><Minus size={18} /></button>
                  <span className="text-center min-w-16"><strong className="block text-xl font-black text-slate-900">{toPersian(user.familySize || 4)}</strong><small className="text-[10px] text-slate-500">نفر</small></span>
                  <button type="button" aria-label="زیاد کردن تعداد اعضای خانواده" disabled={(user.familySize || 4) >= 20} onClick={() => void changeFamilySize((user.familySize || 4) + 1)} className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 grid place-items-center hover:text-emerald-700 disabled:opacity-40"><Plus size={18} /></button>
                </div>
              </section>

              <div id="smart-filters-section" className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 space-y-4 sm:p-5">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                       <Layers size={19} />
                    </div>
                    <div>
                       <h2 className="text-sm sm:text-base font-black text-slate-800">تنظیمات برنامه‌ریزی و فیلترهای سریع</h2>
                       <p className="text-[10px] text-slate-500 font-medium mt-1">رژیم، پیشنهادهای شخصی و چالش‌ها را تنظیم کن.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                    {/* رژیم بدون گوشت */}
                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50/50 hover:bg-slate-50/80 border border-slate-100/80 rounded-xl transition-all">
                       <div className="flex min-w-0 items-center gap-2.5 text-right">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                             <Leaf size={20} className="sm:w-6 sm:h-6" />
                          </div>
                          <div>
                             <h3 className="text-xs sm:text-sm font-black text-slate-800">رژیم بدون گوشت</h3>
                             <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-normal">حذف خودکار غذاهای گوشتی و کباب‌ها</p>
                          </div>
                       </div>
                       <ToggleSwitch label="رژیم بدون گوشت"
                          isActive={!!user.meatlessMode} 
                          onChange={() => onToggleFilter?.('meatlessMode')} 
                       />
                    </div>

                    {/* فیلتر فقط محبوب‌ها */}
                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50/50 hover:bg-slate-50/80 border border-slate-100/80 rounded-xl transition-all">
                       <div className="flex min-w-0 items-center gap-2.5 text-right">
                          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                             <Heart size={20} className="sm:w-6 sm:h-6" fill={user.onlyFavoritesMode ? "currentColor" : "none"} />
                          </div>
                          <div>
                             <h3 className="text-xs sm:text-sm font-black text-slate-800">فقط غذاهای محبوب من</h3>
                             <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-normal">نمایش غذاهای پسندیده</p>
                          </div>
                       </div>
                       <ToggleSwitch label="فقط غذاهای محبوب من"
                          isActive={!!user.onlyFavoritesMode} 
                          onChange={() => onToggleFilter?.('onlyFavoritesMode')} 
                       />
                    </div>

                    {/* غذاهای سریع پشت */}
                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50/50 hover:bg-slate-50/80 border border-slate-100/80 rounded-xl transition-all">
                       <div className="flex min-w-0 items-center gap-2.5 text-right">
                          <div className="p-2 bg-amber-50 text-amber-500 rounded-lg shrink-0">
                             <Zap size={20} className="sm:w-6 sm:h-6" />
                          </div>
                          <div>
                             <h3 className="text-xs sm:text-sm font-black text-slate-800">غذاهای سریع‌پخت</h3>
                             <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-normal">اولویت عالی به غذاهای زیر ۴۵ دقیقه</p>
                          </div>
                       </div>
                       <ToggleSwitch label="غذاهای سریع‌پخت"
                          isActive={!!user.quickMealsMode} 
                          onChange={() => onToggleFilter?.('quickMealsMode')} 
                       />
                    </div>

                    {/* چالش‌های هفتگی */}
                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50/50 hover:bg-slate-50/80 border border-slate-100/80 rounded-xl transition-all">
                       <div className="flex min-w-0 items-center gap-2.5 text-right">
                          <div className="p-2 bg-violet-50 text-violet-600 rounded-lg shrink-0">
                             <Trophy size={20} className="sm:w-6 sm:h-6" />
                          </div>
                          <div>
                             <h3 className="text-xs sm:text-sm font-black text-slate-800">چالش‌های هفتگی فعال</h3>
                             <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-normal">
                                {user.activeChallengeId 
                                   ? `چالش فعال: ${CHALLENGES.find(c => c.id === user.activeChallengeId)?.title || "هفته گیاه‌خواری"}` 
                                   : 'بدون چالش هفتگی فعال'}
                             </p>
                          </div>
                       </div>
                       <ToggleSwitch label="چالش‌های هفتگی"
                          isActive={!!user.activeChallengeId} 
                          onChange={handleMainChallengeToggle} 
                       />
                    </div>
                 </div>

                 {/* انتخاب و تغییر مستقیم چالش در صورت فعال بودن */}
                 {user.activeChallengeId && (
                    <div className="mt-4 pt-4 border-t border-slate-100/80 animate-enter text-right">
                       <p className="text-xs font-bold text-slate-600 mb-3 block">شما می‌توانید چالش فعال خود را از بین گزینه‌های زیر تغییر دهید:</p>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {CHALLENGES.map(ch => {
                             const isCurrent = user.activeChallengeId === ch.id;
                             const ChIcon = ch.icon;
                             return (
                                <button
                                   key={ch.id}
                                   onClick={() => handleToggleChallenge(ch.id)}
                                   className={`flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 transition-all text-right ${
                                      isCurrent 
                                         ? 'bg-violet-600 border-violet-600 text-white shadow-md' 
                                         : 'bg-white hover:bg-slate-50 text-slate-700'
                                   }`}
                                >
                                   <div className={`p-1.5 rounded-lg shrink-0 ${isCurrent ? 'bg-white/20 text-white' : `${ch.color} text-white`}`}>
                                      <ChIcon size={16} />
                                   </div>
                                   <div className="min-w-0 flex-1">
                                      <h4 className="text-xs font-black truncate">{ch.title}</h4>
                                      <p className={`text-[9px] truncate ${isCurrent ? 'text-violet-100' : 'text-slate-400'}`}>{ch.description}</p>
                                   </div>
                                </button>
                             );
                          })}
                       </div>
                    </div>
                 )}
              </div>
            </div>}

            {settingsTab === 'taste' && <div id="settings-panel-taste" role="tabpanel" aria-labelledby="settings-tab-taste" className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-2">
              <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 space-y-4 sm:p-5">
                 <div className="flex items-center gap-3 sm:gap-4"><div className="p-3 sm:p-4 bg-orange-50 text-orange-600 rounded-xl sm:rounded-[1.5rem]"><ShieldCheck size={22} className="sm:w-8" /></div><div><h2 className="text-base sm:text-2xl font-black text-slate-800">فیلتر طبع غذاها</h2><p className="text-[9px] sm:text-xs text-slate-400 font-bold mt-1">انتخاب مزاج برای پیشنهادات دقیق‌تر</p></div></div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'hot', label: 'طبع گرم', icon: Sun, color: 'orange' },
                      { id: 'cold', label: 'طبع سرد', icon: Snowflake, color: 'blue' },
                      { id: 'balanced', label: 'طبع معتدل', icon: Scale, color: 'emerald' }
                    ].map(n => (
                      <button key={n.id} onClick={() => toggleNature(n.id as NatureType)} className={`flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 ${(user.preferredNatures || []).includes(n.id as NatureType) ? `bg-${n.color === 'blue' ? 'blue-600' : n.color + '-500'} border-${n.color === 'blue' ? 'blue-700' : n.color + '-600'} text-white shadow-sm` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                         <div className="flex items-center gap-2"><n.icon size={19} /><span className="font-black text-xs">{n.label}</span></div>
                         {(user.preferredNatures || []).includes(n.id as NatureType) ? <CheckCircle size={17} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-100"></div>}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 space-y-3 sm:p-5">
                <div className="flex items-center gap-3 sm:gap-4"><div className="p-3 sm:p-4 bg-rose-50 text-rose-600 rounded-xl sm:rounded-[1.5rem]"><UserX size={22} className="sm:w-8" /></div><div><h2 className="text-base sm:text-2xl font-black text-slate-800">مواد غذایی ممنوعه</h2><p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1 leading-5">مواد حساسیت‌زا یا خوراکی‌هایی را که نمی‌خورید اضافه کنید؛ غذاهای دارای این مواد از پیشنهادها حذف می‌شوند.</p></div></div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="جستجو و انتخاب ماده غذایی..." 
                    value={ingredientSearch} 
                    onChange={e => setIngredientSearch(e.target.value)} 
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && ingredientSearch.trim()) {
                            toggleIngredient(ingredientSearch.trim());
                            setIngredientSearch('');
                        }
                    }}
                    className="w-full px-11 py-3 sm:px-12 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-rose-400 font-bold text-sm transition-all"
                  />
                  <Search className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-slate-300 sm:w-6" size={18} />
                  {ingredientSearch && (
                    <button 
                      onClick={() => { toggleIngredient(ingredientSearch.trim()); setIngredientSearch(''); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-1.5 sm:px-4 sm:py-2 bg-rose-600 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black shadow-lg animate-enter"
                    >
                      ثبت ماده
                    </button>
                  )}
                </div>

                {/* نمایش نتایج جستجو */}
                {ingredientSearch && (
                  <div className="flex flex-wrap gap-2 animate-enter bg-rose-50/30 p-3 rounded-xl border border-rose-100/50">
                    {commonIngredients.filter(i => !(user.dislikedIngredients || []).includes(i)).map(ing => (
                      <button 
                        key={ing} 
                        onClick={() => { toggleIngredient(ing); setIngredientSearch(''); }}
                        className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-2 hover:bg-rose-50 transition-all active:scale-95"
                      >
                        <Plus size={14} /> {ing}
                      </button>
                    ))}
                    {commonIngredients.filter(i => !(user.dislikedIngredients || []).includes(i)).length === 0 && (
                      <p className="text-[10px] sm:text-xs text-rose-400 font-bold italic w-full text-center">موردی یافت نشد، از دکمه ثبت بالا استفاده کنید.</p>
                    )}
                  </div>
                )}

                <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                  {(user.dislikedIngredients || []).map(ing => (
                    <button key={ing} onClick={() => toggleIngredient(ing)} className="px-4 py-2 sm:px-6 sm:py-3 bg-rose-600 text-white rounded-lg sm:rounded-2xl text-[10px] sm:text-sm font-black flex items-center gap-2 sm:gap-3 shadow-lg">
                      {ing} <X size={14} className="sm:w-4" />
                    </button>
                  ))}
                </div>
              </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 space-y-4 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-xl sm:rounded-[1.5rem]"><Heart size={22} fill="currentColor"/></div>
                      <h2 className="text-sm sm:text-xl font-black text-slate-800">غذاهای محبوب من</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 max-h-48 sm:max-h-64 overflow-y-auto no-scrollbar">
                        {favoritesList.length > 0 ? favoritesList.map(dish => (
                            <div key={dish.id} className="relative group rounded-xl sm:rounded-2xl overflow-hidden h-16 sm:h-20 bg-slate-50 border border-slate-100">
                                <DishVisual category={dish.category} className="w-full h-full opacity-40" dishId={dish.id} />
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-black p-2 text-center text-slate-700 leading-tight">{dish.name}</span>
                                <button 
                                  onClick={(e) => handleRemoveFavorite(e, dish.id)}
                                  className="absolute top-1 left-1 p-1 bg-white/80 rounded-full text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                  <X size={12} strokeWidth={3} />
                                </button>
                            </div>
                        )) : (
                          <div className="col-span-2 py-10 text-center text-slate-300 text-xs font-bold italic">لیست خالی است</div>
                        )}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 space-y-4 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-3 bg-slate-100 text-slate-600 rounded-xl sm:rounded-[1.5rem]"><ThumbsDown size={22}/></div>
                      <h2 className="text-sm sm:text-xl font-black text-slate-800">لیست سیاه غذاها</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 max-h-48 sm:max-h-64 overflow-y-auto no-scrollbar">
                        {blacklistedList.length > 0 ? blacklistedList.map(dish => (
                            <div key={dish.id} className="relative group rounded-xl sm:rounded-2xl overflow-hidden h-16 sm:h-20 bg-slate-50 border border-slate-100">
                                <DishVisual category={dish.category} className="w-full h-full opacity-40" dishId={dish.id} />
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-black p-2 text-center text-slate-700 leading-tight">{dish.name}</span>
                                <button 
                                  onClick={(e) => handleRemoveBlacklist(e, dish.id)}
                                  className="absolute top-1 left-1 p-1 bg-white/80 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                  <X size={12} strokeWidth={3} />
                                </button>
                            </div>
                        )) : (
                          <div className="col-span-2 py-10 text-center text-slate-300 text-xs font-bold italic">لیست خالی است</div>
                        )}
                    </div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                <div className="flex items-center gap-3 mb-4"><div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><FilterX size={19} /></div><div><h2 className="text-sm sm:text-base font-black text-slate-800">فیلتر دسته‌ها</h2><p className="text-[10px] text-slate-500 font-medium mt-1 leading-5">با خاموش‌کردن هر دسته، غذاهای آن از پیشنهادها و برنامه کنار گذاشته می‌شوند.</p></div></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {(Object.keys(CATEGORY_LABELS) as DishCategory[]).map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => toggleCategory(cat)} 
                        className={`px-3 py-2.5 rounded-xl text-[11px] font-black transition-all border flex flex-row items-center justify-center gap-2 ${
                          user.excludedCategories?.includes(cat) 
                            ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60' 
                            : 'bg-white border-teal-500 text-teal-700 shadow-sm ring-1 ring-teal-50'
                        }`}
                      >
                          {CATEGORY_LABELS[cat]}
                          {user.excludedCategories?.includes(cat) ? <X size={14} className="sm:w-5" /> : <Check size={14} className="sm:w-5" />}
                      </button>
                    ))}
                </div>
              </div>
            </div>}
          </div>
      </div>
    </div>
  );
};

export default Preferences;
