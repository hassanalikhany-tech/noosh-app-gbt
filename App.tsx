import PlanDashboard from './components/PlanDashboard';
import AdminAccessGate from './components/admin/AdminAccessGate';

import { CalendarDays, RefreshCw, ChefHat, Search, Settings, Trophy, X, ShoppingCart, Heart, Clock, Trash2, Calendar, Leaf, Sparkles, Utensils, ShieldCheck, ArrowRight, CloudDownload, UserX, Info, CheckCircle2, Wand2, Loader2, ScanFace, Printer, Share2, MessageCircle, Smartphone, Database, ShieldAlert, FilterX, Check, AlertTriangle, Shield, LayoutDashboard, Bell, Zap, Maximize, Minimize, Package } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import Challenges from './components/Challenges';
import MealCard from './components/MealCard';
const PantryChef = lazy(() => import('./components/PantryChef'));
const Preferences = lazy(() => import('./components/Preferences'));
import RecipeSearch from './components/RecipeSearch';
import ShoppingList from './components/ShoppingList';
import AuthGate from './components/auth/AuthGate';
import NotificationCenter from './components/NotificationCenter';
import { RecipeService } from './services/recipeService';
import { UserService } from './services/userService';
import { NotificationService } from './services/notificationService';
import { DayPlan, KitchenMode, UserProfile, CATEGORY_LABELS, DishCategory, Notification } from './types';
import { filterDishes, generateDailyPlan, generateWeeklyPlan, generateMonthlyPlan, generateSingleReplacement } from './utils/planner';
import { getShoppingShortages, parseQuantity } from './utils/recipeHelpers';
import { CHALLENGES } from './data/challenges';
import { getBaseIngredientName } from './data/pantry';
import { getRelevantInventory } from './utils/kitchenMode';
import metadata from './metadata.json';

type ViewMode = 'plan' | 'pantry' | 'search' | 'challenges' | 'settings';


