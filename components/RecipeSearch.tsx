import { normalizePersian } from '../utils/text';

import { Search, Database, ChevronRight, ChevronLeft, LayoutList, MapPin, X } from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dish, DishCategory, CATEGORY_LABELS, UserProfile } from '../types';
import { RecipeService } from '../services/recipeService';
import { getCountryCode, getCountryCodes } from '../utils/recipeHelpers';
import MealCard from './MealCard';
import RecipeCreatorFilter from './RecipeCreatorFilter';
import { filterRecipeSearchDishes, suggestRecipeNames } from '../utils/recipeSearch';
import { creatorKey, getRecipeCreators } from '../utils/recipeCreators';
import DishVisual from './DishVisual';
import { estimateRecipeBudgetCost } from '../utils/recipeCosts';

interface RecipeSearchProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  externalSearchTerm?: string;
  creatorRequest?: { name: string; token: number } | null;
  onCreatorRequestHandled?: () => void;
}

const ITEMS_PER_PAGE = 24;

const COUNTRY_DATA = [
  { id: 'ir', label: 'ایران', matches: ['ایران', 'Iran'] },
  { id: 'az', label: 'آذربایجان', matches: ['آذربایجان', 'Azerbaijan'] },
  { id: 'at', label: 'اتریش', matches: ['اتریش', 'Austria'] },
  { id: 'jo', label: 'اردن', matches: ['اردن', 'اردنی', 'Jordan', 'Jordanian'] },
  { id: 'uz', label: 'ازبکستان', matches: ['ازبکستان', 'Uzbekistan'] },
  { id: 'kz', label: 'قزاقستان', matches: ['قزاقستان', 'کازاخستان', 'Kazakhstan'] },
  { id: 'tj', label: 'تاجیکستان', matches: ['تاجیکستان', 'Tajikistan'] },
  { id: 'sg', label: 'سنگاپور', matches: ['سنگاپور', 'Singapore'] },
  { id: 'ps', label: 'فلسطین', matches: ['فلسطین', 'فلسطینی', 'Palestine', 'Palestinian'] },
  { id: 'mn', label: 'مغولستان', matches: ['مغولستان', 'Mongolia'] },
  { id: 'sa', label: 'عربستان سعودی', matches: ['عربستان', 'Saudi', 'Saudi Arabia'] },
  { id: 'ye', label: 'یمن', matches: ['یمن', 'Yemen'] },
  { id: 'eg', label: 'مصر', matches: ['مصر', 'Egypt'] },
  { id: 'lb', label: 'لبنان', matches: ['لبنان', 'Lebanon'] },
  { id: 'tr', label: 'ترکیه', matches: ['ترکیه', 'Turkey'] },
  { id: 'af', label: 'افغانستان', matches: ['افغانستان', 'Afghanistan'] },
  { id: 'ma', label: 'مراکش', matches: ['مراکش', 'Morocco'] },
  { id: 'pe', label: 'پرو', matches: ['پرو', 'Peru'] },
  { id: 'br', label: 'برزیل', matches: ['برزیل', 'Brazil'] },
  { id: 'ar', label: 'آرژانتین', matches: ['آرژانتین', 'Argentina'] },
  { id: 'mx', label: 'مکزیک', matches: ['مکزیک', 'Mexico'] },
  { id: 'id', label: 'اندونزی', matches: ['اندونزی', 'Indonesia'] },
  { id: 'th', label: 'تایلند', matches: ['تایلند', 'Thailand'] },
  { id: 'vn', label: 'ویتنام', matches: ['ویتنام', 'Vietnam'] },
  { id: 'in', label: 'هند', matches: ['هند', 'India'] },
  { id: 'cn', label: 'چین', matches: ['چین', 'China'] },
  { id: 'jp', label: 'ژاپن', matches: ['ژاپن', 'Japan'] },
  { id: 'gb', label: 'بریتانیا', matches: ['بریتانیا', 'UK'] },
  { id: 'hu', label: 'مجارستان', matches: ['مجارستان', 'Hungary'] },
  { id: 'it', label: 'ایتالیا', matches: ['ایتالیا', 'Italy'] },
  { id: 'fr', label: 'فرانسه', matches: ['فرانسه', 'France'] },
  { id: 'ru', label: 'روسیه', matches: ['روسیه', 'Russia'] },
  { id: 'gr', label: 'یونان', matches: ['یونان', 'Greek', 'Greece'] },
  { id: 'es', label: 'اسپانیا', matches: ['اسپانیا', 'Spain'] },
  { id: 'us', label: 'آمریکا', matches: ['آمریکا', 'USA'] },
].sort((a, b) => a.label.localeCompare(b.label, 'fa'));

