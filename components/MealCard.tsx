
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Utensils, ChevronLeft, Flame, Clock, Leaf, Heart, ThumbsDown, Lock, RefreshCw } from 'lucide-react';
import { DayPlan, UserProfile } from '../types';
const RecipeModal = lazy(() => import('./RecipeModal'));
import DishVisual from './DishVisual';
import { estimateCalories, estimateCookTime, getDishNature } from '../utils/recipeHelpers';
import { UserService } from '../services/userService';
import { RecipeService } from '../services/recipeService';

interface MealCardProps {
  plan: DayPlan;
  user: UserProfile;
  onUpdateUser?: (user: UserProfile) => void;
  onRefresh?: () => void | Promise<void>;
}

const MealCard: React.FC<MealCardProps> = ({ plan, user, onUpdateUser, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [localFavorite, setLocalFavorite] = useState(user?.favoriteDishIds?.includes(plan.dish.id));
  const [localBlacklisted, setLocalBlacklisted] = useState(user?.blacklistedDishIds?.includes(plan.dish.id));
  
  useEffect(() => {
    setLocalFavorite(user?.favoriteDishIds?.includes(plan.dish.id));
    setLocalBlacklisted(user?.blacklistedDishIds?.includes(plan.dish.id));
  }, [user?.favoriteDishIds, user?.blacklistedDishIds, plan.dish.id]);

  const isAccessible = RecipeService.isDishAccessible(plan.dish.id, user);
  const isLocked = !isAccessible;

  const calories = plan.dish.calories || estimateCalories(plan.dish);
  const time = plan.dish.cookTime || estimateCookTime(plan.dish);
  const natureInfo = getDishNature(plan.dish);
  
  const toPersianDigits = (num: number) => num.toString().replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'['0123456789'.indexOf(d)]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    const nextFavorite = !localFavorite;
    setLocalFavorite(nextFavorite);
    if (nextFavorite) setLocalBlacklisted(false);
    try {
      const updatedUser = await UserService.toggleFavorite(user.username, plan.dish.id);
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
      const updatedUser = await UserService.toggleBlacklist(user.username, plan.dish.id);
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
        tabIndex={0} role="group" aria-label={`دستور پخت ${plan.dish.name}`}
      >
        <div className="meal-image relative h-60 overflow-hidden">
          <DishVisual category={plan.dish.category} className={`w-full h-full transition-all duration-1000 ease-out ${isLocked ? '' : 'group-hover:scale-110 group-hover:brightness-110'}`} iconSize={48} imageUrl={plan.dish.imageUrl} dishId={plan.dish.id} />
          
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
          <h3 className={`text-base font-bold transition-all duration-500 mb-1.5 ${isLocked ? 'text-slate-300' : 'text-slate-800 group-hover:text-teal-600'}`}>{plan.dish.name}</h3>
          {plan.dish.isCommunityRecipe && plan.dish.creatorName && <p className="-mt-1 mb-2 text-[10px] font-bold text-[#276556]">رسپی جامعهٔ نوش‌اپ · به نام {plan.dish.creatorName}</p>}
          
          <div className="flex gap-1.5 mb-2">
             <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md text-xs font-medium border border-rose-100/50"><Flame size={8} /> {toPersianDigits(calories)} کالری</div>
             <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md text-xs font-medium border border-orange-100/50"><Clock size={8} /> {toPersianDigits(time)} دقیقه</div>
          </div>

          <div className="relative flex-grow overflow-hidden mb-3">
             <p className={`text-slate-500 text-sm leading-relaxed font-bold line-clamp-2 group-hover:text-slate-700`}>
               {plan.dish.description}
             </p>
          </div>
          
          <div className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm transition-all duration-500 ${isLocked ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white group-hover:bg-teal-600 shadow-sm'}`}>
             {isLocked ? <Lock size={10} /> : <Utensils size={10} />} 
             <span>مشاهده دستور</span> 
          </div>
        </div>
      </div>

      {isModalOpen && <Suspense fallback={<div role="status" className="fixed inset-0 z-[3000] bg-white/90 flex items-center justify-center">در حال باز کردن دستور پخت…</div>}><RecipeModal dish={plan.dish} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} onUpdateUser={onUpdateUser} /></Suspense>}
    </>
  );
};

export default MealCard;