interface FilterNotif {
  show: boolean;
  message: string;
  active: boolean;
  icon: any;
  color: string;
  exiting: boolean;
  filterKey: string; 
}

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [displayPlan, setDisplayPlan] = useState<DayPlan[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('pantry');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [appVersion, setAppVersion] = useState(metadata.name.split(' ').pop() || "V16.2");
  const [planLoading, setPlanLoading] = useState<'daily' | 'weekly' | 'monthly' | null>(null);
  const [isSyncingPlan, setIsSyncingPlan] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previousPlan, setPreviousPlan] = useState<DayPlan[] | null>(null);
  const [planError, setPlanError] = useState('');

  const enterFullscreen = () => {
    try {
      const elem = document.documentElement as any;
      const requestMethod = elem.requestFullscreen || 
                           elem.webkitRequestFullscreen || 
                           elem.webkitRequestFullScreen ||
                           elem.mozRequestFullScreen || 
                           elem.msRequestFullscreen;
      if (requestMethod) {
        requestMethod.call(elem).catch((err: any) => {
          console.error("Fullscreen error:", err);
        });
      } else {
        // Fallback for devices that don't support Fullscreen API (like iPhone)
        window.scrollTo(0, 1);
        setIsFullscreen(true); // Simulate state for UI toggle
      }
    } catch (e) {
      console.log("Fullscreen request failed");
    }
  };

  const exitFullscreen = () => {
    try {
      const doc = document as any;
      const exitMethod = doc.exitFullscreen || 
                        doc.webkitExitFullscreen || 
                        doc.webkitCancelFullScreen ||
                        doc.mozCancelFullScreen || 
                        doc.msExitFullscreen;
      if (exitMethod) {
        exitMethod.call(doc).catch(() => {});
      } else {
        setIsFullscreen(false);
      }
    } catch (e) {
      console.log("Exit fullscreen failed");
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || 
                         doc.webkitFullscreenElement || 
                         doc.mozFullScreenElement || 
                         doc.msFullscreenElement));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        exitFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  const [filterNotif, setFilterNotif] = useState<FilterNotif>({ 
    show: false, message: '', active: false, icon: Info, color: 'teal', exiting: false, filterKey: ''
  });

  const checkUnreadNotifications = async (user: UserProfile) => {
    try {
      const notifs = await NotificationService.getUserNotifications(
        user.uid, 
        user.role || 'user', 
        user.subscriptionExpiry > Date.now()
      );
      const readIds = user.readNotificationIds || [];
      const deletedIds = user.deletedNotificationIds || [];
      const unread = notifs.filter(n => !readIds.includes(n.id) && !deletedIds.includes(n.id)).length;
      setUnreadNotifCount(unread);
    } catch (e) {
      console.error("Failed to fetch unread count");
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        // ۱. تلاش برای بارگذاری رسپی‌ها از حافظه محلی (موقتی) - با خطاگیری مجزا برای جلوگیری از قفل شدن کل سیستم
        try {
          await RecipeService.initialize();
        } catch (recipeErr) {
          console.error("Local recipes cache initialization failed:", recipeErr);
        }

        // ۲. دریافت اطلاعات کاربر فعلی
        const user = await UserService.getCurrentUser();
        if (user) {
          const kitchenMode = user.kitchenMode || 'with-inventory';
          if (!user.kitchenMode) UserService.updateProfile(user.username, { kitchenMode }).catch(err => console.error('Kitchen mode initialization failed:', err));
          setViewMode('pantry');
          setCurrentUser({ ...user, kitchenMode });
          const savedPlanMode = user.weeklyPlanMode || kitchenMode;
          if (user.weeklyPlan && savedPlanMode === kitchenMode) setDisplayPlan(user.weeklyPlan);
          
          // فرآیندهای فرعی و تحت شبکه که نباید لود اولیه اپلیکیشن را معطل نگه دارند
          checkUnreadNotifications(user).catch(err => console.error("Notification check failed:", err));
          UserService.updateProfile(user.username, { lastActiveAt: Date.now() }).catch(err => console.error("Last active update failed:", err));
        } else {
          // اگر با وجود لاگین بودن، داکیومنت کاربر در دیتابیس یافت نشد، نشست را پاک کرده و به صفحه ورود هدایت می‌کنیم تا از لودینگ نامحدود جلوگیری شود
          await UserService.logout();
        }

        // The current release is intentionally local-only; recipes are bundled and cached on this device.
      } catch (err) { 
        console.error("Critical error in initApp:", err); 
      } finally { 
        setIsInitializing(false); 
      }
    };
    initApp();

    const handleUserUpdate = async () => {
      const user = await UserService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        await checkUnreadNotifications(user);
      }
    };

    window.addEventListener('user-data-updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);

    return () => {
      window.removeEventListener('user-data-updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  // Never leave a visible suggestion that conflicts with the user's current saved food preferences.
  useEffect(() => {
    if (!currentUser || displayPlan.length === 0) return;
    const allowedDishIds = new Set(filterDishes(currentUser).map(dish => dish.id));
    setDisplayPlan(previous => {
      const compatible = previous.filter(item => allowedDishIds.has(item.dish.id));
      return compatible.length === previous.length ? previous : compatible;
    });
    setPreviousPlan(null);
  }, [
    currentUser?.blacklistedDishIds,
    currentUser?.dislikedIngredients,
    currentUser?.excludedCategories,
    currentUser?.excludedNationalities,
    currentUser?.preferredNatures,
    currentUser?.favoriteDishIds,
    currentUser?.onlyFavoritesMode,
    currentUser?.meatlessMode,
    currentUser?.quickMealsMode,
    currentUser?.activeChallengeId,
  ]);

  useEffect(() => {
    if (filterNotif.show && !filterNotif.exiting) {
      const timer = setTimeout(() => {
        closeNotif();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [filterNotif.show, filterNotif.exiting, filterNotif.filterKey, dontShowAgain, currentUser]);

  const closeNotif = async () => {
    if (dontShowAgain && filterNotif.filterKey && currentUser) {
      UserService.hideGuidance(currentUser.uid, filterNotif.filterKey).catch(err => {
        console.error("Failed to hide guidance in background:", err);
      });
    }
    setFilterNotif(prev => ({ ...prev, exiting: true }));
    setTimeout(() => setFilterNotif(prev => ({ ...prev, show: false, exiting: false })), 800);
    setDontShowAgain(false);
  };

  const handleToggleFilter = async (filter: 'onlyFavoritesMode' | 'quickMealsMode' | 'meatlessMode') => {
    if (!currentUser) return;
    const newVal = !currentUser[filter];
    
    const isHidden = currentUser.hiddenGuidanceKeys?.includes(filter);
    
    if (!isHidden) {
      let msg = "";
      let icon = Info;
      let color = "teal";
      
      if (filter === 'meatlessMode') {
        msg = newVal ? "رژیم گیاه‌خواری فعال شد. غذاهای گوشتی از پیشنهادات حذف می‌شوند." : "رژیم گیاه‌خواری غیرفعال شد. پیشنهادات به حالت عادی بازگشت.";
        icon = Leaf; color = "emerald";
      } else if (filter === 'onlyFavoritesMode') {
        msg = newVal ? "حالت محبوب‌ها فعال شد. فقط غذاهای مورد علاقه شما پیشنهاد می‌شوند." : "حالت محبوب‌ها غیرفعال شد. تمام غذاها نمایش داده می‌شوند.";
        icon = Heart; color = "rose";
      } else {
        msg = newVal ? "حالت غذای سریع فعال شد. غذاهای زیر ۴۵ دقیقه در اولویت هستند." : "حالت غذای سریع غیرفعال شد.";
        icon = Zap; color = "amber";
      }

      setFilterNotif({ show: true, message: msg, active: newVal, icon, color, exiting: false, filterKey: filter });
    }

    const updatedUser = await UserService.updateProfile(currentUser.username, { [filter]: newVal });
    setCurrentUser(updatedUser);
  };

  const handleKitchenModeChange = async (kitchenMode: KitchenMode) => {
    if (!currentUser || currentUser.kitchenMode === kitchenMode) return;
    try {
      const updatedUser = await UserService.updateProfile(currentUser.username, { kitchenMode });
      setCurrentUser(updatedUser);
      const savedPlanMode = currentUser.weeklyPlanMode || currentUser.kitchenMode || 'with-inventory';
      setDisplayPlan(savedPlanMode === kitchenMode ? currentUser.weeklyPlan || [] : []);
      setPreviousPlan(null);
    } catch (err) {
      console.error('Kitchen mode update failed:', err);
      setPlanError('تغییر حالت استفاده ذخیره نشد. دوباره تلاش کنید.');
    }
  };

  const handleChallengeNotify = (title: string, message: string, colorClass: string, icon: any) => {
    if (!currentUser) return;
    const isHidden = currentUser.hiddenGuidanceKeys?.includes('challenge');
    if (isHidden) return;

    setFilterNotif({
      show: true,
      message: `${title}: ${message}`,
      active: true,
      icon: icon,
      color: colorClass.includes('emerald') ? 'emerald' : colorClass.includes('rose') ? 'rose' : colorClass.includes('blue') ? 'blue' : colorClass.includes('green') ? 'emerald' : 'purple',
      exiting: false,
      filterKey: 'challenge'
    });
  };

  const handleGeneratePlan = async (type: 'daily' | 'weekly' | 'monthly') => {
    if (!currentUser) return;

    const isHidden = currentUser.hiddenGuidanceKeys?.includes(`plan_${type}`);
    if (!isHidden) {
      let msg = "";
      let icon = Info;
      if (type === 'daily') {
        msg = "برنامه امروز بر اساس ذائقه و فیلترهای انتخابی شما تنظیم می‌شود.";
        icon = Utensils;
      } else if (type === 'weekly') {
        msg = "برنامه هفتگی شامل ۷ پخت متنوع برای کل هفته شماست.";
        icon = Calendar;
      } else {
        msg = "برنامه ماهانه یک لیست کامل ۳۰ روزه برای مدیریت بلندمدت است.";
        icon = CalendarDays;
      }
      setFilterNotif({ show: true, message: msg, active: true, icon, color: 'indigo', exiting: false, filterKey: `plan_${type}` });
    }

    setPlanError('');
    setPlanLoading(type);
    try {
      let result;
      if (type === 'daily') result = await generateDailyPlan(currentUser);
      else if (type === 'weekly') result = await generateWeeklyPlan(currentUser);
      else result = await generateMonthlyPlan(currentUser);
      setPreviousPlan(displayPlan);
      setDisplayPlan(result.plan);
      setCurrentUser(result.updatedUser);
    } catch (err: any) {
      setPlanError(err.message || 'خطا در تولید برنامه');
    } finally { setPlanLoading(null); }
  };

  const handleRefreshSingleMeal = async (index: number) => {
      if (!currentUser) return;
      try {
          const currentDishIds = displayPlan.map(p => p.dish.id);
          const newDish = await generateSingleReplacement(currentUser, currentDishIds);
          
          const newPlan = [...displayPlan];
          newPlan[index] = { ...newPlan[index], dish: newDish };
          
          setDisplayPlan(newPlan);
          const updatedUser = await UserService.updateProfile(currentUser.username, { weeklyPlan: newPlan, weeklyPlanMode: currentUser.kitchenMode || 'with-inventory' });
          setCurrentUser(updatedUser);
      } catch (err: any) {
          setPlanError(err.message || 'تعویض غذا انجام نشد.');
      }
  };

  const handleSyncPlanToShoppingList = async () => {
    if (!currentUser || displayPlan.length === 0) return;
    setIsSyncingPlan(true);

    try {
      const allIngredients: any[] = [];
      const targetServings = currentUser.familySize || 4;
      displayPlan.forEach(plan => {
        [plan.dish, plan.sideDish].forEach(dish => {
          if (!dish?.ingredients) return;
          const scale = targetServings / (dish.servings || 4);
          allIngredients.push(...dish.ingredients.map(ingredient => ({ ...ingredient, amount: parseQuantity(ingredient.amount) * scale })));
        });
      });

      const missingItems = getShoppingShortages(
        getRelevantInventory(currentUser),
        allIngredients,
        1,
        1
      );

      // Replace previous uncompleted plan-generated rows so reopening the same plan never doubles quantities.
      const currentShoppingList = (currentUser.customShoppingList || []).filter(item => item.checked || item.fromRecipe !== 'برنامه غذایی');
      
      missingItems.forEach(missing => {
        const baseName = getBaseIngredientName(missing.item);
        const existingIdx = currentShoppingList.findIndex(item => item.name.trim() === baseName.trim() && !item.checked && !item.fromRecipe && item.amount === undefined);
        
        if (existingIdx !== -1) {
          currentShoppingList[existingIdx] = {
            ...currentShoppingList[existingIdx],
            amount: missing.amount,
            unit: missing.unit,
            fromRecipe: 'برنامه غذایی',
            category: missing.category || currentShoppingList[existingIdx].category
          };
        } else {
          currentShoppingList.push({
            id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: baseName,
            checked: false,
            amount: missing.amount,
            unit: missing.unit,
            fromRecipe: 'برنامه غذایی',
            category: missing.category,
            estimated: missing.estimated, unresolved: missing.unresolved
          });
        }
      });

      const updatedUser = {
        ...currentUser,
        customShoppingList: currentShoppingList
      };

      setCurrentUser(updatedUser);
      await UserService.updateShoppingList(currentUser.username, currentShoppingList);
      setIsShoppingListOpen(true);
    } catch (err: any) {
      console.error("Sync error:", err);
      alert("خطا در همگام‌سازی با لیست خرید");
    } finally {
      setIsSyncingPlan(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await UserService.logout(); setCurrentUser(null); }
    catch (error) { console.error(error); }
    finally { setIsLoggingOut(false); }
  };

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  const footerMessage = useMemo(() => {
    if (planLoading) return "در حال تنظیم هوشمند برنامه غذایی شما...";
    if (RecipeService.getLocalCount() === 0) return "در حال بارگذاری بانک اطلاعات پخت‌ها...";
    if (!currentUser || currentUser.uid === "local-guest") return "";
    const now = Date.now();
    const expiry = currentUser.subscriptionExpiry || 0;
    if (expiry < now) return "⚠️ اشتراک شما منقضی شده؛ جهت دسترسی کامل تمدید کنید.";
    
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 5) return `⏳ فقط ${toPersian(diffDays)} روز تا پایان اشتراک ویژه باقی مانده است.`;

    if (currentUser.activeChallengeId) {
        const challenge = CHALLENGES.find(c => c.id === currentUser.activeChallengeId);
        if (challenge) return `🏆 چالش «${challenge.title}» فعال است؛ پیشنهادات بر این اساس تنظیم شده‌اند.`;
    }

    const activeFilters = [];
    if (currentUser.meatlessMode) activeFilters.push("گیاهی");
    if (currentUser.onlyFavoritesMode) activeFilters.push("محبوب‌ها");
    if (currentUser.quickMealsMode) activeFilters.push("سریع");

    if (activeFilters.length > 0) {
        return `🔍 فیلتر فعال: ${activeFilters.join(' + ')} (در حال اعمال روی پیشنهادات)`;
    }

    return "";
  }, [planLoading, RecipeService.getLocalCount(), currentUser]);

  const persianDate = useMemo(() => {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date());
  }, []);

  const planRowsPerPage = 13;

  const chunkedPlan = useMemo(() => {
    if (displayPlan.length > 16) {
      // For monthly plans or any plan > 16 days, use the 16/remaining split as requested
      return [
        displayPlan.slice(0, 16),
        displayPlan.slice(16)
      ];
    }
    const chunks = [];
    for (let i = 0; i < displayPlan.length; i += planRowsPerPage) {
      chunks.push(displayPlan.slice(i, i + planRowsPerPage));
    }
    return chunks;
  }, [displayPlan]);

  const shoppingItemsToPrint = useMemo(() => {
    return currentUser?.customShoppingList?.filter(i => !i.checked) || [];
  }, [currentUser?.customShoppingList]);

  const activeShoppingCount = useMemo(() => {
    return currentUser?.customShoppingList?.filter(i => !i.checked).length || 0;
  }, [currentUser?.customShoppingList]);

  if (isInitializing || !currentUser) return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-950 text-white dir-rtl overflow-hidden">
      <Loader2 className="w-16 h-16 text-teal-500 animate-spin mb-4" />
      <p className="text-sm font-black tracking-widest animate-pulse">فراخوانی دستیار هوشمند نوش...</p>
    </div>
  );

  const isAdminPath = window.location.pathname.replace(/\/+$/, '') === '/admin';
  if (isAdminPath) return <AdminAccessGate onExit={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }} />;

  const navItems = [
    { id: 'pantry', label: 'آشپزخانه من', icon: ChefHat },
    { id: 'plan', label: 'برنامه غذایی', icon: CalendarDays },
    { id: 'search', label: 'جستجو', icon: Search },
    { id: 'challenges', label: 'چالش‌ها', icon: Trophy }
  ];

  const FilterIcon = filterNotif.icon;

  return (
    <div className="noosh-app h-[100dvh] w-full bg-[#f8fafc] text-right dir-rtl flex flex-col relative overflow-hidden">
      
      {filterNotif.show && (
        <div 
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[5000] w-[92%] max-w-md bg-white/95 backdrop-blur-md border border-slate-200/80 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-start gap-3.5 text-right dir-rtl pointer-events-auto transition-all duration-500 ease-out transform ${
            filterNotif.exiting 
              ? 'translate-y-32 opacity-0 scale-90' 
              : 'translate-y-0 opacity-100 scale-100'
          }`}
        >
          <div className={`p-2.5 rounded-xl text-white shadow-md shrink-0 bg-${filterNotif.color === 'purple' ? 'indigo' : filterNotif.color}-500`}>
             <FilterIcon size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
             <h3 className="text-sm font-black text-slate-900">تنظیمات هوشمند نوش</h3>
             <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-relaxed">{filterNotif.message}</p>
             
             <div className="flex items-center gap-4 mt-3 justify-between pt-2 border-t border-slate-100/80">
                <button 
                  onClick={() => setDontShowAgain(!dontShowAgain)}
                  className="flex items-center gap-1.5 group cursor-pointer transition-all"
                >
                   <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${dontShowAgain ? 'bg-slate-900 border-slate-900' : 'border-slate-300 group-hover:border-slate-400'}`}>
                      {dontShowAgain && <Check size={12} className="text-white" strokeWidth={4} />}
                   </div>
                   <span className="text-[10px] font-bold text-slate-500">دیگر نمایش نده</span>
                </button>

                <button 
                  onClick={closeNotif}
                  className="text-[10px] font-black text-rose-500 hover:text-rose-600 transition-colors"
                >
                  بستن سریع
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="print-only">
        {!isShoppingListOpen && chunkedPlan.map((chunk, pageIdx) => (
          <div key={`plan-page-${pageIdx}`} className="print-page-container">
             <div className="print-header flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src="https://i.ibb.co/gMDKtj4p/3.png" className="w-16 h-16 object-contain" alt="Logo" />
                  <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-slate-900">برنامه پیشنهادی نوش</h1>
                    <p className="text-teal-600 font-bold text-xs">همراه سلامتی و آسایش شما</p>
                  </div>
                </div>
                <div className="text-left font-bold text-slate-600 text-xs leading-6">
                  <div>تاریخ گزارش: {persianDate}</div>
                  <div>صفحه: {toPersian(pageIdx + 1)} از {toPersian(chunkedPlan.length)}</div>
                </div>
             </div>
             <table className="print-table">
                <thead>
                   <tr>
                      <th className="w-12 text-center">ردیف</th>
                      <th className="w-32">وعده / روز</th>
                      <th>نام پخت پیشنهادی</th>
                      <th className="w-32">نوع غذا</th>
                   </tr>
                </thead>
                <tbody>
                   {chunk.map((plan, idx) => {
                      const rowNumber = pageIdx === 0 ? idx + 1 : 16 + idx + 1;
                      return (
                        <tr key={idx}>
                           <td className="text-center font-mono">{toPersian(rowNumber)}</td>
                          <td className="font-bold">{plan.dayName}</td>
                          <td className="font-black text-slate-800">{plan.dish.name}</td>
                          <td className="text-slate-500">{CATEGORY_LABELS[plan.dish.category]}</td>
                       </tr>
                       );
                    })}
                </tbody>
             </table>
             <div className="print-footer">🌐 www.nooshapp.ir | اپلیکیشن تخصصی هوشمند برنامه‌ریزی غذایی نوش</div>
          </div>
        ))}

        {isShoppingListOpen && (
          <section className="print-page-container shopping-print-page">
            <header className="print-header shopping-print-header">
              <div className="shopping-print-brand">
                <img src="https://i.ibb.co/gMDKtj4p/3.png" alt="نشان نوش" />
                <div><h1>لیست خرید</h1><p>نوش · خریدهای لازم برای آشپزخانه</p></div>
              </div>
              <div className="shopping-print-date">{persianDate}<small>{toPersian(shoppingItemsToPrint.length)} قلم</small></div>
            </header>
            {shoppingItemsToPrint.length > 0 ? <div className="shopping-print-grid">
              {shoppingItemsToPrint.map((item, index) => (
                <article key={item.id} className="shopping-print-item">
                  <span className="shopping-print-number">{toPersian(index + 1)}</span>
                  <strong>{item.name}</strong>
                  <span className="shopping-print-quantity">{item.amount !== undefined && item.amount > 0 ? `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 6 }).format(item.amount)} ${item.unit || ''}` : '□'}</span>
                  {(item.fromRecipe || item.unresolved || item.estimated) && <small>{[item.fromRecipe, item.unresolved ? 'نیاز دستور؛ مقدار خرید نیازمند بررسی' : item.estimated ? 'تبدیل تقریبی' : ''].filter(Boolean).join(' · ')}</small>}
                </article>
              ))}
            </div> : <p className="shopping-print-empty">سبد خرید شما خالی است.</p>}
            <footer className="shopping-print-footer">لیست خرید هوشمند نوش · {persianDate}</footer>
          </section>
        )}
      </div>

      <header className="fixed top-0 left-0 right-0 z-[1000] no-print h-12 sm:h-14 lg:h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center px-4 sm:px-12 shadow-sm">
        <div className="flex items-center justify-between w-full">
          <div 
            onClick={() => setViewMode('pantry')} 
            className="flex flex-col items-center cursor-pointer logo-animate transition-all pt-1"
          >
            <img src="/brand/noosh-logo.png" alt="نشان نوش‌اپ" className="w-7 h-7 sm:w-12 sm:h-12 object-contain" />
            <span className="text-[6px] sm:text-[10px] font-black text-emerald-600 tracking-[0.2em] uppercase mt-0.5">{appVersion}</span>
          </div>

          <div className="hidden lg:flex flex-col items-center" style={{ direction: 'ltr' }}>
            <div className="flex items-baseline gap-1">
               <span className="text-lg sm:text-3xl font-black italic text-slate-900 leading-none">NOOSH</span>
               <span className="text-xs sm:text-xl font-black text-teal-600 leading-none">APP</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
            {navItems.map(nav => (
              <button key={nav.id} onClick={() => setViewMode(nav.id as ViewMode)} className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all ${viewMode === nav.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50'}`}>
                <nav.icon size={18} />
                <span className="text-sm font-black">{nav.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
             <button onClick={() => { setIsNotificationCenterOpen(true); setUnreadNotifCount(0); }} className="p-2 sm:p-3.5 bg-white border border-slate-100 text-indigo-600 rounded-xl sm:rounded-2xl shadow-sm relative">
                <Bell aria-label="اعلان‌ها" size={18} className="sm:w-6 sm:h-6" />
                {unreadNotifCount > 0 && (
                   <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-rose-600 text-white text-[8px] sm:text-[10px] font-black w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                      {toPersian(unreadNotifCount)}
                   </div>
                )}
             </button>
             <button onClick={() => setIsShoppingListOpen(true)} className="relative p-2 sm:p-3.5 bg-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-lg">
              <ShoppingCart aria-label="لیست خرید" size={18} className="sm:w-6 sm:h-6" />
              {activeShoppingCount > 0 && (
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-rose-600 text-white text-[8px] sm:text-[10px] font-black w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                  {toPersian(activeShoppingCount)}
                </div>
              )}
            </button>
            <button 
              onClick={() => isFullscreen ? exitFullscreen() : enterFullscreen()} 
              className="p-2 sm:p-3.5 bg-white border border-slate-100 text-slate-600 rounded-xl sm:rounded-2xl shadow-sm hover:bg-slate-50 transition-all"
              title={isFullscreen ? "خروج از تمام صفحه" : "تمام صفحه"}
             >
                {isFullscreen ? <Minimize size={18} className="sm:w-6 sm:h-6" /> : <Maximize size={18} className="sm:w-6 sm:h-6" />}
             </button>
          </div>
        </div>
      </header>

      <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => { setIsNotificationCenterOpen(false); checkUnreadNotifications(currentUser!); }} user={currentUser!} />

      <Suspense fallback={<div role="status" className="flex-1 flex items-center justify-center">در حال آماده‌سازی آشپزخانه…</div>}><main className="flex-grow pt-12 sm:pt-14 lg:pt-16 pb-12 sm:pb-16 no-print overflow-hidden [@media(orientation:landscape)_and_(max-height:500px)]:overflow-y-auto flex flex-col bg-[#f8fafc]">
        {viewMode === 'plan' && <PlanDashboard
          user={currentUser} plan={displayPlan} loading={planLoading} error={planError}
          canUndo={previousPlan !== null}
          onGenerate={handleGeneratePlan} onToggleFilter={handleToggleFilter}
          onRefresh={handleRefreshSingleMeal} onUpdateUser={setCurrentUser}
          onShopping={handleSyncPlanToShoppingList} shoppingLoading={isSyncingPlan}
          onNavigate={setViewMode} onSearch={term => { setGlobalSearchTerm(term); setViewMode('search'); }}
          onUndo={async () => {
            if (!previousPlan) return;
            const updated = await UserService.updateProfile(currentUser.username, { weeklyPlan: previousPlan, weeklyPlanMode: currentUser.kitchenMode || 'with-inventory' });
            setDisplayPlan(previousPlan); setCurrentUser(updated); setPreviousPlan(null);
          }}
        />}
        {viewMode === 'pantry' && <PantryChef user={currentUser!} onUpdateUser={setCurrentUser} onNavigate={setViewMode} onKitchenModeChange={handleKitchenModeChange} />}
        {viewMode === 'search' && <RecipeSearch user={currentUser!} onUpdateUser={setCurrentUser} externalSearchTerm={globalSearchTerm} />}
        {viewMode === 'challenges' && <Challenges user={currentUser!} onUpdateUser={setCurrentUser} onNotify={handleChallengeNotify} />}
        {viewMode === 'settings' && (
          <Preferences 
            user={currentUser!} 
            onUpdateUser={setCurrentUser} 
            onLogout={handleLogout} 
            onToggleFilter={handleToggleFilter}
          />
        )}
      </main></Suspense>

      <div className="fixed bottom-0 left-0 right-0 z-[1000] no-print h-12 sm:h-auto">
        <div className="md:hidden landscape:hidden bg-white/95 backdrop-blur-2xl border-t border-slate-100 flex items-center justify-around h-12 px-2 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)]">
           {navItems.map(nav => (
              <button key={nav.id} onClick={() => setViewMode(nav.id as ViewMode)} className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all ${viewMode === nav.id ? 'text-teal-600' : 'text-slate-400'}`}>
                 <div className={`p-1.5 rounded-lg transition-all ${viewMode === nav.id ? 'bg-teal-50' : ''}`}><nav.icon size={20} strokeWidth={viewMode === nav.id ? 2.5 : 2} /></div>
                 <span className="text-[9px] font-black">{nav.label}</span>
              </button>
           ))}
           <button onClick={() => setViewMode('settings')} className={`flex flex-col items-center justify-center gap-1 flex-1 ${viewMode === 'settings' ? 'text-slate-900' : 'text-slate-400'}`}>
              <div className={`p-1.5 rounded-lg ${viewMode === 'settings' ? 'bg-slate-100' : ''}`}><Settings size={20} strokeWidth={viewMode === 'settings' ? 2.5 : 2} /></div>
              <span className="text-[9px] font-black">تنظیمات</span>
           </button>
        </div>

        <div className="mobile-site-credit md:hidden landscape:hidden" dir="rtl">
          طراحی و توسعه توسط شرکت فنی‌مهندسی <strong>CYDEVIT</strong>
        </div>

        <footer className="hidden md:flex landscape:flex backdrop-blur-3xl bg-white/50 border border-white/60 rounded-[2.5rem] h-[60px] px-6 md:px-12 items-center justify-between shadow-2xl mx-4 md:mx-12 mb-2 md:mb-4">
            <button onClick={() => setViewMode('settings')} className={`flex items-center gap-3 px-4 md:px-8 py-2 rounded-[1.75rem] transition-all flex-shrink-0 ${viewMode === 'settings' ? 'bg-slate-900 text-white shadow-2xl' : 'bg-white/80 border border-slate-200 text-slate-700 hover:bg-white'}`}>
                <Settings size={24} />
                <span className="hidden sm:inline text-lg font-black">تنظیمات</span>
            </button>
            <div className="flex-grow flex flex-col items-center justify-center gap-0.5 text-slate-500">
               {footerMessage && <span className="flex items-center gap-2 md:gap-4 font-black"><Sparkles size={18} className="text-amber-400 md:w-5 md:h-5" /><span className="text-xs md:text-sm truncate">{footerMessage}</span></span>}
               <span className="site-credit-desktop">طراحی و توسعه توسط شرکت فنی‌مهندسی <strong>CYDEVIT</strong></span>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-500/10 text-teal-600 rounded-2xl flex items-center justify-center">
                 <ChefHat size={24} className="md:w-8 md:h-8" />
              </div>
            </div>
        </footer>
      </div>

      {isShoppingListOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 sm:p-8 bg-black/60 backdrop-blur-sm no-print" onClick={() => setIsShoppingListOpen(false)}>
           <div className="relative w-full max-w-2xl bg-white sm:rounded-[3rem] shadow-2xl overflow-hidden animate-enter h-[100dvh] sm:h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsShoppingListOpen(false)} aria-label="بستن لیست خرید" className="absolute top-8 left-8 p-3 bg-slate-100 rounded-full text-slate-500 z-[210] hover:bg-slate-200 transition-all shadow-sm"><X size={24} /></button>
              <div className="flex-grow overflow-y-auto">
                <ShoppingList 
                  user={currentUser!} 
                  weeklyPlan={displayPlan} 
                  onUpdateUser={setCurrentUser} 
                  onPrintInternal={() => window.print()}
                />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => <AuthGate><AppContent /></AuthGate>;
export default App;