const CountryFlag: React.FC<{ country: { id: string; label: string } }> = ({ country }) => {
  const code = getCountryCodes(country.id)[0] || getCountryCodes(country.label)[0] || getCountryCode(country.id) || getCountryCode(country.label);
  const sources = code ? [
    `https://flagcdn.com/w160/${code}.png`,
    `https://flagcdn.com/${code}.svg`,
    `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.3.2/flags/4x3/${code}.svg`,
  ] : [];
  const [sourceIndex, setSourceIndex] = useState(0);
  useEffect(() => setSourceIndex(0), [code]);

  if (!sources.length || sourceIndex >= sources.length) {
    return <span aria-label={`منطقهٔ غذایی ${country.label}`} title={`منطقهٔ غذایی ${country.label}`} className="w-full h-full bg-slate-100 grid place-items-center"><MapPin aria-hidden="true" size={18} className="text-slate-500" /></span>;
  }
  return <img src={sources[sourceIndex]} alt={country.label} className="w-full h-full object-cover" onError={() => setSourceIndex(index => index + 1)} loading="lazy" decoding="async" />;
};

const RecipeSearch: React.FC<RecipeSearchProps> = ({ user, onUpdateUser, externalSearchTerm = '', creatorRequest, onCreatorRequestHandled }) => {
  const [selectedCategory, setSelectedCategory] = useState<DishCategory | 'all'>('all');
  const [selectedCountryId, setSelectedCountryId] = useState<string | 'all'>('all');
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [selectedCreator, setSelectedCreator] = useState('all');
  const [sortMode, setSortMode] = useState<'default' | 'rating-high' | 'rating-low' | 'cost-low'>('default');
  const [budgetInput, setBudgetInput] = useState('');
  const budgetLimit = Number(budgetInput.replace(/[٬,]/g, '').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))));
  const creators = useMemo(() => getRecipeCreators(allDishes), [allDishes]);
  const nooshRecipeCount = useMemo(() => allDishes.filter(dish => !dish.isCommunityRecipe && !dish.isPersonal).length, [allDishes]);
  const activeCreator = creators.find(creator => creator.key === selectedCreator);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(externalSearchTerm);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => { setSearchTerm(externalSearchTerm); setCurrentPage(1); }, [externalSearchTerm]);
  useEffect(() => { setCurrentPage(1); }, [allDishes, selectedCategory, selectedCountryId, user.dislikedIngredients]);

  useEffect(() => {
    if (!creatorRequest) return;
    setSelectedCreator(`creator:${creatorKey(creatorRequest.name)}`);
    setSearchTerm(''); setSelectedCategory('all'); setSelectedCountryId('all'); setCurrentPage(1);
    onCreatorRequestHandled?.();
  }, [creatorRequest, onCreatorRequestHandled]);

  const selectCreator = (key: string) => {
    setSelectedCreator(key); setSearchTerm(''); setSelectedCategory('all'); setSelectedCountryId('all'); setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm(''); setSelectedCreator('all'); setSelectedCategory('all'); setSelectedCountryId('all'); setSortMode('default'); setBudgetInput(''); setCurrentPage(1);
  };

  const flagsScrollRef = useRef<HTMLDivElement>(null);

  const loadDishes = (event?: Event) => {
    setAllDishes(RecipeService.getAllDishes());
    void event;
  };

  useEffect(() => {
    loadDishes();
    window.addEventListener('recipes-updated', loadDishes);
    return () => window.removeEventListener('recipes-updated', loadDishes);
  }, []);

  const scrollFlags = (direction: 'right' | 'left') => {
    if (flagsScrollRef.current) {
      const scrollAmount = 150;
      flagsScrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const countryOptions = useMemo<Array<{ id: string; label: string; matches: string[] }>>(() => {
    const options = COUNTRY_DATA.map(country => ({ ...country }));
    const covered = new Set(options.flatMap(country => [country.id, country.label, ...country.matches].map(normalizePersian)));
    const nationalities = new Set<string>(allDishes.filter(dish => dish.category === 'international').flatMap(dish => dish.nationality?.trim() ? [dish.nationality.trim()] : []));
    for (const nationality of nationalities) {
      if (covered.has(normalizePersian(nationality))) continue;
      const countryCodes = getCountryCodes(nationality);
      if (countryCodes.length && countryCodes.every(code => options.some(country => country.id === code))) {
        covered.add(normalizePersian(nationality));
        continue;
      }
      const countryCode = countryCodes.length === 1 ? countryCodes[0] : getCountryCode(nationality);
      options.push({ id: countryCode || `country-${normalizePersian(nationality)}`, label: nationality, matches: [nationality, ...(countryCode ? [countryCode] : [])] });
      covered.add(normalizePersian(nationality));
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, 'fa'));
  }, [allDishes]);

  const budgetCosts = useMemo(() => {
    const estimates = new Map<string, ReturnType<typeof estimateRecipeBudgetCost>>();
    if (!(budgetLimit > 0) && sortMode !== 'cost-low') return estimates;
    for (const dish of allDishes) estimates.set(dish.id, estimateRecipeBudgetCost(dish, user.familySize || 4, user.inventory || [], user.purchaseHistory || []));
    return estimates;
  }, [allDishes, budgetLimit, sortMode, user.familySize, user.inventory, user.purchaseHistory]);

  const filteredDishes = useMemo(() => {
    let matching = filterRecipeSearchDishes(allDishes, { searchTerm, selectedCreator, selectedCategory, selectedCountryId }, user, countryOptions);
    if (budgetLimit > 0) matching = matching.filter(dish => {
      const estimate = budgetCosts.get(dish.id);
      return Boolean(estimate && estimate.eligibleRows > 0 && estimate.pricedRows === estimate.eligibleRows && estimate.missingIngredients.length === 0 && estimate.pricedSubtotal <= budgetLimit);
    });
    if (sortMode === 'default' && !(budgetLimit > 0)) return matching;
    const originalOrder = new Map(matching.map((dish, index) => [dish.id, index]));
    return matching.slice().sort((a, b) => {
      if (sortMode === 'cost-low' || (budgetLimit > 0 && sortMode === 'default')) {
        const estimateA = budgetCosts.get(a.id);
        const estimateB = budgetCosts.get(b.id);
        const completeA = Boolean(estimateA && estimateA.eligibleRows > 0 && estimateA.pricedRows === estimateA.eligibleRows && estimateA.missingIngredients.length === 0);
        const completeB = Boolean(estimateB && estimateB.eligibleRows > 0 && estimateB.pricedRows === estimateB.eligibleRows && estimateB.missingIngredients.length === 0);
        if (completeA !== completeB) return completeA ? -1 : 1;
        if (completeA && completeB && estimateA!.pricedSubtotal !== estimateB!.pricedSubtotal) return estimateA!.pricedSubtotal - estimateB!.pricedSubtotal;
      }
      if (sortMode === 'rating-high' || sortMode === 'rating-low') {
        const ratingA = user.recipeReviews?.[a.id]?.rating || 0;
        const ratingB = user.recipeReviews?.[b.id]?.rating || 0;
        if (Boolean(ratingA) !== Boolean(ratingB)) return ratingA ? -1 : 1;
        if (ratingA !== ratingB) return sortMode === 'rating-high' ? ratingB - ratingA : ratingA - ratingB;
      }
      return (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0);
    });
  }, [searchTerm, selectedCategory, selectedCountryId, allDishes, countryOptions, user.dislikedIngredients, user.recipeReviews, user, selectedCreator, sortMode, budgetLimit, budgetCosts]);

  const searchSuggestions = useMemo(() => suggestRecipeNames(allDishes, searchTerm), [allDishes, searchTerm]);
  const showSearchSuggestions = searchFocused && searchTerm.trim().length > 0 && searchSuggestions.length > 0;

  const chooseSuggestion = (dish: Dish) => {
    setSearchTerm(dish.name);
    setSelectedCreator('all'); setSelectedCategory('all'); setSelectedCountryId('all'); setCurrentPage(1);
    setActiveSuggestionIndex(-1); setSearchFocused(false);
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchSuggestions) {
      if (event.key === 'Escape') setSearchFocused(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIndex(index => (index + 1) % searchSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex(index => index <= 0 ? searchSuggestions.length - 1 : index - 1);
    } else if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
      event.preventDefault(); chooseSuggestion(searchSuggestions[activeSuggestionIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault(); setSearchFocused(false); setActiveSuggestionIndex(-1);
    }
  };

  const totalPages = Math.ceil(filteredDishes.length / ITEMS_PER_PAGE);
  const visiblePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedDishes = filteredDishes.slice((visiblePage - 1) * ITEMS_PER_PAGE, visiblePage * ITEMS_PER_PAGE);
  useEffect(() => { setCurrentPage(visiblePage); }, [visiblePage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toPersian = (num: number | string) => num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  return (
    <div className="recipe-search flex flex-col h-full [@media(orientation:landscape)_and_(max-height:500px)]:h-auto animate-enter">
      {/* کادر جستجو قفل شده - شیشه‌ای دقیق */}
      <div className="sticky top-0 [@media(orientation:landscape)_and_(max-height:500px)]:relative z-[900] bg-white/40 backdrop-blur-2xl px-4 py-3 sm:py-6 sm:px-10 border-b border-white/20">
        <div className="backdrop-blur-3xl bg-white/50 border border-white/60 rounded-[1.75rem] sm:rounded-[2.5rem] p-3 sm:p-6 shadow-xl shadow-slate-200/50 max-w-7xl mx-auto space-y-3 sm:space-y-5">
           <div className="relative group">
              <input 
                ref={searchInputRef}
                type="text" 
                aria-label="جستجوی نام غذا یا مواد اولیه" placeholder="جستجوی نام غذا یا مواد اولیه…" 
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSearchSuggestions}
                aria-controls="recipe-search-suggestions"
                aria-activedescendant={activeSuggestionIndex >= 0 ? `recipe-suggestion-${activeSuggestionIndex}` : undefined}
                value={searchTerm}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                onKeyDown={handleSearchKeyDown}
                onChange={(e) => {
                  setSearchTerm(e.target.value); setCurrentPage(1); setActiveSuggestionIndex(-1);
                  if (e.target.value.trim()) { setSelectedCreator('all'); setSelectedCategory('all'); setSelectedCountryId('all'); }
                }}
                className="w-full px-10 sm:px-16 py-3 sm:py-5 bg-white border border-slate-200 rounded-xl sm:rounded-[1.75rem] outline-none focus:border-[#276556] focus:ring-4 focus:ring-[#276556]/10 transition-all font-bold text-sm sm:text-lg text-slate-800 shadow-sm placeholder:text-slate-400"
              />
              <Search className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500" size={18} sm:size={28} />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); setCurrentPage(1); setSelectedCreator('all'); setSelectedCategory('all'); setSelectedCountryId('all'); setSearchFocused(false); }} className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-500 transition-all" aria-label="پاک کردن جست‌وجو"><X size={14} sm:size={20}/></button>
              )}
              {showSearchSuggestions && (
                <div id="recipe-search-suggestions" role="listbox" aria-label="نزدیک‌ترین نام غذاها" className="absolute right-0 left-0 top-[calc(100%+0.55rem)] z-[1000] max-h-[min(60vh,24rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold text-slate-500">نزدیک‌ترین نام غذاها · برای انتخاب روی غذا بزن</p>
                  {searchSuggestions.map((dish, index) => (
                    <button
                      key={dish.id}
                      id={`recipe-suggestion-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeSuggestionIndex}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => chooseSuggestion(dish)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-right transition-colors focus:outline-none focus:ring-2 focus:ring-[#276556]/30 ${index === activeSuggestionIndex ? 'bg-[#276556]/10 text-[#194d41]' : 'text-slate-700 hover:bg-[#276556]/5'}`}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-amber-50 text-base"><DishVisual category={dish.category} dishId={dish.id} imageUrl={dish.imageUrl} iconSize={14} className="h-full w-full" /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{dish.name}</span>
                      {dish.nationality && <span className="max-w-24 truncate text-[11px] text-slate-500">{dish.nationality}</span>}
                    </button>
                  ))}
                </div>
              )}
           </div>

           <div className="grid grid-cols-5 grid-rows-2 gap-1.5 pb-1 sm:flex sm:flex-wrap sm:items-center sm:gap-2" role="group" aria-label="فیلتر دسته‌بندی غذاها">
              <button 
                onClick={() => { setSelectedCategory('all'); setSelectedCountryId('all'); setCurrentPage(1); }} 
                className={`min-h-14 min-w-0 whitespace-normal break-words px-1 py-1.5 text-center leading-4 sm:min-h-11 sm:whitespace-nowrap sm:px-6 sm:py-3.5 rounded-lg sm:rounded-2xl text-[11px] sm:text-sm font-black border transition-all ${selectedCategory === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/80 text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                 <span className="block w-full">همه غذاها</span>
              </button>
              {(Object.keys(CATEGORY_LABELS) as DishCategory[]).map(cat => (
                <button 
                  key={cat} 
                  onClick={() => { setSelectedCategory(cat); setSelectedCountryId('all'); setCurrentPage(1); }} 
                  className={`min-h-14 min-w-0 whitespace-normal break-words px-1 py-1.5 text-center leading-4 sm:min-h-11 sm:whitespace-nowrap sm:px-6 sm:py-3.5 rounded-lg sm:rounded-2xl text-[11px] sm:text-sm font-black border transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/80 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  <span className="block w-full">{CATEGORY_LABELS[cat]}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <RecipeCreatorFilter creators={creators} nooshCount={nooshRecipeCount} value={selectedCreator} onChange={selectCreator} />
              <div className="flex flex-col gap-2 sm:items-end">
                <label className="flex min-h-10 items-center gap-2 text-xs font-bold text-slate-600"><span className="shrink-0">مرتب‌سازی</span><select value={sortMode} onChange={event => { setSortMode(event.target.value as typeof sortMode); setCurrentPage(1); }} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#276556] focus:ring-2 focus:ring-[#276556]/10"><option value="default">ترتیب پیش‌فرض</option><option value="rating-high">امتیاز من · زیاد به کم</option><option value="rating-low">امتیاز من · کم به زیاد</option><option value="cost-low">هزینهٔ کمتر برای خانواده</option></select></label>
                <label className="flex min-h-10 items-center gap-2 text-xs font-bold text-slate-600"><span className="shrink-0">حداکثر بودجهٔ غذا برای {toPersian(user.familySize || 4)} نفر (تومان)</span><input type="number" min="1" step="10000" inputMode="numeric" value={budgetInput} onChange={event => { setBudgetInput(event.target.value); setCurrentPage(1); }} placeholder="مثلاً ۸۰۰٬۰۰۰" className="h-10 w-36 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#276556] focus:ring-2 focus:ring-[#276556]/10" /></label>
                <p role="status" className="text-xs leading-6 text-slate-600">{activeCreator ? <><strong className="text-[#276556]">{activeCreator.name}</strong> · {toPersian(activeCreator.count)} رسپی منتشرشده · {toPersian(filteredDishes.length)} نتیجه با فیلترهای فعلی</> : `${toPersian(filteredDishes.length)} غذا مطابق جست‌وجو و فیلترهای شما`}</p>
              </div>
            </div>
            {budgetLimit > 0 ? <p className="-mt-1 text-[11px] leading-5 text-slate-500">فقط دستورهایی نمایش داده می‌شوند که برآورد کامل هزینه‌شان با قیمت‌های ثبت‌شده برای همهٔ مواد، زیر این بودجه باشد؛ دستورهای دارای قیمت یا تبدیل نامعلوم کنار گذاشته می‌شوند.</p> : sortMode === 'rating-high' || sortMode === 'rating-low' ? <p className="-mt-1 text-[11px] leading-5 text-slate-500">غذاهایی که به آن‌ها امتیاز داده‌ای اول می‌آیند؛ غذاهای امتیازنداده‌شده بعد از آن‌ها می‌مانند.</p> : sortMode === 'cost-low' ? <p className="-mt-1 text-[11px] leading-5 text-slate-500">دستورهایی که برآورد کامل دارند از کم‌هزینه‌تر به پرهزینه‌تر مرتب می‌شوند.</p> : null}
            {activeCreator && <p className="text-xs leading-6 text-slate-600">همهٔ دستورهای این آشپز قابل مشاهده‌اند؛ غذاهای دارای مواد ممنوع شما با هشدار مشخص می‌شوند و همچنان از پیشنهادها و برنامهٔ غذایی کنار گذاشته می‌شوند.</p>}
            {selectedCategory === 'international' && (
              <div className="relative pt-2 sm:pt-4 border-t border-white/40 animate-enter flex items-center group/flags">
                <button 
                  onClick={() => scrollFlags('right')}
                  className="absolute right-0 z-20 p-2 sm:p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-slate-100 text-indigo-600 hover:bg-white transition-all flex items-center justify-center"
                >
                  <ChevronRight size={18} sm:size={20} strokeWidth={3} />
                </button>

                <div 
                  ref={flagsScrollRef}
                  className="flex gap-2 sm:gap-3 items-center overflow-x-auto no-scrollbar pb-1 w-full px-8 sm:px-10"
                >
                  <button 
                    onClick={() => { setSelectedCountryId('all'); setCurrentPage(1); }} 
                    className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-[9px] sm:text-sm font-black border-2 transition-all shrink-0 ${selectedCountryId === 'all' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-white/80 text-slate-600 border-transparent hover:border-slate-200'}`}
                  >
                    همه ملل
                  </button>
                  {countryOptions.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => { setSelectedCountryId(c.id); setCurrentPage(1); }} 
                      className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-xl border-2 transition-all flex-shrink-0 overflow-hidden ${selectedCountryId === c.id ? 'border-indigo-600 scale-110 shadow-lg' : 'border-slate-100 hover:border-slate-300'}`}
                      title={c.label}
                    >
                      <CountryFlag country={c} />
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => scrollFlags('left')}
                  className="absolute left-0 z-20 p-2 sm:p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-slate-100 text-indigo-600 hover:bg-white transition-all flex items-center justify-center"
                >
                  <ChevronLeft size={18} sm:size={20} strokeWidth={3} />
                </button>
              </div>
            )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto [@media(orientation:landscape)_and_(max-height:500px)]:overflow-visible px-4 sm:px-10 pb-20 no-scrollbar">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 space-y-6 sm:space-y-10">
              {!filteredDishes.length && <div role="status" className="rounded-3xl bg-white p-6 text-center ring-1 ring-[#276556]/15 sm:p-10"><Search className="mx-auto mb-3 text-[#276556]" size={28}/><h2 className="text-lg font-black text-slate-800">{budgetLimit > 0 ? 'غذای قابل محاسبه‌ای در این بودجه پیدا نشد' : 'رسپی‌ای با این ترکیب فیلترها پیدا نشد'}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">{budgetLimit > 0 ? 'برای پیشنهاد بودجه‌ای، قیمت آخرین خرید و تبدیل واحد همهٔ مواد لازم باید ثبت شده باشد. قیمت اقلام را هنگام خرید در انبار وارد کن یا بودجه را افزایش بده.' : 'نام غذا، دسته و کشور را بررسی کن. غذاهای دارای مواد ممنوع یا حساسیت‌زا نیز قابل مشاهده‌اند و روی کارتشان هشدار دارند.'}</p><button type="button" onClick={resetFilters} className="mt-4 min-h-11 rounded-xl bg-[#276556] px-5 text-sm font-bold text-white">پاک کردن فیلترهای جست‌وجو</button></div>}
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {paginatedDishes.map(dish => {
                  const estimate = budgetCosts.get(dish.id);
                  const hasFullEstimate = Boolean(estimate && estimate.eligibleRows > 0 && estimate.pricedRows === estimate.eligibleRows && estimate.missingIngredients.length === 0);
                  return <MealCard key={dish.id} plan={{ dayName: CATEGORY_LABELS[dish.category] || 'غذای برتر', dish }} user={user} onUpdateUser={onUpdateUser} estimatedCost={hasFullEstimate ? { amount: estimate!.pricedSubtotal, servings: user.familySize || 4, approximate: estimate!.approximate } : undefined} />;
                })}
              </div>
              
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 sm:gap-6 py-10 sm:py-16 border-t border-slate-100 mt-6 sm:mt-10">
                  <div className="flex items-center gap-2">
                     <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm active:scale-90"><ChevronRight size={20} sm:size={28} /></button>
                     <div className="flex gap-1.5 sm:gap-3 mx-2 sm:mx-4">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum = currentPage;
                          if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                          if (pageNum < 1 || pageNum > totalPages) return null;
                          return (
                            <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-[1.25rem] font-black text-xs sm:text-xl transition-all border-2 ${currentPage === pageNum ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-110' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}>
                              {toPersian(pageNum)}
                            </button>
                          );
                        })}
                     </div>
                     <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm active:scale-90"><ChevronLeft size={20} sm:size={28} /></button>
                  </div>
                  <div className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">صفحه {toPersian(currentPage)} از {toPersian(totalPages)}</div>
                </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default RecipeSearch;
