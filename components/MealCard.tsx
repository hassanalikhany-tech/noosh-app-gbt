
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Utensils, ChevronLeft, Flame, Clock, Leaf, Heart, ThumbsDown, Lock, RefreshCw, Star, ShoppingBag, Loader2 } from 'lucide-react';
import { DayPlan, UserProfile } from '../types';
const RecipeModal = lazy(() => import('./RecipeModal'));
import DishVisual from './DishVisual';
import { estimateCalories, estimateCookTime, getDishNature, getShoppingShortages, isDishProhibited } from '../utils/recipeHelpers';
import { getRelevantInventory } from '../utils/kitchenMode';
import { mergeShoppingNeeds } from '../utils/shoppingQuantities';
import { UserService } from '../services/userService';
import { RecipeService } from '../services/recipeService';
import { showCreatorRecipes } from '../utils/recipeCreators';
import { formatCommunityAttribution } from '../utils/communityAttribution';

interface MealCardProps {
  plan: DayPlan;
  user: UserProfile;
  onUpdateUser?: (user: UserProfile) => void;
  onRefresh?: () => void | Promise<void>;
  onOpenInventory?: () => void;
  missingItems?: string[];
}

const MealCard: React.FC<MealCardProps> = ({ plan, user, onUpdateUser, onRefresh, onOpenInventory, missingItems }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingToShopping, setIsAddingToShopping] = useState(false);
  const [shoppingMessage, setShoppingMessage] = useState('');
  const [shoppingError, setShoppingError] = useState('');
  const dish = user.personalRecipeEdits?.[plan.dish.id]
    ? { ...plan.dish, ...user.personalRecipeEdits[plan.dish.id], isLocallyEdited: true }
    : plan.dish;
  
  const [localFavorite, setLocalFavorite] = useState(user?.favoriteDishIds?.includes(dish.id));
  const [localBlacklisted, setLocalBlacklisted] = useState(user?.blacklistedDishIds?.includes(dish.id));
  
  useEffect(() => {
    setLocalFavorite(user?.favoriteDishIds?.includes(dish.id));
    setLocalBlacklisted(user?.blacklistedDishIds?.includes(dish.id));
  }, [user?.favoriteDishIds, user?.blacklistedDishIds, dish.id]);

  const isAccessible = RecipeService.isDishAccessible(dish.id, user);
  const isLocked = !isAccessible;

  const calories = dish.calories || estimateCalories(dish);
  const time = dish.cookTime || estimateCookTime(dish);
  const natureInfo = getDishNature(dish);
  const personalRating = user?.recipeReviews?.[dish.id]?.rating || 0;
  
  const toPersianDigits = (num: number) => num.toString().replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'['0123456789'.indexOf(d)]);

  const handleAddShortages = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isLocked || isAddingToShopping) return;
    setIsAddingToShopping(true);
    setShoppingMessage('');
    setShoppingError('');
    try {
      const latestUser = await UserService.getCurrentUser();
      const servings = latestUser.familySize || 4;
      const latestDish = { ...dish, ...latestUser.personalRecipeEdits?.[dish.id] };
      const needs = getShoppingShortages(getRelevantInventory(latestUser), latestDish.ingredients, servings, latestDish.servings || 4);
      const items = mergeShoppingNeeds(latestUser.customShoppingList || [], needs, `رسپی:${dish.id}`, `${latestDish.name} (${servings} نفر)`);
      const updatedUser = await UserService.updateShoppingList(latestUser.username, items);
      onUpdateUser?.(updatedUser);
      setShoppingMessage(needs.length > 0 ? 'موادِ کسری به فهرست خرید اضافه شد.' : 'همهٔ مواد در انبار موجود است؛ خریدی لازم نیست.');
    } catch {
      setShoppingError('ذخیره در فهرست خرید انجام نشد؛ دوباره تلاش کن.');
    } finally {
      setIsAddingToShopping(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    const nextFavorite = !localFavorite;
    setLocalFavorite(nextFavorite);
    if (nextFavorite) setLocalBlacklisted(false);
    try {
      const updatedUser = await UserService.toggleFavorite(user.username, dish.id);
      if (onUpdateUser) onUpdateUser(updatedUser);
    } catch (err) {
      setLocalFavorite(!nextFavorite);
    }
  };

  const handleToggleBlacklist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    const nextBlacklisted = !localBlacklisted;
    setLocalBlacklisted(nextBlacklisted);
    if (nextBlacklisted) setLocalFavorite(false);
    try {
      const updatedUser = await UserService.toggleBlacklist(user.username, dish.id);
      if (onUpdateUser) onUpdateUser(updatedUser);
    } catch (err) {
      setLocalBlacklisted(!nextBlacklisted);
    }
  };

  const handleRefreshClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isRefreshing || !onRefresh) return;
      setIsRefreshing(true);
      try { await onRefresh(); } finally { setIsRefreshing(false); }
  };

  const handleCardClick = () => {
    if (isLocked) {
      alert("مشترک گرامی، دسترسی به این غذا نیازمند تایید حساب توسط مدیریت می‌باشد.");
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <div 
        className={`meal-card group bg-white rounded-3xl shadow-sm hover:shadow-xl hover:scale-[1.02] hover:z-[60] transition-all duration-500 overflow-hidden border border-slate-100 flex flex-col h-full cursor-pointer relative ${localBlacklisted ? 'opacity-75 grayscale-[0.3]' : ''} ${isLocked ? 'grayscale opacity-60' : ''}`}
        onClick={handleCardClick}
        onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleCardClick(); } }}
        tabIndex={0} role="group" aria-label={`دستور پخت ${dish.name}`}
      >
        <div className="meal-image relative h-60 overflow-hidden">
          <DishVisual category={dish.category} className={`w-full h-full transition-all duration-1000 ease-out ${isLocked ? '' : 'group-hover:scale-110 group-hover:brightness-110'}`} iconSize={48} imageUrl={dish.imageUrl} dishId={dish.id} />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          {isLocked && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-20">
               <div className="bg-white/95 p-2 rounded-xl shadow-lg flex flex-col items-center gap-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <Lock size={14} className="text-rose-600" />
                  <span className="text-[7px] font-black text-slate-800">تایید مدیریت</span>
               </div>
            </div>
          )}

          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-bold text-slate-900 shadow-md z-10 border border-white/20">{plan.dayName}</div>
          
          {!isLocked && onRefresh && (
              <button 
                onClick={handleRefreshClick}
                className={`absolute top-2 left-2 z-20 w-7 h-7 bg-emerald-600/90 hover:bg-emerald-600 backdrop-blur-md text-white rounded-lg shadow-md transition-all active:scale-90 flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}
                title="تعویض این غذا"
              >
                  <RefreshCw size={12} strokeWidth={3} />
              </button>
          )}

          {!isLocked && (
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end z-10 opacity-100 transition-all duration-500">
               <div className="flex gap-1">
                  <button aria-label="علاقه‌مندی" aria-pressed={!!localFavorite} onClick={handleToggleFavorite} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-lg ring-1 ring-white active:scale-90 ${localFavorite ? 'bg-rose-500 text-white' : 'bg-white/90 backdrop-blur-md text-slate-500 hover:text-rose-500'}`}>
                    <Heart size={14} fill={localFavorite ? "currentColor" : "none"} />
                  </button>
                  <button aria-label="پیشنهاد نده" aria-pressed={!!localBlacklisted} onClick={handleToggleBlacklist} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-lg ring-1 ring-white active:scale-90 ${localBlacklisted ? 'bg-slate-900 text-white' : 'bg-white/90 backdrop-blur-md text-slate-500 hover:text-black'}`}>
                    <ThumbsDown size={14} fill={localBlacklisted ? "currentColor" : "none"} />
                  </button>
               </div>
               
               <div className={`px-1.5 py-0.5 rounded-md text-[6px] font-black shadow-md border ${
                 natureInfo.type === 'hot' ? 'bg-orange-500 text-white border-orange-400' : 
                 natureInfo.type === 'cold' ? 'bg-blue-500 text-white border-blue-400' : 'bg-emerald-500 text-white border-emerald-400'
               }`}>طبع {natureInfo.label}</div>
            </div>
          )}
        </div>
        
        <div className="p-3 flex flex-col flex-grow text-right bg-white relative">
          {isDishProhibited(dish, user) && <p role="note" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold leading-6 text-amber-900">حاوی مواد ممنوع یا نامطلوب ثبت‌شده در تنظیمات شما؛ مناسب پیشنهاد و برنامهٔ غذایی شما نیست.</p>}
          <h3 className={`text-base font-bold transition-all duration-500 mb-1.5 ${isLocked ? 'text-slate-300' : 'text-slate-800 group-hover:text-teal-600'}`}>{dish.name}</h3>
          {missingItems && missingItems.length > 0 && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950" dir="rtl">
              <p className="mb-2 text-xs font-bold">موادِ کسری</p>
              <ul aria-label="موادِ کسری این غذا" className="flex flex-wrap gap-1.5 text-xs leading-5">
                {[...new Set(missingItems)].map(item => (
                  <li key={item} className="max-w-full break-words rounded-lg border border-amber-200 bg-white px-2 py-1">{item}</li>
                ))}
              </ul>
              {!isLocked && <button type="button" onClick={handleAddShortages} disabled={isAddingToShopping} aria-label={`افزودن مواد کسری ${dish.name} به فهرست خرید`} className="noosh-cta-3d mt-3 mb-1 inline-flex min-h-11 w-full items-center justify-center gap-2 px-3 py-2 text-xs leading-6">
                {isAddingToShopping ? <Loader2 size={16} className="shrink-0 animate-spin" aria-hidden="true" /> : <ShoppingBag size={16} className="shrink-0" aria-hidden="true" />}
                <span>{isAddingToShopping ? 'در حال افزودن…' : 'افزودن به فهرست خرید'}</span>
              </button>}
              {shoppingMessage && <p role="status" className="mt-2 text-xs font-bold leading-6 text-[#276556]">{shoppingMessage}</p>}
              {shoppingError && <p role="alert" className="mt-2 text-xs font-bold leading-6 text-rose-700">{shoppingError}</p>}
            </div>
          )}
          {dish.isLocallyEdited && <span className="mb-2 inline-flex w-fit rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-[#276556]">نسخهٔ شخصی شما</span>}
          {personalRating > 0 && <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800" aria-label={`امتیاز شخصی شما ${toPersianDigits(personalRating)} از ۵`} title="امتیاز شخصی شما"><span>امتیاز شما</span><span className="inline-flex items-center gap-0.5"><Star size={12} className="fill-amber-400 text-amber-500" />{toPersianDigits(personalRating)} از ۵</span></div>}
          {dish.isCommunityRecipe && dish.creatorName && <p className="-mt-1 mb-2 text-[10px] leading-5 font-bold text-[#276556]">{formatCommunityAttribution(dish)} <button type="button" onClick={event => { event.stopPropagation(); showCreatorRecipes(dish.creatorName!); }} className="mt-1 inline-flex min-h-9 items-center rounded-lg bg-[#edf4f0] px-2 text-xs font-black text-[#276556] hover:bg-[#dcebe3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#276556]" aria-label={`دیدن همهٔ رسپی‌های ${dish.creatorName}`}>همهٔ رسپی‌های {dish.creatorName} ←</button></p>}
          
          <div className="flex gap-1.5 mb-2">
             <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md text-xs font-medium border border-rose-100/50"><Flame size={8} /> {toPersianDigits(calories)} کالری</div>
             <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md text-xs font-medium border border-orange-100/50"><Clock size={8} /> {toPersianDigits(time)} دقیقه</div>
          </div>

          <div className="relative flex-grow overflow-hidden mb-3">
             <p className={`text-slate-500 text-sm leading-relaxed font-bold line-clamp-2 group-hover:text-slate-700`}>
               {dish.description}
             </p>
          </div>
          
          <div className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm transition-all duration-500 ${isLocked ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white group-hover:bg-teal-600 shadow-sm'}`}>
             {isLocked ? <Lock size={10} /> : <Utensils size={10} />} 
             <span>مشاهده دستور</span> 
          </div>
        </div>
      </div>

      {isModalOpen && <Suspense fallback={<div role="status" className="fixed inset-0 z-[3000] bg-white/90 flex items-center justify-center">در حال باز کردن دستور پخت…</div>}><RecipeModal dish={dish} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} onUpdateUser={onUpdateUser} onOpenInventory={onOpenInventory} /></Suspense>}
    </>
  );
};

export default MealCard;
