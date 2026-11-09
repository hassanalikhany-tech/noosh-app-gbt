import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChefHat, RefreshCw, Sparkles } from 'lucide-react';
import { CATEGORY_LABELS, Dish, DishCategory, UserProfile } from '../types';
import { PANTRY_ITEMS } from '../data/pantry';
import { filterDishes } from '../utils/planner';
import MealCard from './MealCard';

interface FoodRouletteProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onOpenInventory: () => void;
}

const SPIN_DURATION = 7800;
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

const WHEEL_CATEGORIES = (Object.keys(CATEGORY_LABELS) as DishCategory[]).filter(category => category !== 'dessert');
const PROTEIN_GROUPS = PANTRY_ITEMS.find(category => category.id === 'proteins')?.subcategories ?? [];
const PROTEIN_OPTIONS = PROTEIN_GROUPS.flatMap(group => group.items);
const DEFAULT_CATEGORY_SELECTION = [...WHEEL_CATEGORIES];
const STORAGE_KEY_PREFIX = 'noosh-food-roulette-v1';
const PROTEIN_ALIASES: Record<string, string[]> = {
  'اردک': ['اردک', 'مرغابی'],
  'تن ماهی': ['تن ماهی', 'ماهی تن'],
  'تخم مرغ': ['تخم مرغ'],
  'پاچه گوساله': ['پاچه گوساله'],
  'گوشت بز': ['گوشت بز', 'گوشت بزغاله', 'بزغاله'],
  'گوشت سینه مرغ': ['سینه مرغ'],
  'گوشت شتر': ['گوشت شتر', 'شتر'],
  'گوشت غاز': ['گوشت غاز', 'غاز'],
  'گوشت گاو و گوساله': ['گوشت گاو', 'گوشت گوساله', 'گاو', 'گوساله'],
  'گوشت گوسفندی': ['گوشت گوسفندی', 'گوشت گوسفند', 'گوسفند', 'بره'],
  'کله و پاچه': ['کله و پاچه', 'کله پاچه'],
};

