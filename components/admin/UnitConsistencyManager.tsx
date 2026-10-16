import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Search, BookOpen, Scale, Edit3, Filter, ChevronLeft } from 'lucide-react';
import { RecipeService } from '../../services/recipeService';
import { checkUnitConsistency, UnitDiscrepancy, normalizeUnit, isIngredientMatch, normalizeItemName } from '../../utils/recipeHelpers';
import { Dish } from '../../types';
import DishEditor from './DishEditor';

const UnitConsistencyManager: React.FC = () => {
  const [discrepancies, setDiscrepancies] = useState<UnitDiscrepancy[]>([]);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitFilters, setSelectedUnitFilters] = useState<Record<string, string | null>>({});
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async (forceSync = false) => {
    setIsLoading(true);
    try {
      if (forceSync) {
        await RecipeService.syncFromCloud(true);
      }
      
      let dishes = RecipeService.getAllDishes();
      
      // If no dishes in cache and not already synced, try to sync once
      if (dishes.length === 0 && !forceSync) {
        await RecipeService.syncFromCloud(false);
        dishes = RecipeService.getAllDishes();
      }
      
      // Automatic standardization for specific items
      const updatesToApply = [];
      const standardizedDishes = [];

      for (const dish of dishes) {
        let hasChanged = false;
        const newIngredients = dish.ingredients.map(ing => {
          // Olive Oil
          if (isIngredientMatch('روغن زیتون', ing.item) || isIngredientMatch('روغنزیتون', ing.item)) {
            if (ing.item !== 'روغن زیتون' || ing.unit !== 'قاشق') {
              hasChanged = true;
              return { ...ing, item: 'روغن زیتون', unit: 'قاشق' };
            }
          }
          // Salt, Pepper, Turmeric
          if (isIngredientMatch('نمک،فلفلوزردچوبه', ing.item) || isIngredientMatch('نمک و فلفل و زردچوبه', ing.item)) {
            if (ing.item !== 'نمک و فلفل و زردچوبه' || ing.unit !== 'به میزان لازم') {
              hasChanged = true;
              return { ...ing, item: 'نمک و فلفل و زردچوبه', unit: 'به میزان لازم', amount: 1 };
            }
          }
          // Ground Walnuts
          if (isIngredientMatch('گردواسیابشده', ing.item) || isIngredientMatch('گردوی آسیاب شده', ing.item)) {
            if (ing.item !== 'گردوی آسیاب شده' || ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, item: 'گردوی آسیاب شده', unit: 'گرم' };
            }
          }
          // Salt and Black Pepper
          if (isIngredientMatch('نمکوفلفلسیاه', ing.item) || isIngredientMatch('نمک و فلفل سیاه', ing.item)) {
            if (ing.item !== 'نمک و فلفل سیاه' || ing.unit !== 'به میزان لازم') {
              hasChanged = true;
              return { ...ing, item: 'نمک و فلفل سیاه', unit: 'به میزان لازم', amount: 1 };
            }
          }
          // Button Mushrooms
          if (isIngredientMatch('قارچدکمهای', ing.item) || isIngredientMatch('قارچ دگمه ای', ing.item)) {
            if (ing.item !== 'قارچ دگمه ای' || ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, item: 'قارچ دگمه ای', unit: 'گرم' };
            }
          }
          // Milk
          if (isIngredientMatch('شیر', ing.item)) {
            if (ing.unit !== 'پیمانه') {
              hasChanged = true;
              return { ...ing, unit: 'پیمانه' };
            }
          }
          // Breakfast Cream
          if (isIngredientMatch('خامهصبحانه', ing.item) || isIngredientMatch('خامه صبحانه', ing.item)) {
            if (ing.item !== 'خامه صبحانه' || ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, item: 'خامه صبحانه', unit: 'گرم' };
            }
          }
          // Chopped Parsley
          if (isIngredientMatch('جعفریخردشده', ing.item) || isIngredientMatch('جعفری خرد شده', ing.item)) {
            if (ing.item !== 'جعفری خرد شده' || ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, item: 'جعفری خرد شده', unit: 'گرم' };
            }
          }
          // Butter
          if (isIngredientMatch('کره', ing.item)) {
            if (ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, unit: 'گرم' };
            }
          }
          // Frying Oil
          if (isIngredientMatch('روغنمخصوصسرخکردنی', ing.item) || isIngredientMatch('روغن مخصوص سرخ کردنی', ing.item)) {
            if (ing.item !== 'روغن مخصوص سرخ کردنی' || ing.unit !== 'به میزان لازم') {
              hasChanged = true;
              return { ...ing, item: 'روغن مخصوص سرخ کردنی', unit: 'به میزان لازم', amount: 1 };
            }
          }
          // Salt
          if (isIngredientMatch('نمک', ing.item) && !ing.item.includes('فلفل')) {
            if (ing.unit !== 'به میزان لازم') {
              hasChanged = true;
              return { ...ing, unit: 'به میزان لازم', amount: 1 };
            }
          }
          // Fresh Dill
          if (isIngredientMatch('شوید تازه', ing.item)) {
            if (ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, unit: 'گرم' };
            }
          }
          // Cinnamon Stick
          if (isIngredientMatch('چوبدارچین', ing.item) || isIngredientMatch('چوب دارچین', ing.item)) {
            if (ing.item !== 'چوب دارچین' || ing.unit !== 'قطعه') {
              hasChanged = true;
              return { ...ing, item: 'چوب دارچین', unit: 'قطعه' };
            }
          }
          // Fresh Lemon Juice
          if (isIngredientMatch('ابلیموترشتازه', ing.item) || isIngredientMatch('ابلیموی ترش و تازه', ing.item)) {
            if (ing.item !== 'ابلیموی ترش و تازه' || ing.unit !== 'قاشق') {
              hasChanged = true;
              return { ...ing, item: 'ابلیموی ترش و تازه', unit: 'قاشق' };
            }
          }
          // Minced Meat
          if (isIngredientMatch('گوشتچرخکرده', ing.item) || isIngredientMatch('گوشت چرخ کرده', ing.item)) {
            if (ing.item !== 'گوشت چرخ کرده' || ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, item: 'گوشت چرخ کرده', unit: 'گرم' };
            }
          }
          // Black Pepper and Salt
          if (isIngredientMatch('فلفلسیاهونمک', ing.item) || isIngredientMatch('فلفل سیاه و نمک', ing.item)) {
            if (ing.item !== 'فلفل سیاه و نمک' || ing.unit !== 'به میزان لازم') {
              hasChanged = true;
              return { ...ing, item: 'فلفل سیاه و نمک', unit: 'به میزان لازم', amount: 1 };
            }
          }
          // Dissolved Tamarind
          if (isIngredientMatch('تمرهندیحلشده', ing.item) || isIngredientMatch('تمر هندی حل شده', ing.item)) {
            if (ing.item !== 'تمر هندی حل شده' || ing.unit !== 'بسته') {
              hasChanged = true;
              return { ...ing, item: 'تمر هندی حل شده', unit: 'بسته' };
            }
          }
          // Split Peas (Lapeh)
          if (isIngredientMatch('لپه', ing.item)) {
            if (ing.unit !== 'پیمانه') {
              hasChanged = true;
              return { ...ing, unit: 'پیمانه' };
            }
          }
          // Pomegranate Paste
          if (isIngredientMatch('ربانار', ing.item) || isIngredientMatch('رب انار', ing.item)) {
            if (ing.item !== 'رب انار' || ing.unit !== 'قاشق') {
              hasChanged = true;
              return { ...ing, item: 'رب انار', unit: 'قاشق' };
            }
          }
          // Salt, Black Pepper, Turmeric
          if (isIngredientMatch('نمک،فلفلسیاهوزردچوبه', ing.item) || isIngredientMatch('نمک و فلفل سیاه و زرد چوبه', ing.item)) {
            if (ing.item !== 'نمک و فلفل سیاه و زرد چوبه' || ing.unit !== 'به میزان لازم') {
              hasChanged = true;
              return { ...ing, item: 'نمک و فلفل سیاه و زرد چوبه', unit: 'به میزان لازم', amount: 1 };
            }
          }
          // Liquid Oil
          if (isIngredientMatch('روغنمایع', ing.item) || isIngredientMatch('روغن مایع', ing.item)) {
            if (ing.item !== 'روغن مایع' || ing.unit !== 'به میزان لازم') {
              hasChanged = true;
              return { ...ing, item: 'روغن مایع', unit: 'به میزان لازم', amount: 1 };
            }
          }
          // Raisins (Keshmesh Poloyi)
          if (isIngredientMatch('کشمشپلویی', ing.item) || isIngredientMatch('کشمش پلویی', ing.item)) {
            if (ing.item !== 'کشمش پلویی' || ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, item: 'کشمش پلویی', unit: 'گرم' };
            }
          }
          // Stew Meat
          if (isIngredientMatch('گوشتخورشتی', ing.item) || isIngredientMatch('گوشت خورشتی', ing.item)) {
            if (ing.item !== 'گوشت خورشتی' || ing.unit !== 'گرم') {
              hasChanged = true;
              return { ...ing, item: 'گوشت خورشتی', unit: 'گرم' };
            }
          }
          // Sumac
          if (isIngredientMatch('سماق', ing.item)) {
            if (ing.unit !== 'قاشق') {
              hasChanged = true;
              return { ...ing, unit: 'قاشق' };
            }
          }
          // Chickpea Flour
          if (isIngredientMatch('اردنخودچی', ing.item) || isIngredientMatch('آرد نخودچی', ing.item)) {
            if (ing.item !== 'آرد نخودچی' || ing.unit !== 'قاشق') {
              hasChanged = true;
              return { ...ing, item: 'آرد نخودچی', unit: 'قاشق' };
            }
          }
          // Tomato Paste
          if (isIngredientMatch('ربگوجهفرنگی', ing.item) || isIngredientMatch('رب گوجه فرنگی', ing.item)) {
            if (ing.item !== 'رب گوجه فرنگی' || ing.unit !== 'قاشق') {
              hasChanged = true;
              return { ...ing, item: 'رب گوجه فرنگی', unit: 'قاشق' };
            }
          }
          // Onion
          if (isIngredientMatch('پیاز', ing.item)) {
            const rawUnit = ing.unit.trim();
            const normalized = normalizeUnit(rawUnit);
            let newAmount = ing.amount;
            if (rawUnit.includes('گرم') || rawUnit === 'g') newAmount = Math.ceil(ing.amount / 100);
            else if (rawUnit.includes('کیلوگرم') || rawUnit === 'kg') newAmount = Math.ceil(ing.amount * 10);
            
            if (ing.unit !== 'عدد' || ing.amount !== newAmount) {
              hasChanged = true;
              return { ...ing, unit: 'عدد', amount: newAmount };
            }
          }
          // Garlic
          if (isIngredientMatch('سیر', ing.item)) {
            const rawUnit = ing.unit.trim();
            let newAmount = ing.amount;
            if (rawUnit.includes('گرم') || rawUnit === 'g') newAmount = Math.ceil(ing.amount / 10);
            else if (rawUnit.includes('کیلوگرم') || rawUnit === 'kg') newAmount = Math.ceil(ing.amount * 100);
            
            if (ing.unit !== 'حبه' || ing.amount !== newAmount) {
              hasChanged = true;
              return { ...ing, unit: 'حبه', amount: newAmount };
            }
          }
          // Saffron
          if (isIngredientMatch('زعفران دم کرده', ing.item)) {
            if (ing.unit !== 'به میزان لازم') {
              hasChanged = true;
              return { ...ing, unit: 'به میزان لازم', amount: 1 };
            }
          }
          // Chicken Breast
          if (isIngredientMatch('سینه مرغ', ing.item)) {
            const rawUnit = ing.unit.trim();
            const normalized = normalizeUnit(rawUnit);
            let newAmount = ing.amount;
            if (normalized === 'عدد') newAmount = ing.amount * 250;
            else if (rawUnit.includes('کیلوگرم') || rawUnit === 'kg') newAmount = Math.ceil(ing.amount * 1000);
            
            if (ing.unit !== 'گرم' || ing.amount !== newAmount) {
              hasChanged = true;
              return { ...ing, unit: 'گرم', amount: newAmount };
            }
          }
          // Carrot
          if (isIngredientMatch('هویج', ing.item)) {
            const rawUnit = ing.unit.trim();
            const normalized = normalizeUnit(rawUnit);
            let newAmount = ing.amount;
            if (normalized === 'عدد') newAmount = ing.amount * 100;
            else if (rawUnit.includes('کیلوگرم') || rawUnit === 'kg') newAmount = Math.ceil(ing.amount * 1000);
            
            if (ing.unit !== 'گرم' || ing.amount !== newAmount) {
              hasChanged = true;
              return { ...ing, unit: 'گرم', amount: newAmount };
            }
          }
          return ing;
        });

        if (hasChanged) {
          updatesToApply.push({ id: dish.id, data: { ingredients: newIngredients } });
          standardizedDishes.push({ ...dish, ingredients: newIngredients });
        } else {
          standardizedDishes.push(dish);
        }
      }

      if (updatesToApply.length > 0) {
        // Handle large batches by splitting into chunks of 500 (Firestore limit)
        const batchSize = 400;
        for (let i = 0; i < updatesToApply.length; i += batchSize) {
          const chunk = updatesToApply.slice(i, i + batchSize);
          await RecipeService.updateDishesBatch(chunk);
        }
        console.log(`Automatically standardized ${updatesToApply.length} recipes.`);
      }

      setAllDishes(standardizedDishes);
      const results = checkUnitConsistency(standardizedDishes);
      setDiscrepancies(results);
    } catch (error) {
      console.error('Error loading and standardizing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toPersian = (n: number | string) => n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  const filteredDiscrepancies = useMemo(() => {
    return discrepancies.filter(d => 
      d.item.includes(searchTerm) || 
      d.allDishes.some(dish => dish.includes(searchTerm))
    );
  }, [discrepancies, searchTerm]);

  const handleFilterUnit = (item: string, unit: string | null) => {
    setSelectedUnitFilters(prev => ({ ...prev, [item]: unit }));
  };

  const handleEditDishByName = (dishName: string) => {
    const dish = allDishes.find(d => d.name === dishName);
    if (dish) {
      setEditingDish(dish);
    }
  };

  const handleSelectUnit = (item: string, unit: string) => {
    setSelections(prev => ({ ...prev, [item]: unit }));
  };

  const handleBulkStandardize = async () => {
    if (Object.keys(selections).length === 0) {
      alert('لطفاً حداقل یک واحد استاندارد انتخاب کنید.');
      return;
    }
    
    setIsUpdating(true);
    try {
      const dishUpdates: Record<string, Dish> = {};
      
      for (const [itemName, targetUnit] of Object.entries(selections)) {
        const affectedDishes = allDishes.filter(dish => 
          dish.ingredients.some(ing => isIngredientMatch(itemName, ing.item))
        );
        
        affectedDishes.forEach(dish => {
          const currentDish = dishUpdates[dish.id] || JSON.parse(JSON.stringify(dish));
          const newIngredients = currentDish.ingredients.map((ing: any) => {
            if (isIngredientMatch(itemName, ing.item)) {
              return { ...ing, unit: targetUnit };
            }
            return ing;
          });
          dishUpdates[dish.id] = { ...currentDish, ingredients: newIngredients };
        });
      }

      const updates = Object.values(dishUpdates).map(dish => ({
        id: dish.id,
        data: { ingredients: dish.ingredients }
      }));

      const batchSize = 400;
      for (let i = 0; i < updates.length; i += batchSize) {
        const chunk = updates.slice(i, i + batchSize);
        await RecipeService.updateDishesBatch(chunk);
      }

      await loadData();
      setIsBulkMode(false);
      setSelections({});
    } catch (error) {
      console.error('Error bulk standardizing:', error);
      alert('خطا در استانداردسازی دسته‌جمعی');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 font-sans dir-rtl text-right">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 bg-amber-500 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Scale size={32} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black leading-none">بررسی مغایرت واحدها</h2>
              <span className="text-[10px] opacity-80 font-bold mt-1 uppercase tracking-widest">Unit Consistency Checker</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => {
                setIsBulkMode(true);
                setSelections({});
              }}
              disabled={isLoading || discrepancies.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl border border-indigo-400 font-black text-xs flex items-center gap-2 transition-all shadow-lg"
            >
              <Scale size={14} />
              استانداردسازی دسته‌جمعی
            </button>
            <button 
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 font-black text-xs flex items-center gap-2 transition-all"
            >
              {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              بروزرسانی لیست
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <input 
              placeholder="جستجوی نام ماده یا غذا..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full px-6 py-3 bg-white border rounded-2xl outline-none focus:border-amber-500 font-bold text-sm pr-12" 
            />
            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"/>
          </div>
          <div className="text-xs font-black text-slate-400">
            تعداد مغایرت‌ها: {toPersian(filteredDiscrepancies.length)}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw size={48} className="text-amber-500 animate-spin" />
              <p className="font-black text-slate-400">در حال تحلیل رسپی‌ها...</p>
            </div>
          ) : isBulkMode && discrepancies.length > 0 ? (
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => setIsBulkMode(false)}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-sm transition-all"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                  بازگشت به لیست
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-400">
                    تعداد موارد: {toPersian(discrepancies.length)}
                  </span>
                  <button
                    onClick={handleBulkStandardize}
                    disabled={isUpdating || Object.keys(selections).length === 0}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                  >
                    {isUpdating ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    اعمال تمام تغییرات انتخابی
                  </button>
                </div>
              </div>

              <div className="bg-white border-2 border-indigo-100 rounded-[3rem] shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-100">
                        <th className="p-6 font-black text-slate-500 text-sm">ماده غذایی</th>
                        <th className="p-6 font-black text-slate-500 text-sm">واحدهای موجود</th>
                        <th className="p-6 font-black text-slate-500 text-sm">انتخاب واحد استاندارد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {discrepancies.map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                                <Scale size={20} />
                              </div>
                              <div>
                                <div className="font-black text-slate-800">{d.item}</div>
                                <div className="text-[10px] text-slate-400 font-bold">{toPersian(d.allDishes.length)} غذا</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex flex-wrap gap-2">
                              {d.allUnits.map((u, ui) => (
                                <span key={ui} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500">
                                  {u} ({toPersian(d.unitDishMap[u]?.length || 0)})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex flex-wrap gap-2">
                              {d.allUnits.map((u, ui) => (
                                <button
                                  key={ui}
                                  onClick={() => handleSelectUnit(d.item, u)}
                                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border-2 ${
                                    selections[d.item] === u 
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                      : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'
                                  }`}
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : filteredDiscrepancies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-6 bg-emerald-50 text-emerald-500 rounded-full">
                <CheckCircle2 size={64} />
              </div>
              <p className="font-black text-slate-800 text-xl">تبریک! هیچ مغایرتی یافت نشد.</p>
              <p className="text-slate-400 font-bold">تمام واحدها در رسپی‌ها استاندارد هستند.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {filteredDiscrepancies.map((d, i) => {
                const activeUnit = selectedUnitFilters[d.item] || null;
                const visibleDishes = activeUnit ? d.unitDishMap[activeUnit] : d.allDishes;

                return (
                  <div key={i} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                          <AlertTriangle size={28} />
                        </div>
                        <div>
                          <h3 className="font-black text-2xl text-slate-800">{d.item}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ingredient Unit Conflict</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button 
                          onClick={() => handleFilterUnit(d.item, null)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${!activeUnit ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                          همه واحدها
                        </button>
                        {d.allUnits.map((u, ui) => (
                          <button 
                            key={ui}
                            onClick={() => handleFilterUnit(d.item, u)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${activeUnit === u ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'}`}
                          >
                            <Filter size={12} />
                            {u}
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeUnit === u ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {toPersian(d.unitDishMap[u]?.length || 0)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleDishes.map((dishName, di) => (
                        <div key={di} className="group bg-slate-50 hover:bg-white border border-transparent hover:border-indigo-200 rounded-2xl p-4 flex justify-between items-center transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                              <BookOpen size={16} />
                            </div>
                            <span className="font-black text-sm text-slate-700">{dishName}</span>
                          </div>
                          <button 
                            onClick={() => handleEditDishByName(dishName)}
                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="ویرایش رسپی"
                          >
                            <Edit3 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-black">این ماده در {toPersian(d.allUnits.length)} واحد مختلف (وزنی/تعدادی) تعریف شده است.</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold italic">برای استانداردسازی، تمام رسپی‌ها را به یک واحد (مثلاً گرم) تغییر دهید.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingDish && (
        <DishEditor 
          dish={editingDish} 
          onClose={() => setEditingDish(null)} 
          onSave={() => {
            setEditingDish(null);
            loadData();
          }} 
        />
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8">
        <h3 className="font-black text-blue-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} />
          راهنمای استانداردسازی
        </h3>
        <ul className="space-y-3 text-sm text-blue-700 font-bold list-disc list-inside">
          <li>تخم مرغ باید همیشه با واحد "عدد" تعریف شود.</li>
          <li>مواد پودری مانند آرد و شکر بهتر است با واحد "گرم" یا "کیلوگرم" تعریف شوند.</li>
          <li>مایعات باید با واحد "لیتر" یا "میلی‌لیتر" تعریف شوند.</li>
          <li>استفاده از "پیمانه" مجاز است اما سیستم آن را معادل ۱۰۰ گرم در نظر می‌گیرد.</li>
          <li>در صورت وجود مغایرت نوع (مثلاً وزن در مقابل تعداد)، سیستم انبارداری ممکن است دچار خطا شود.</li>
        </ul>
      </div>
    </div>
  );
};

export default UnitConsistencyManager;
