import { normalizePersian } from '../utils/text';

import { Search, Database, ChevronRight, ChevronLeft, LayoutList, MapPin, BarChart3, X } from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dish, DishCategory, CATEGORY_LABELS, UserProfile } from '../types';
import { RecipeService } from '../services/recipeService';
import { getCountryCode, getCountryCodes, isDishProhibited } from '../utils/recipeHelpers';
import MealCard from './MealCard';

interface RecipeSearchProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  externalSearchTerm?: string;
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

const RecipeSearch: React.FC<RecipeSearchProps> = ({ user, onUpdateUser, externalSearchTerm = '' }) => {
  const [selectedCategory, setSelectedCategory] = useState<DishCategory | 'all'>('all');
  const [selectedCountryId, setSelectedCountryId] = useState<string | 'all'>('all');
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(externalSearchTerm);
  
  useEffect(() => { setSearchTerm(externalSearchTerm); setCurrentPage(1); }, [externalSearchTerm]);
  useEffect(() => { setCurrentPage(1); }, [allDishes, selectedCategory, selectedCountryId, user.dislikedIngredients]);

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

  const filteredDishes = useMemo(() => {
    return allDishes.filter(dish => {
      const name = dish.name || "";
      const searchable = normalizePersian([name, dish.description, ...dish.ingredients.map(i => i.item)].join(' '));
      const matchesSearch = normalizePersian(searchTerm).split(' ').filter(Boolean).every(word => searchable.includes(word));
      if (!matchesSearch) return false;
      
      if (selectedCategory !== 'all' && dish.category !== selectedCategory) return false;
      
      if (selectedCategory === 'international' && selectedCountryId !== 'all') {
        const country = countryOptions.find(c => c.id === selectedCountryId);
        if (!getCountryCodes(dish.nationality || '').includes(selectedCountryId) && !country?.matches.some(match => normalizePersian(dish.nationality || '').includes(normalizePersian(match)))) return false;
      }

      // Filter prohibited ingredients
      if (isDishProhibited(dish, user)) return false;

      return true;
    });
  }, [searchTerm, selectedCategory, selectedCountryId, allDishes, countryOptions, user.dislikedIngredients]);

  const totalPages = Math.ceil(filteredDishes.length / ITEMS_PER_PAGE);
  const paginatedDishes = filteredDishes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
                type="text" 
                aria-label="جستجوی نام غذا یا مواد اولیه" placeholder="جستجوی نام غذا یا مواد اولیه…" 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full px-10 sm:px-16 py-2.5 sm:py-5 bg-white border-2 border-slate-300 rounded-xl sm:rounded-[1.75rem] outline-none focus:border-teal-500 transition-all font-black text-xs sm:text-lg text-slate-800 shadow-md"
              />
              <Search className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500" size={18} sm:size={28} />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-slate-200 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-500 transition-all"><X size={14} sm:size={20}/></button>
              )}
           </div>

           <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => { setSelectedCategory('all'); setSelectedCountryId('all'); setCurrentPage(1); }} 
                className={`px-3 py-2 sm:px-6 sm:py-3.5 rounded-lg sm:rounded-2xl text-[9px] sm:text-sm font-black border transition-all whitespace-nowrap ${selectedCategory === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white/80 text-slate-500 border-transparent hover:border-slate-200'}`}
              >
                 همه غذاها
              </button>
              {(Object.keys(CATEGORY_LABELS) as DishCategory[]).map(cat => (
                <button 
                  key={cat} 
                  onClick={() => { setSelectedCategory(cat); setSelectedCountryId('all'); setCurrentPage(1); }} 
                  className={`px-3 py-2 sm:px-6 sm:py-3.5 rounded-lg sm:rounded-2xl text-[9px] sm:text-sm font-black border transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/80 text-slate-500 border-transparent hover:border-slate-200'}`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}

              <div className="mr-auto flex items-center gap-1.5 sm:gap-3">
                 <div className="flex items-center gap-1.5 sm:gap-3 px-3 py-2 sm:px-6 sm:py-3.5 bg-slate-900 rounded-lg sm:rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
                    <BarChart3 size={14} className="text-teal-400 sm:w-5" />
                    <span className="text-[10px] sm:text-lg font-black text-white font-mono pt-0.5" style={{ direction: 'ltr' }}>
                       {toPersian(allDishes.length)}
                    </span>
                 </div>
              </div>
            </div>

            <div className="catalog-status" aria-live="polite">
              <Database size={17} />
              <span>{`${toPersian(allDishes.length)} غذا در کتابخانهٔ همین دستگاه آماده است.`}</span>
            </div>
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
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {paginatedDishes.map(dish => <MealCard key={dish.id} plan={{ dayName: CATEGORY_LABELS[dish.category] || 'غذای برتر', dish }} user={user} onUpdateUser={onUpdateUser} />)}
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