const normalizeProteinText = (value: string) => value
  .toLocaleLowerCase('fa')
  .replace(/[يى]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[آأإ]/g, 'ا')
  .replace(/[\u200B-\u200F\u0640]/g, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const includesProteinPhrase = (ingredient: string, phrase: string) => {
  const text = ` ${normalizeProteinText(ingredient)} `;
  const target = normalizeProteinText(phrase);
  return Boolean(target) && text.includes(` ${target} `);
};

/** Exact ingredient words and known recipe aliases; e.g. مرغ must not match تخم‌مرغ. */
const proteinMatchesIngredient = (selected: string, ingredient: string) => {
  const key = normalizeProteinText(selected);
  const text = normalizeProteinText(ingredient);
  if (!key || !text) return false;

  if (key === normalizeProteinText('مرغ')) {
    if (includesProteinPhrase(ingredient, 'تخم مرغ') || includesProteinPhrase(ingredient, 'مرغابی')) return false;
    return includesProteinPhrase(ingredient, 'مرغ') || includesProteinPhrase(ingredient, 'جوجه');
  }

  if (key === normalizeProteinText('گوشت چرخ‌کرده')) {
    return includesProteinPhrase(ingredient, 'گوشت چرخ‌کرده') || (includesProteinPhrase(ingredient, 'گوشت') && includesProteinPhrase(ingredient, 'چرخ‌کرده'));
  }

  const aliases = PROTEIN_ALIASES[selected] || [selected];
  return aliases.some(alias => includesProteinPhrase(ingredient, alias));
};

type RouletteMode = 'categories' | 'proteins';
type RouletteSettings = { mode: RouletteMode; enabledCategories: DishCategory[]; selectedProteins: string[] };
type Pick = { category: DishCategory; dish: Dish; matchedProteins: string[] };

const readSettings = (username: string): RouletteSettings => {
  const fallback: RouletteSettings = {
    mode: 'categories',
    enabledCategories: DEFAULT_CATEGORY_SELECTION,
    selectedProteins: [],
  };
  try {
    const value = JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}:${username}`) || 'null');
    if (!value || typeof value !== 'object') return fallback;
    return {
      mode: value.mode === 'proteins' ? 'proteins' : 'categories',
      enabledCategories: Array.isArray(value.enabledCategories)
        ? WHEEL_CATEGORIES.filter(category => value.enabledCategories.includes(category))
        : fallback.enabledCategories,
      selectedProteins: Array.isArray(value.selectedProteins)
        ? PROTEIN_OPTIONS.filter(item => value.selectedProteins.includes(item))
        : [],
    };
  } catch {
    return fallback;
  }
};

export default function FoodRoulette({ user, onUpdateUser, onOpenInventory }: FoodRouletteProps) {
  const [recipeRevision, setRecipeRevision] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(SPIN_DURATION);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Pick | null>(null);
  const [settings, setSettings] = useState<RouletteSettings>(() => readSettings(user.username));
  const [settingsOwner, setSettingsOwner] = useState(user.username);
  const spinTimer = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(readSettings(user.username));
    setSettingsOwner(user.username);
    setResult(null);
  }, [user.username]);

  useEffect(() => {
    if (settingsOwner !== user.username) return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:${user.username}`, JSON.stringify(settings));
    } catch { /* The roulette remains usable if local storage is unavailable. */ }
  }, [settings, settingsOwner, user.username]);

  const preferencePool = useMemo(() => filterDishes(user).filter(dish => dish.category !== 'dessert'), [user, recipeRevision]);

  const eligibleDishes = useMemo(() => {
    const enabled = new Set(settings.enabledCategories);
    return preferencePool.filter(dish => {
      if (!enabled.has(dish.category)) return false;
      if (settings.mode === 'categories') return true;
      if (!settings.selectedProteins.length) return false;
      return dish.ingredients?.some(ingredient => settings.selectedProteins.some(protein => proteinMatchesIngredient(protein, ingredient.item))) ?? false;
    });
  }, [preferencePool, settings]);

  const categories = useMemo(() => WHEEL_CATEGORIES
    .map(category => ({ category, dishes: eligibleDishes.filter(dish => dish.category === category) }))
    .filter(option => option.dishes.length > 0), [eligibleDishes]);

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
    : 'conic-gradient(#276556 0deg 120deg,#d7bd75 120deg 240deg,#789477 240deg 360deg)';

  const canSpin = !spinning && categories.length > 0 && (settings.mode === 'categories' || settings.selectedProteins.length > 0);

  const updateSettings = (update: (current: RouletteSettings) => RouletteSettings) => {
    setSettings(current => update(current));
    setResult(null);
  };

  const toggleCategory = (category: DishCategory) => updateSettings(current => ({
    ...current,
    enabledCategories: current.enabledCategories.includes(category)
      ? current.enabledCategories.filter(item => item !== category)
      : [...current.enabledCategories, category],
  }));

  const toggleProtein = (protein: string) => updateSettings(current => ({
    ...current,
    selectedProteins: current.selectedProteins.includes(protein)
      ? current.selectedProteins.filter(item => item !== protein)
      : [...current.selectedProteins, protein],
  }));

  const spin = () => {
    if (!canSpin) return;

    const categoryIndex = Math.floor(Math.random() * categories.length);
    const selectedCategory = categories[categoryIndex];
    const alternativeDishes = result
      ? selectedCategory.dishes.filter(dish => dish.id !== result.dish.id)
      : selectedCategory.dishes;
    const dishPool = alternativeDishes.length ? alternativeDishes : selectedCategory.dishes;
    const selectedDish = dishPool[Math.floor(Math.random() * dishPool.length)];
    const matchedProteins = settings.mode === 'proteins'
      ? settings.selectedProteins.filter(protein => selectedDish.ingredients?.some(ingredient => proteinMatchesIngredient(protein, ingredient.item)))
      : [];
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
    setRotation(rotation + 7 * 360 + remainingAngle);
    spinTimer.current = window.setTimeout(() => {
      setResult({ category: selectedCategory.category, dish: selectedDish, matchedProteins });
      setSpinning(false);
      spinTimer.current = null;
    }, duration + 80);
  };

  const activeCategoryCount = settings.enabledCategories.length;
  const emptyMessage = settings.mode === 'proteins'
    ? activeCategoryCount === 0
      ? 'همهٔ دسته‌ها خاموش‌اند؛ برای قرعه‌کشی پروتئینی دست‌کم یک دسته را فعال کن.'
      : settings.selectedProteins.length === 0
      ? 'برای شروع، یک مادهٔ پروتئینی انتخاب کن؛ گردونه با دسته‌هایی که رسپی مناسب دارند پر می‌شود.'
      : 'در دسته‌های فعال و با مواد پروتئینی انتخاب‌شده غذایی پیدا نشد؛ دسته یا مادهٔ دیگری انتخاب کن.'
    : settings.enabledCategories.length === 0
      ? 'همهٔ دسته‌ها خاموش‌اند؛ دست‌کم یک دسته را برای قرعه‌کشی فعال کن.'
      : 'با دسته‌ها و شخصی‌سازی‌های فعلی غذایی پیدا نشد؛ دسته‌ای را دوباره فعال کن یا تنظیماتت را بررسی کن.';

  return <section className="mx-auto my-5 w-[calc(100%-28px)] max-w-6xl overflow-hidden rounded-[28px] border border-[#d9e4d7] bg-white shadow-[0_18px_55px_rgba(23,60,43,0.09)] sm:my-8 sm:w-[calc(100%-64px)] sm:rounded-[34px]" aria-labelledby="food-roulette-title">
    <div className="food-roulette-content grid items-center gap-3 bg-[radial-gradient(ellipse_at_88%_8%,rgba(215,189,117,0.24),transparent_36%),linear-gradient(135deg,#f7f8f2,#edf4ed_62%,#e6f0e8)] px-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] sm:gap-8 sm:px-9 sm:py-8 lg:px-12 lg:py-10">
      <div className="food-roulette-copy order-2 text-center sm:order-1 sm:text-right">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d7bd75]/50 bg-white/70 px-3 py-1.5 text-[10px] font-black text-[#826832] sm:text-xs"><Sparkles size={14}/> انتخاب تصادفی نوش</span>
        <h2 id="food-roulette-title" className="mt-3 text-xl font-black leading-relaxed text-[#173c2b] sm:mt-4 sm:text-3xl">امروز چی بپزم؟</h2>
        <p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-7 text-[#617267] sm:mx-0 sm:mt-3 sm:text-sm sm:leading-8">دسته‌های دلخواهت را برای قرعه‌کشی انتخاب کن، یا یک یا چند مادهٔ پروتئینی را مشخص کن تا فقط غذاهای دارای دست‌کم یکی از آن‌ها پیشنهاد شوند. سلیقه و حساسیت‌هایت هم رعایت می‌شوند.</p>

        <div className="food-roulette-settings mt-3 rounded-2xl border border-white/90 bg-white/75 p-2.5 text-right shadow-sm sm:mt-4 sm:p-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#edf2ec] p-1" role="group" aria-label="حالت گردونه">
            <button type="button" disabled={spinning} aria-pressed={settings.mode === 'categories'} onClick={() => updateSettings(current => ({ ...current, mode: 'categories' }))} className={`min-h-9 rounded-lg px-2 text-[10px] font-black transition sm:min-h-10 sm:text-xs ${settings.mode === 'categories' ? 'bg-[#276556] text-white shadow-sm' : 'text-[#52675b] hover:bg-white'}`}>
              انتخاب از دسته‌ها
            </button>
            <button type="button" disabled={spinning} aria-pressed={settings.mode === 'proteins'} onClick={() => updateSettings(current => ({ ...current, mode: 'proteins' }))} className={`min-h-9 rounded-lg px-2 text-[10px] font-black transition sm:min-h-10 sm:text-xs ${settings.mode === 'proteins' ? 'bg-[#276556] text-white shadow-sm' : 'text-[#52675b] hover:bg-white'}`}>
              با مواد پروتئینی
            </button>
          </div>

          <details className="mt-2.5 rounded-xl border border-[#e4eae0] bg-[#fbfcf9]">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-2.5 text-[9px] font-black text-[#345c4b] marker:hidden sm:text-[11px]">
              <span>{settings.mode === 'proteins' ? 'دسته‌های مجاز برای پیشنهاد' : 'دسته‌های روی گردونه'}</span><span className="rounded-full bg-[#edf4ed] px-2 py-1 text-[8px] text-[#617267]">{activeCategoryCount.toLocaleString('fa-IR')} فعال</span>
            </summary>
            <div className="border-t border-[#e4eae0] p-2">
              <div className="mb-1.5 flex justify-end">
                <button type="button" disabled={spinning || activeCategoryCount === WHEEL_CATEGORIES.length} onClick={() => updateSettings(current => ({ ...current, enabledCategories: DEFAULT_CATEGORY_SELECTION }))} className="text-[9px] font-bold text-[#758579] underline-offset-2 hover:underline disabled:opacity-40 sm:text-[10px]">فعال‌کردن همه</button>
              </div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3" aria-label="فعال یا غیرفعال کردن دسته‌های غذا">
                {WHEEL_CATEGORIES.map(category => {
                  const selected = settings.enabledCategories.includes(category);
                  const count = preferencePool.filter(dish => dish.category === category && (settings.mode === 'categories' || !settings.selectedProteins.length || dish.ingredients?.some(ingredient => settings.selectedProteins.some(protein => proteinMatchesIngredient(protein, ingredient.item))))).length;
                  return <button key={category} type="button" disabled={spinning} aria-pressed={selected} onClick={() => toggleCategory(category)} className={`flex min-h-8 min-w-0 items-center gap-1.5 rounded-lg border px-2 text-right text-[9px] font-bold transition sm:min-h-9 sm:text-[10px] ${selected ? 'border-[#c9dccd] bg-[#edf6ef] text-[#285b45]' : 'border-transparent bg-[#f5f6f2] text-[#89938a]'} disabled:opacity-60`}>
                    <span className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded border ${selected ? 'border-[#276556] bg-[#276556] text-white' : 'border-[#cbd4cb] bg-white'}`}>{selected && <Check size={10}/>}</span>
                    <span className="min-w-0 flex-1 truncate">{CATEGORY_LABELS[category]}</span>
                    <span className="shrink-0 text-[8px] opacity-60">{count.toLocaleString('fa-IR')}</span>
                  </button>;
                })}
              </div>
            </div>
          </details>
          {settings.mode === 'proteins' && <details className="mt-2.5 rounded-xl border border-[#e4eae0] bg-[#fbfcf9]">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-2.5 text-[9px] font-black text-[#345c4b] marker:hidden sm:text-[11px]">
              <span>انتخاب مادهٔ پروتئینی</span><span className="rounded-full bg-[#edf4ed] px-2 py-1 text-[8px] text-[#617267]">{settings.selectedProteins.length ? `${settings.selectedProteins.length.toLocaleString('fa-IR')} انتخاب` : 'انتخاب نشده'}</span>
            </summary>
            <div className="food-roulette-filter-list max-h-[142px] space-y-2 overflow-y-auto overscroll-contain border-t border-[#e4eae0] bg-[#f7f8f4] p-2 sm:max-h-[172px]">
              <p className="text-[8px] font-semibold leading-4 text-[#758579] sm:text-[9px]">برای دیدن همهٔ مواد، داخل فهرست بالا و پایین برو.</p>
              {PROTEIN_GROUPS.map(group => <div key={group.id}>
                <p className="mb-1 text-[8px] font-black text-[#89938a] sm:text-[9px]">{group.title}</p>
                <div className="flex flex-wrap gap-1">
                  {group.items.map(protein => {
                    const selected = settings.selectedProteins.includes(protein);
                    return <button key={protein} type="button" disabled={spinning} aria-pressed={selected} onClick={() => toggleProtein(protein)} className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-[9px] font-bold transition sm:min-h-8 sm:text-[10px] ${selected ? 'border-[#276556] bg-[#276556] text-white' : 'border-[#e0e7dc] bg-white text-[#52675b] hover:border-[#adc7b1]'} disabled:opacity-60`}>
                      {selected && <Check size={11}/>}<span>{protein}</span>
                    </button>;
                  })}
                </div>
              </div>)}
            </div>
          </details>}
        </div>

        <button type="button" onClick={spin} disabled={!canSpin} aria-busy={spinning} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d5bd79] bg-[#276556] px-5 text-sm font-black text-white shadow-[0_7px_0_#19483d,0_13px_24px_rgba(23,60,43,0.18)] transition hover:-translate-y-0.5 hover:bg-[#215b4d] active:translate-y-1 active:shadow-[0_3px_0_#19483d] disabled:cursor-not-allowed disabled:opacity-65 sm:mt-4 sm:min-h-14 sm:w-auto sm:min-w-56 sm:px-7 sm:text-base">
          {spinning ? <RefreshCw size={18} className="animate-spin"/> : result ? <RefreshCw size={18}/> : <Sparkles size={18}/>}
          <span>{spinning ? 'گردونه می‌چرخد…' : result ? 'دوباره بچرخان' : 'گردونه را بچرخان'}</span>
        </button>
        <p aria-live="polite" role="status" className="mt-2 min-h-6 text-[10px] font-bold leading-5 text-[#276556] sm:mt-3 sm:text-xs sm:leading-6">
          {spinning ? 'دسته و غذا به‌صورت تصادفی انتخاب می‌شوند…' : result ? (settings.mode === 'proteins' ? `این غذا با ${result.matchedProteins.map(item => `«${item}»`).join(' و ')} جور است.` : `از دستهٔ ${CATEGORY_LABELS[result.category]} انتخاب شد.`) : categories.length ? (settings.mode === 'proteins' && !settings.selectedProteins.length ? emptyMessage : `${categories.length.toLocaleString('fa-IR')} دسته با رسپی‌های مناسب آمادهٔ قرعه‌کشی است.`) : emptyMessage}
        </p>
      </div>

      <div className="food-roulette-wheel-wrap order-1 mx-auto w-full max-w-[280px] sm:order-2 sm:max-w-[330px] lg:max-w-[390px]">
        <div className="relative mx-auto w-full p-2 sm:p-4">
          <span aria-hidden="true" className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-x-[16px] border-x-transparent border-t-[29px] border-t-[#b08c43] drop-shadow-md"/>
          <div className="food-roulette-wheel-frame relative mx-auto aspect-square w-full rounded-full border-[7px] border-[#d7bd75] bg-white p-1 shadow-[0_10px_30px_rgba(23,60,43,0.18),inset_0_0_0_2px_rgba(255,255,255,0.8)] sm:border-[9px] sm:p-1.5">
            <div
              className="food-roulette-wheel relative aspect-square w-full overflow-hidden rounded-full border border-white/70"
              role="img"
              aria-label={settings.mode === 'proteins' ? 'گردونهٔ انتخاب غذا بر اساس مادهٔ پروتئینی' : 'گردونهٔ انتخاب دستهٔ غذا'}
              style={{ background: wheelBackground, transform: `rotate(${rotation}deg)`, transition: `transform ${spinDuration}ms cubic-bezier(0.12, 0.72, 0.12, 1)` }}
            >
              <div aria-hidden="true" className="absolute inset-2 rounded-full border border-white/40"/>
              {categories.length ? categories.map((option, index) => {
                const segment = 360 / categories.length;
                const radians = ((index + 0.5) * segment - 90) * Math.PI / 180;
                const left = 50 + Math.cos(radians) * 35;
                const top = 50 + Math.sin(radians) * 35;
                const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
                return <span key={option.category} className="absolute z-[1] flex w-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center text-[8px] font-black leading-[1.25] sm:text-[10px]" style={{ left: `${left}%`, top: `${top}%`, color: color.text, textShadow: color.text === '#fffdf6' ? '0 1px 2px rgba(0,0,0,.24)' : 'none' }}>
                  <span style={{ transform: `rotate(${-rotation}deg)` }}>{CATEGORY_LABELS[option.category]}</span>
                </span>;
              }) : <span className="absolute left-1/2 top-[18%] z-[1] w-[65%] -translate-x-1/2 text-center text-[9px] font-black leading-5 text-white drop-shadow sm:text-xs">{settings.mode === 'proteins' && settings.selectedProteins.length ? 'غذای جور پیدا نشد' : 'یک ماده را انتخاب کن'}</span>}
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
