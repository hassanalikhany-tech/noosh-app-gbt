
import { X, ChefHat, Clock, Activity, Flame, PlusCircle, Check, Sun, Snowflake, Scale, ShieldCheck, Utensils, AlertCircle, Users, Minus, Plus, Play, Pause, RotateCcw, Trophy, AlarmClock, CheckCircle2, ArrowRight } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Dish, ShoppingItem, UserProfile } from '../types';
import DishVisual from './DishVisual';
import { UserService } from '../services/userService';
import { estimateCalories, estimateCookTime, getDifficulty, getDishNature, getShoppingShortages, parseQuantity, normalizeUnit, getCountryCodes, formatQuantityForDisplay } from '../utils/recipeHelpers';
import { getRelevantInventory } from '../utils/kitchenMode';
import { CookingDraft, prepareCooking } from '../utils/inventoryLedger';
import { mergeShoppingNeeds } from '../utils/shoppingQuantities';

interface RecipeModalProps {
  dish: Dish;
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser?: (user: UserProfile) => void;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ dish, isOpen, onClose, user, onUpdateUser }) => {
  const [addedToCart, setAddedToCart] = useState(false);
  const [cooked, setCooked] = useState(false);
  const [cookingBusy, setCookingBusy] = useState(false);
  const [cookingMessage, setCookingMessage] = useState('');
  const [servings, setServings] = useState(user?.familySize || 4);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [isTimerOverlayOpen, setIsTimerOverlayOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInput, setTimerInput] = useState(10); // Default 10 mins
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const closeModalRef = useRef(onClose);
  closeModalRef.current = onClose;

  const hasRecipe = dish.recipeSteps && dish.recipeSteps.length > 0;
  const hasIngredients = dish.ingredients && dish.ingredients.length > 0;
  
  const calories = dish.calories || estimateCalories(dish);
  const time = dish.cookTime || estimateCookTime(dish);
  const difficulty = dish.difficulty || getDifficulty(dish);
  const natureInfo = getDishNature(dish);

  useEffect(() => {
    if (isOpen) {
      setAddedToCart(false);
      setCooked(false);
      setCookingBusy(false);
      setCookingMessage('');
      setServings(user?.familySize || 4);
      setCheckedSteps([]);
      setTimerSeconds(0);
      setIsTimerRunning(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { 
      document.body.style.overflow = 'unset'; 
    };
  }, [isOpen, user?.familySize, dish.id]);

  // Keep the phone's browser/system Back action inside the app while a recipe is open.
  useEffect(() => {
    if (!isOpen) return;
    const state = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
    window.history.pushState({ ...state, nooshRecipeModal: true }, '', window.location.href);
    const handleBack = () => closeModalRef.current();
    window.addEventListener('popstate', handleBack);
    return () => {
      window.removeEventListener('popstate', handleBack);
      if (window.history.state?.nooshRecipeModal) window.history.back();
    };
  }, [isOpen, dish.id]);

  // Keyboard listener for spacebar
  useEffect(() => {
    if (!isOpen || !hasRecipe) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, button, [contenteditable]')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        // Find first unchecked step
        const nextStepIdx = dish.recipeSteps!.findIndex((_, idx) => !checkedSteps.includes(idx));
        if (nextStepIdx !== -1) {
          toggleStep(nextStepIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, checkedSteps, dish.recipeSteps, onClose]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsAlarmPlaying(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTimerRunning]);

  // Alarm logic
  useEffect(() => {
    if (isAlarmPlaying) {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(e => console.log("Audio play failed", e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isAlarmPlaying]);

  const stopAlarm = () => {
    setIsAlarmPlaying(false);
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const startTimer = () => {
    if (timerSeconds === 0) {
      setTimerSeconds(timerInput * 60);
    }
    setIsTimerRunning(true);
  };

  const pauseTimer = () => setIsTimerRunning(false);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${toPersianDigits(mins)}:${secs < 10 ? '۰' : ''}${toPersianDigits(secs)}`;
  };

  const toPersianDigits = (num: number | string) => {
    if (num === undefined || num === null) return '';
    const val = typeof num === 'number' ? Number(num.toFixed(6)) : num;
    return val.toString().replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'['0123456789'.indexOf(d)]);
  };

  const getScaledAmount = (baseAmount: number | undefined) => {
    const parsed = parseQuantity(baseAmount);
    if (!Number.isFinite(parsed)) return 0;
    const baseServings = dish.servings || 4;
    return (parsed / baseServings) * servings;
  };

  const handleAddAllToCart = () => {
    if (!user || !dish.ingredients) return;
    setAddedToCart(true);
    const shoppingNeeds = getShoppingShortages(getRelevantInventory(user), dish.ingredients, servings, dish.servings || 4);
    const currentList = mergeShoppingNeeds(user.customShoppingList || [], shoppingNeeds, `رسپی:${dish.id}`, `${dish.name} (${servings} نفر)`);
    if (onUpdateUser) onUpdateUser({ ...user, customShoppingList: currentList });
    UserService.updateShoppingList(user.username, currentList);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleCookDish = async () => {
    if (!user || !dish.ingredients) return;
    if (user.kitchenMode === 'without-inventory') { setCooked(true); return; }
    if (cookingBusy) return;
    setCookingBusy(true);
    setCookingMessage('');
    try {
      const draft: CookingDraft = prepareCooking(user.inventory || [], dish, servings);
      const updatedUser = await UserService.commitCooking(draft);
      onUpdateUser?.(updatedUser);
      setCooked(true);
      const estimated = draft.rows.filter(row => row.enabled && row.estimated).length;
      const skipped = draft.notices.length;
      const parts = ['مصرف این پخت خودکار از انبار ثبت شد.'];
      if (estimated) parts.push(`${estimated.toLocaleString('fa-IR')} مقدار با میانگین تقریبی محاسبه شد.`);
      if (skipped) parts.push(`برای ${Math.min(skipped, 3).toLocaleString('fa-IR')} قلم، مقدار یا موجودی قابل‌محاسبه نبود؛ در سابقه ثبت شد و چیزی از قلم دیگری کم نشد.`);
      setCookingMessage(parts.join(' '));
    } catch (error) {
      setCookingMessage(error instanceof Error ? error.message : 'ثبت مصرف انبار انجام نشد.');
    } finally {
      setCookingBusy(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center [@media(orientation:landscape)_and_(max-height:500px)]:items-start p-0 [@media(orientation:landscape)_and_(max-height:500px)]:p-4 bg-black/80 backdrop-blur-md overflow-hidden [@media(orientation:landscape)_and_(max-height:500px)]:overflow-y-auto" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`دستور پخت ${dish.name}`} className="recipe-modal-dialog relative w-full h-[100dvh] sm:w-[95vw] sm:h-[95vh] [@media(orientation:landscape)_and_(max-height:500px)]:h-auto rounded-none sm:rounded-[3rem] bg-white flex flex-col animate-enter shadow-2xl overflow-hidden [@media(orientation:landscape)_and_(max-height:500px)]:overflow-visible" onClick={e => e.stopPropagation()}>
        
        {/* Glassmorphism Header */}
        <div className="recipe-modal-header sticky top-0 [@media(orientation:landscape)_and_(max-height:500px)]:relative z-[100] bg-white/90 backdrop-blur-2xl border-b border-white/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-8 [@media(orientation:landscape)_and_(max-height:500px)]:p-4 shadow-xl flex-shrink-0">
          <div className="mb-2 flex items-center justify-between pt-8 sm:pt-0 [@media(orientation:landscape)_and_(max-height:500px)]:mb-1">
            <button
              type="button"
              aria-label="بازگشت به صفحهٔ قبل"
              onClick={onClose}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#276556] px-4 py-2 text-sm font-black text-white shadow-md shadow-emerald-950/15 transition hover:bg-[#347866] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 active:scale-95"
            >
              <ArrowRight size={18} aria-hidden="true" />
              <span>بازگشت</span>
            </button>
            <span className="text-xs font-bold text-slate-500">دستور پخت</span>
          </div>

          {/* Row 1: Dish Name */}
          <div className="recipe-modal-title-row text-center mb-8 pt-2 [@media(orientation:landscape)_and_(max-height:500px)]:mb-2 [@media(orientation:landscape)_and_(max-height:500px)]:pt-0 flex flex-col items-center gap-2">
            {getCountryCodes(dish.nationality).length > 0 && (
              <div className="flex w-12 h-8 rounded-lg overflow-hidden shadow-lg border-2 border-white/50 mb-2" aria-label={`پرچم ${dish.nationality}`}>
                {getCountryCodes(dish.nationality).map(code => (
                  <img
                    key={code}
                    src={`https://flagcdn.com/w160/${code}.png`}
                    alt={code}
                    className="h-full min-w-0 flex-1 object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={event => { event.currentTarget.style.display = 'none'; }}
                  />
                ))}
              </div>
            )}
            <h2 className="text-3xl sm:text-5xl [@media(orientation:landscape)_and_(max-height:500px)]:text-2xl font-black text-slate-900 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] tracking-tight leading-tight">
              {dish.name}
            </h2>
          </div>

          {/* Row 2: Info & Timer */}
          <div className="recipe-modal-meta-row flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 [@media(orientation:landscape)_and_(max-height:500px)]:mb-2 [@media(orientation:landscape)_and_(max-height:500px)]:gap-2 [@media(orientation:landscape)_and_(max-height:500px)]:flex-row [@media(orientation:landscape)_and_(max-height:500px)]:flex-wrap">
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3 order-2 sm:order-1 [@media(orientation:landscape)_and_(max-height:500px)]:order-1">
              <div className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-orange-200/50">
                <Clock size={16} /> 
                <span>{toPersianDigits(time)} دقیقه</span>
              </div>
              <div className="flex items-center gap-1.5 bg-rose-500 text-white px-4 py-2 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-rose-200/50">
                <Flame size={16} /> 
                <span>~{toPersianDigits(calories)} کالری</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-blue-200/50">
                <Activity size={16} /> 
                <span>{difficulty}</span>
              </div>
            </div>

            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsTimerOverlayOpen(true);
              }}
              className={`flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm sm:text-base font-black hover:bg-teal-600 transition-all shadow-xl active:scale-95 order-1 sm:order-2 [@media(orientation:landscape)_and_(max-height:500px)]:order-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-2 [@media(orientation:landscape)_and_(max-height:500px)]:px-4 ${isTimerRunning ? 'animate-pulse ring-4 ring-amber-400/50' : ''}`}
            >
              <AlarmClock size={20} strokeWidth={3} className={isTimerRunning ? 'text-amber-400' : ''} />
              <span>تایمر آشپزی</span>
            </button>
          </div>

          {/* Row 3: Nature & Servings */}
          <div className="recipe-modal-serving-row flex flex-col sm:flex-row items-center justify-between gap-4 [@media(orientation:landscape)_and_(max-height:500px)]:flex-row [@media(orientation:landscape)_and_(max-height:500px)]:gap-2">
            <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 shadow-sm order-2 sm:order-1 [@media(orientation:landscape)_and_(max-height:500px)]:order-1 [@media(orientation:landscape)_and_(max-height:500px)]:py-1.5 [@media(orientation:landscape)_and_(max-height:500px)]:px-3 ${natureInfo.type === 'hot' ? 'bg-orange-50 border-orange-200 text-orange-700' : natureInfo.type === 'cold' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
               {natureInfo.type === 'hot' ? <Sun size={20} /> : natureInfo.type === 'cold' ? <Snowflake size={20} /> : <Scale size={20} />}
               <span className="font-black text-sm [@media(orientation:landscape)_and_(max-height:500px)]:text-xs">طبع {natureInfo.label} (مصلح: {natureInfo.mosleh})</span>
            </div>

            <div className="flex items-center gap-4 bg-white/80 px-4 py-2 rounded-2xl shadow-inner border border-slate-100 order-1 sm:order-2 [@media(orientation:landscape)_and_(max-height:500px)]:order-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1 [@media(orientation:landscape)_and_(max-height:500px)]:px-3">
                <span className="text-xs font-black text-slate-400 ml-2">تعداد نفرات:</span>
                <div className="flex items-center gap-3">
                    <button aria-label="کاهش تعداد نفرات" onClick={() => setServings(Math.max(1, servings - 1))} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-all"><Minus size={18} /></button>
                    <span className="text-xl font-black text-slate-900 min-w-[30px] text-center [@media(orientation:landscape)_and_(max-height:500px)]:text-lg">{toPersianDigits(servings)}</span>
                    <button aria-label="افزایش تعداد نفرات" onClick={() => setServings(Math.min(20, servings + 1))} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-all"><Plus size={18} /></button>
                </div>
            </div>
          </div>
        </div>
        
        <div className="recipe-modal-content flex-grow overflow-y-auto p-6 sm:p-10 no-scrollbar [@media(orientation:landscape)_and_(max-height:500px)]:overflow-visible [@media(orientation:landscape)_and_(max-height:500px)]:p-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              
              {/* Left Column: Image (4x4 inch square) */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start gap-6 [@media(orientation:landscape)_and_(max-height:500px)]:gap-2">
                <div className="recipe-modal-photo w-full max-w-[4in] [@media(orientation:landscape)_and_(max-height:500px)]:max-w-[180px] aspect-square rounded-[2.5rem] [@media(orientation:landscape)_and_(max-height:500px)]:rounded-3xl overflow-hidden shadow-2xl border-6 border-white ring-1 ring-slate-200 relative group">
                  <DishVisual category={dish.category} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" iconSize={100} imageUrl={dish.imageUrl} dishId={dish.id} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>

              {/* Right Column: Ingredients */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-3 text-slate-900 font-black text-2xl border-r-4 border-teal-500 pr-4">
                  <Utensils size={28} className="text-teal-600" />
                  <h3>مواد لازم</h3>
                </div>
                {user?.kitchenMode !== 'without-inventory' && (
                  <p className="-mt-3 rounded-xl bg-teal-50 px-4 py-3 text-xs font-medium leading-6 text-teal-800">
                    واحدهای خرید و نمایش بر پایهٔ گرم/کیلوگرم و میلی‌لیتر/لیتر هستند؛ پیمانهٔ استاندارد نوش اپ ۲۵۰ میلی‌لیتر است. واحدهای انگلیسیِ رسپی‌های بین‌المللی در نمایش به مقیاس‌های متریک تبدیل می‌شوند. اگر تبدیل یک ماده مرجع مطمئنی نداشته باشد، موجودی برای جلوگیری از کسر اشتباه دست‌نخورده می‌ماند.
                  </p>
                )}
                
                {hasIngredients ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dish.ingredients.map((ing, idx) => {
                      const scaled = getScaledAmount(ing.amount);
                      const localQuantity = scaled > 0 && normalizeUnit(ing.unit) !== 'به میزان لازم' ? formatQuantityForDisplay(scaled, ing.unit, ing.item) : null;
                      return (
                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-white transition-all group shadow-sm">
                          <span className="font-bold text-slate-700">{ing.item}</span>
                          <span className="font-black text-teal-600 text-sm bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-all">
                            {localQuantity ? `${toPersianDigits(localQuantity.amount)} ${localQuantity.unit}` : formatQuantityForDisplay(0, ing.unit, ing.item).unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 font-bold italic">لیست مواد لازم ثبت نشده است.</p>
                )}

                {user && hasIngredients && (
                  <div className="flex flex-col gap-3 mt-4">
                    <button 
                      disabled={cooked || cookingBusy}
                      onClick={handleCookDish} 
                      className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${cooked ? 'bg-teal-500 text-white scale-95' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                    >
                      {cooked ? <CheckCircle2 size={24} /> : <ChefHat size={24} />}
                      {cookingBusy ? 'در حال ثبت پخت…' : cooked ? (user.kitchenMode === 'without-inventory' ? 'نوش جان!' : 'پخت و کسر خودکار ثبت شد') : (user.kitchenMode === 'without-inventory' ? 'این غذا را پختم (بدون تغییر انبار)' : 'پختم؛ کسر خودکار از انبار')}
                    </button>
                    {cookingMessage && <p role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold leading-6 text-emerald-900">{cookingMessage}</p>}
                    
                    {cooked && <button type="button" onClick={() => { setCooked(false); setCookingMessage(''); void handleCookDish(); }} className="py-2 text-xs font-bold text-emerald-800">ثبت پخت دیگری از همین غذا</button>}
                    <button 
                      onClick={handleAddAllToCart} 
                      className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${addedToCart ? 'bg-emerald-500 text-white scale-95' : 'bg-slate-900 text-white hover:bg-teal-600'}`}
                    >
                      {addedToCart ? <Check size={24} /> : <PlusCircle size={24} />}
                      {addedToCart ? 'در سبد خرید ذخیره شد' : (user.kitchenMode === 'without-inventory' ? 'افزودن مواد کامل دستور به خرید' : 'افزودن کسری مواد به خرید')}
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Section: Recipe Steps */}
              <div className="lg:col-span-12 mt-8 pt-8 border-t border-slate-100">
                {hasRecipe ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-slate-900 font-black text-2xl border-r-4 border-orange-500 pr-4">
                         <ChefHat size={28} className="text-orange-600" />
                         <h3>دستور پخت (مراحل گام‌به‌گام)</h3>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">Space</span>
                        <span>برای تیک زدن مرحله بعد</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dish.recipeSteps.map((step, idx) => {
                        const isChecked = checkedSteps.includes(idx);
                        return (
                          <div 
                            key={idx} 
                            onClick={() => toggleStep(idx)}
                            className={`flex gap-4 p-5 rounded-[2rem] cursor-pointer transition-all duration-500 border-2 ${isChecked ? 'bg-emerald-50 border-emerald-200 opacity-60 scale-[0.98]' : 'bg-white border-slate-100 hover:border-orange-200 hover:shadow-lg'}`}
                          >
                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${isChecked ? 'bg-emerald-500 text-white' : 'bg-orange-100 text-orange-700'}`}>
                              {isChecked ? <Check size={20} strokeWidth={3} /> : <span className="text-lg font-black">{toPersianDigits(idx + 1)}</span>}
                            </div>
                            <div className="flex-grow">
                              <p className={`text-base leading-relaxed font-bold transition-all duration-500 ${isChecked ? 'text-emerald-800 line-through decoration-2' : 'text-slate-700'}`}>
                                {step}
                              </p>
                            </div>
                            <div className={`flex-shrink-0 self-center transition-all duration-500 ${isChecked ? 'text-emerald-500' : 'text-slate-200'}`}>
                              {isChecked ? <CheckCircle2 size={24} /> : <div className="w-6 h-6 rounded-full border-2 border-current" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {checkedSteps.length === dish.recipeSteps.length && (
                      <div className="bg-emerald-500 p-8 rounded-[3rem] text-center space-y-4 animate-bounce mt-8 shadow-2xl">
                        <div className="w-16 h-16 bg-white text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                          <Trophy size={32} />
                        </div>
                        <h4 className="text-2xl font-black text-white">نوش جان!</h4>
                        <p className="text-white/90 font-bold">تمام مراحل پخت با موفقیت انجام شد.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                    <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-400">دستور پخت ثبت نشده است</h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isTimerOverlayOpen && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-white/10 backdrop-blur-xl landscape:overflow-y-auto"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <div 
            className="w-full max-w-md bg-slate-900/90 text-white p-8 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col gap-6 transform transition-all animate-slide-down landscape:h-auto landscape:my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-500 rounded-2xl shadow-lg">
                  <AlarmClock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black">تایمر</h3>
                </div>
              </div>
              <button 
                onClick={() => setIsTimerOverlayOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col items-center py-4">
              <span className="text-6xl font-mono font-black tabular-nums tracking-tighter">
                {timerSeconds > 0 ? formatTime(timerSeconds) : `${toPersianDigits(timerInput)}:۰۰`}
              </span>
              <div className="flex items-center gap-8 mt-6">
                <button 
                  onClick={() => setTimerInput(prev => Math.min(120, prev + 1))}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                >
                  <Plus size={24} />
                </button>
                <div className="text-center">
                  <span className="text-sm font-black text-slate-400">زمان تنظیمی</span>
                  <div className="text-xl font-black">{toPersianDigits(timerInput)} دقیقه</div>
                </div>
                <button 
                  onClick={() => setTimerInput(prev => Math.max(1, prev - 1))}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                >
                  <Minus size={24} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {isAlarmPlaying ? (
                <button 
                  onClick={stopAlarm}
                  className="col-span-2 py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[1.75rem] font-black text-lg shadow-xl animate-pulse transition-all active:scale-95"
                >
                  قطع صدای زنگ
                </button>
              ) : (
                <>
                  {!isTimerRunning ? (
                    <button 
                      onClick={startTimer}
                      className="py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.75rem] font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                      <Play size={24} fill="currentColor" />
                      شروع
                    </button>
                  ) : (
                    <button 
                      onClick={pauseTimer}
                      className="py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-[1.75rem] font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                      <Pause size={24} fill="currentColor" />
                      توقف
                    </button>
                  )}
                  <button 
                    onClick={resetTimer}
                    className="py-5 bg-slate-700 hover:bg-slate-600 text-white rounded-[1.75rem] font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    <RotateCcw size={24} />
                    ریست
                  </button>
                </>
              )}
            </div>

            <button 
              onClick={() => setIsTimerOverlayOpen(false)}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all border border-white/5"
            >
              بستن پنجره تایمر
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default RecipeModal;
