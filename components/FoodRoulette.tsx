import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChefHat, RefreshCw, Sparkles } from 'lucide-react';
import { CATEGORY_LABELS, Dish, DishCategory, UserProfile } from '../types';
import { filterDishes } from '../utils/planner';
import MealCard from './MealCard';

interface FoodRouletteProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onOpenInventory: () => void;
}

const SPIN_DURATION = 4600;
const SEGMENT_COLORS = [
  { wheel: '#276556', text: '#fffdf6' },
  { wheel: '#d7bd75', text: '#244b3e' },
  { wheel: '#174538', text: '#fffdf6' },
  { wheel: '#789477', text: '#fffdf6' },
  { wheel: '#eadcaf', text: '#244b3e' },
  { wheel: '#3e7563', text: '#fffdf6' },
  { wheel: '#cba65a', text: '#244b3e' },
  { wheel: '#224b3f', text: '#fffdf6' },
  { wheel: '#9bad88', text: '#244b3e' },
];

type Pick = { category: DishCategory; dish: Dish };

export default function FoodRoulette({ user, onUpdateUser, onOpenInventory }: FoodRouletteProps) {
  const [recipeRevision, setRecipeRevision] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(SPIN_DURATION);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Pick | null>(null);
  const spinTimer = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const categories = useMemo(() => {
    const eligibleDishes = filterDishes(user);
    return (Object.keys(CATEGORY_LABELS) as DishCategory[])
      .map(category => ({ category, dishes: eligibleDishes.filter(dish => dish.category === category) }))
      .filter(option => option.category !== 'dessert' && option.dishes.length > 0);
  }, [user, recipeRevision]);

  useEffect(() => {
    const updateRecipes = () => setRecipeRevision(revision => revision + 1);
    window.addEventListener('recipes-updated', updateRecipes);
    return () => window.removeEventListener('recipes-updated', updateRecipes);
  }, []);

  useEffect(() => () => {
    if (spinTimer.current !== null) window.clearTimeout(spinTimer.current);
  }, []);

  useEffect(() => {
    if (!result) return;
    const scrollTimer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
    }, 80);
    return () => window.clearTimeout(scrollTimer);
  }, [result]);

  const wheelBackground = categories.length
    ? `conic-gradient(${categories.map((option, index) => {
      const start = index * 360 / categories.length;
      const end = (index + 1) * 360 / categories.length;
      const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length].wheel;
      return `${color} ${start}deg ${end}deg`;
    }).join(',')})`
    : 'conic-gradient(#e8eee8 0deg 360deg)';

  const spin = () => {
    if (spinning || categories.length === 0) return;

    const categoryIndex = Math.floor(Math.random() * categories.length);
    const selectedCategory = categories[categoryIndex];
    const alternativeDishes = result
      ? selectedCategory.dishes.filter(dish => dish.id !== result.dish.id)
      : selectedCategory.dishes;
    const dishPool = alternativeDishes.length ? alternativeDishes : selectedCategory.dishes;
    const selectedDish = dishPool[Math.floor(Math.random() * dishPool.length)];
    const segmentAngle = 360 / categories.length;
    const centerAngle = (categoryIndex + 0.5) * segmentAngle;
    const currentAngle = ((rotation % 360) + 360) % 360;
    const targetAngle = (360 - centerAngle + 360) % 360;
    const remainingAngle = (targetAngle - currentAngle + 360) % 360;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 220 : SPIN_DURATION;

    if (spinTimer.current !== null) window.clearTimeout(spinTimer.current);
    setSpinDuration(duration);
    setResult(null);
    setSpinning(true);
    setRotation(rotation + 5 * 360 + remainingAngle);
    spinTimer.current = window.setTimeout(() => {
      setResult({ category: selectedCategory.category, dish: selectedDish });
      setSpinning(false);
      spinTimer.current = null;
    }, duration + 80);
  };

  return <section className="mx-auto my-5 w-[calc(100%-28px)] max-w-6xl overflow-hidden rounded-[28px] border border-[#d9e4d7] bg-white shadow-[0_18px_55px_rgba(23,60,43,0.09)] sm:my-8 sm:w-[calc(100%-64px)] sm:rounded-[34px]" aria-labelledby="food-roulette-title">
    <div className="grid items-center gap-3 bg-[radial-gradient(ellipse_at_88%_8%,rgba(215,189,117,0.24),transparent_36%),linear-gradient(135deg,#f7f8f2,#edf4ed_62%,#e6f0e8)] px-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] sm:gap-8 sm:px-9 sm:py-8 lg:px-12 lg:py-10">
      <div className="order-2 text-center sm:order-1 sm:text-right">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7bd75]/50 bg-white/70 px-3 py-1.5 text-[10px] font-black text-[#826832] sm:text-xs"><Sparkles size={14}/> انتخاب تصادفی نوش</span>
        <h2 id="food-roulette-title" className="mt-3 text-xl font-black leading-relaxed text-[#173c2b] sm:mt-4 sm:text-3xl">امروز چی بپزم؟</h2>
        <p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-7 text-[#617267] sm:mx-0 sm:mt-3 sm:text-sm sm:leading-8">گردونه را بچرخان تا یک دستهٔ غذایی و یک دستور تصادفی از همان دسته انتخاب شود. فیلترها و حساسیت‌های شخصی‌ات هم رعایت می‌شوند.</p>
        <button type="button" onClick={spin} disabled={spinning || categories.length === 0} aria-busy={spinning} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d5bd79] bg-[#276556] px-5 text-sm font-black text-white shadow-[0_7px_0_#19483d,0_13px_24px_rgba(23,60,43,0.18)] transition hover:-translate-y-0.5 hover:bg-[#215b4d] active:translate-y-1 active:shadow-[0_3px_0_#19483d] disabled:cursor-wait disabled:opacity-85 sm:mt-6 sm:min-h-14 sm:w-auto sm:min-w-56 sm:px-7 sm:text-base">
          {spinning ? <RefreshCw size={18} className="animate-spin"/> : result ? <RefreshCw size={18}/> : <Sparkles size={18}/>}
          <span>{spinning ? 'گردونه می‌چرخد…' : result ? 'دوباره بچرخان' : 'گردونه را بچرخان'}</span>
        </button>
        <p aria-live="polite" role="status" className="mt-3 min-h-6 text-xs font-bold leading-6 text-[#276556]">
          {spinning ? 'دسته و غذای این نوبت در حال انتخاب‌اند…' : result ? `از دستهٔ ${CATEGORY_LABELS[result.category]}، این غذا انتخاب شد.` : categories.length ? `${categories.length.toLocaleString('fa-IR')} دسته با توجه به شخصی‌سازی‌ها آمادهٔ قرعه‌کشی است.` : 'با فیلترهای فعلی غذایی برای انتخاب پیدا نشد؛ تنظیمات علاقه‌مندی‌ها را بررسی کن.'}
        </p>
      </div>

      <div className="order-1 mx-auto w-full max-w-[280px] sm:order-2 sm:max-w-[330px] lg:max-w-[390px]">
        <div className="relative mx-auto w-full p-2 sm:p-4">
          <span aria-hidden="true" className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-x-[16px] border-x-transparent border-t-[29px] border-t-[#b08c43] drop-shadow-md"/>
          <div className="relative aspect-square w-full rounded-full border-[7px] border-[#d7bd75] bg-white p-1 shadow-[0_10px_30px_rgba(23,60,43,0.18),inset_0_0_0_2px_rgba(255,255,255,0.8)] sm:border-[9px] sm:p-1.5">
            <div
              className="relative h-full w-full overflow-hidden rounded-full border border-white/70"
              role="img"
              aria-label="گردونهٔ انتخاب دستهٔ غذا"
              style={{ background: wheelBackground, transform: `rotate(${rotation}deg)`, transition: `transform ${spinDuration}ms cubic-bezier(0.12, 0.72, 0.12, 1)` }}
            >
              <div aria-hidden="true" className="absolute inset-2 rounded-full border border-white/40"/>
              {categories.map((option, index) => {
                const segment = 360 / categories.length;
                const radians = ((index + 0.5) * segment - 90) * Math.PI / 180;
                const left = 50 + Math.cos(radians) * 35;
                const top = 50 + Math.sin(radians) * 35;
                const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
                return <span key={option.category} className="absolute z-[1] flex w-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center text-[8px] font-black leading-[1.25] sm:text-[10px]" style={{ left: `${left}%`, top: `${top}%`, color: color.text, textShadow: color.text === '#fffdf6' ? '0 1px 2px rgba(0,0,0,.24)' : 'none' }}>
                  <span style={{ transform: `rotate(${-rotation}deg)` }}>{CATEGORY_LABELS[option.category]}</span>
                </span>;
              })}
              <div aria-hidden="true" className="absolute left-1/2 top-1/2 z-10 grid aspect-square w-[31%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[5px] border-[#d7bd75] bg-[#f8f7ef] shadow-[0_3px_14px_rgba(23,60,43,0.28)] sm:border-[6px]">
                <div className="grid aspect-square w-[78%] place-items-center overflow-hidden rounded-full border border-[#dbe5d9] bg-white">
                  <img src="/brand/noosh-logo.png" alt="" className="h-full w-full object-cover"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {result && <div ref={resultRef} className="scroll-mt-6 border-t border-[#e7ece4] bg-white px-4 py-5 sm:px-9 sm:py-7">
      <div className="mx-auto max-w-sm">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-[#edf4ed] px-3 py-1.5 text-xs font-black text-[#276556]"><ChefHat size={15}/>{CATEGORY_LABELS[result.category]}</span><span className="text-[10px] font-bold text-slate-400">پیشنهاد این دور</span></div>
        <MealCard plan={{ dayName: CATEGORY_LABELS[result.category], dish: result.dish }} user={user} onUpdateUser={onUpdateUser} onOpenInventory={onOpenInventory}/>
      </div>
    </div>}
  </section>;
}
