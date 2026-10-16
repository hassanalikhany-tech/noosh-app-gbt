
import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, RefreshCw, Search, CheckCircle2, AlertTriangle, Wand2, Loader2, Save, X, ChevronLeft, BookOpen, Scale, Info } from 'lucide-react';
import { RecipeService } from '../../services/recipeService';
import { AiRecipeService } from '../../services/aiRecipeService';
import { Dish, Ingredient } from '../../types';

const AiRecipeEnhancer: React.FC = () => {
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [weakDishes, setWeakDishes] = useState<Dish[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [enhancedDish, setEnhancedDish] = useState<Dish | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const loadData = async (forceSync = false) => {
    setIsLoading(true);
    try {
      if (forceSync) {
        await RecipeService.syncFromCloud(true);
      }
      
      let dishes = RecipeService.getAllDishes();
      if (dishes.length === 0 && !forceSync) {
        await RecipeService.syncFromCloud(false);
        dishes = RecipeService.getAllDishes();
      }
      
      setAllDishes(dishes);
      
      // Identify weak dishes: 
      // 1. Ingredients with amount 0 or 1 and unit "واحد" or empty (excluding "به میزان لازم")
      // 2. Very few ingredients (less than 3)
      // 3. Very few recipe steps (less than 2)
      const weak = dishes.filter(d => {
        const hasWeakIngredients = d.ingredients.some(ing => {
          // If it's "to taste" (به میزان لازم), it's not weak even if amount is 0
          if (ing.unit === 'به میزان لازم') return false;
          
          return !ing.amount || 
                 (ing.amount <= 1 && (ing.unit === 'واحد' || !ing.unit));
        });
        const hasFewIngredients = d.ingredients.length < 3;
        const hasFewSteps = d.recipeSteps.length < 2;
        return hasWeakIngredients || hasFewIngredients || hasFewSteps;
      });
      
      setWeakDishes(weak);
    } catch (error) {
      console.error('Error loading dishes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnhance = async (dish: Dish) => {
    setProcessingId(dish.id);
    try {
      const result = await AiRecipeService.enhanceRecipe(dish);
      if (result) {
        setEnhancedDish(result);
      }
    } catch (error) {
      console.error('Error enhancing dish:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveEnhanced = async () => {
    if (!enhancedDish) return;
    
    setIsLoading(true);
    try {
      const success = await RecipeService.updateDish(enhancedDish.id, enhancedDish);
      if (success) {
        const savedId = enhancedDish.id;
        const savedDish = { ...enhancedDish };
        
        // Close the preview modal
        setEnhancedDish(null);
        
        // Update local state immediately for better UX
        setWeakDishes(prev => prev.filter(d => d.id !== savedId));
        setAllDishes(prev => prev.map(d => d.id === savedId ? savedDish : d));
        
        // Optional: still call loadData to ensure everything is perfectly in sync with criteria
        // but we've already removed it from the visible list above.
      }
    } catch (error) {
      console.error('Error saving enhanced dish:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [batchComplete, setBatchComplete] = useState(false);
  const [batchStopped, setBatchStopped] = useState(false);
  const [shouldStopBatch, setShouldStopBatch] = useState(false);
  const stopBatchRef = React.useRef(false);

  const handleBatchFix = async () => {
    if (weakDishes.length === 0) return;
    setShowBatchConfirm(true);
  };

  const executeBatchFix = async () => {
    setShowBatchConfirm(false);
    setIsBatchProcessing(true);
    setShouldStopBatch(false);
    stopBatchRef.current = false;
    setBatchProgress({ current: 0, total: weakDishes.length });
    
    const updates = [];
    for (let i = 0; i < weakDishes.length; i++) {
      // Check if user requested to stop via ref
      if (stopBatchRef.current) break;

      const dish = weakDishes[i];
      setBatchProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        const enhanced = await AiRecipeService.enhanceRecipe(dish);
        if (enhanced) {
          updates.push({ id: dish.id, data: enhanced });
        }
      } catch (e) {
        console.error(`Failed to enhance ${dish.name}:`, e);
      }
      
      // Check again before saving to be safe
      if (stopBatchRef.current) break;

      // Process in small batches to avoid hitting limits or losing progress
      if (updates.length >= 5) {
        await RecipeService.updateDishesBatch(updates);
        updates.length = 0;
      }
    }
    
    // Save any remaining updates before finishing or stopping
    if (updates.length > 0) {
      await RecipeService.updateDishesBatch(updates);
    }
    
    setIsBatchProcessing(false);
    await loadData();
    
    if (stopBatchRef.current) {
      setBatchStopped(true);
      setTimeout(() => setBatchStopped(false), 5000);
    } else {
      setBatchComplete(true);
      setTimeout(() => setBatchComplete(false), 5000);
    }
    
    setShouldStopBatch(false);
    stopBatchRef.current = false;
  };

  const filteredWeakDishes = useMemo(() => {
    return weakDishes.filter(d => d.name.includes(searchTerm));
  }, [weakDishes, searchTerm]);

  const toPersian = (n: number | string) => n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  return (
    <div className="space-y-6 font-sans dir-rtl text-right">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 bg-indigo-600 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Sparkles size={32} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black leading-none">بهینه‌ساز هوشمند رسپی‌ها</h2>
              <span className="text-[10px] opacity-80 font-bold mt-1 uppercase tracking-widest">AI Recipe Enhancer</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => loadData(true)}
              disabled={isLoading || isBatchProcessing}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 font-black text-xs flex items-center gap-2 transition-all"
            >
              {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              بروزرسانی و اسکن
            </button>
            <button 
              onClick={handleBatchFix}
              disabled={isLoading || isBatchProcessing || weakDishes.length === 0}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg"
            >
              {isBatchProcessing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              اصلاح خودکار همه ({toPersian(weakDishes.length)})
            </button>
          </div>
        </div>

        {isBatchProcessing && (
          <div className="p-6 bg-indigo-50 border-b">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-indigo-600">در حال اصلاح رسپی‌ها با هوش مصنوعی...</span>
                {shouldStopBatch && (
                  <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black animate-pulse">
                    در حال توقف پس از اتمام مورد فعلی...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-indigo-600">{toPersian(batchProgress.current)} از {toPersian(batchProgress.total)}</span>
                <button 
                  onClick={() => {
                    setShouldStopBatch(true);
                    stopBatchRef.current = true;
                  }}
                  disabled={shouldStopBatch}
                  className="px-3 py-1 bg-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg font-black text-[10px] transition-all flex items-center gap-1"
                >
                  <X size={12} />
                  توقف عملیات
                </button>
              </div>
            </div>
            <div className="w-full h-3 bg-indigo-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <input 
              placeholder="جستجوی رسپی‌های ضعیف..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full px-6 py-3 bg-white border rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm pr-12" 
            />
            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"/>
          </div>
          <div className="text-xs font-black text-slate-400">
            رسپی‌های نیازمند اصلاح: {toPersian(weakDishes.length)}
          </div>
        </div>

        <div className="p-6">
          {isLoading && !isBatchProcessing ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw size={48} className="text-indigo-500 animate-spin" />
              <p className="font-black text-slate-400">در حال تحلیل پایگاه داده...</p>
            </div>
          ) : filteredWeakDishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-6 bg-emerald-50 text-emerald-500 rounded-full">
                <CheckCircle2 size={64} />
              </div>
              <p className="font-black text-slate-800 text-xl">تمام رسپی‌ها کامل هستند!</p>
              <p className="text-slate-400 font-bold">هیچ رسپی ضعیفی در سیستم یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredWeakDishes.map((dish) => (
                <div key={dish.id} className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-800">{dish.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                          {toPersian(dish.ingredients.length)} ماده اولیه
                        </span>
                        {dish.ingredients.some(ing => !ing.amount || ing.unit === 'واحد') && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md flex items-center gap-1">
                            <AlertTriangle size={10} /> مقادیر نامشخص
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleEnhance(dish)}
                    disabled={processingId === dish.id || isBatchProcessing}
                    className="px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl font-black text-sm flex items-center gap-2 transition-all"
                  >
                    {processingId === dish.id ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    اصلاح با هوش مصنوعی
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Batch Completion Notification */}
      {batchComplete && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1100] bg-emerald-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={24} />
          <span className="font-black">اصلاح دسته‌جمعی با موفقیت انجام شد!</span>
        </div>
      )}

      {/* Batch Stopped Notification */}
      {batchStopped && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1100] bg-amber-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-bounce">
          <AlertTriangle size={24} />
          <span className="font-black">عملیات متوقف شد. رسپی‌های باقی‌مانده در لیست ماندند.</span>
        </div>
      )}

      {/* Batch Confirmation Modal */}
      {showBatchConfirm && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-enter">
          <div className="w-full max-w-md bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800">تایید اصلاح خودکار</h3>
              <p className="text-sm text-slate-500 font-bold leading-relaxed">
                آیا از اصلاح خودکار {toPersian(weakDishes.length)} رسپی اطمینان دارید؟ 
                این عملیات ممکن است چند دقیقه طول بکشد و از هوش مصنوعی استفاده می‌کند.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={executeBatchFix}
                className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg hover:bg-amber-600 transition-all"
              >
                بله، شروع شود
              </button>
              <button 
                onClick={() => setShowBatchConfirm(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {enhancedDish && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-enter">
          <div className="w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white/20 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Sparkles size={28} />
                <h3 className="text-xl font-black">پیش‌نمایش رسپی اصلاح شده</h3>
              </div>
              <button onClick={() => setEnhancedDish(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-black text-indigo-600 flex items-center gap-2 border-b pb-2">
                    <Info size={18} /> اطلاعات کلی
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-slate-800">{enhancedDish.name}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{enhancedDish.description}</p>
                    <div className="flex gap-4 mt-4">
                      <div className="bg-slate-50 p-3 rounded-2xl flex-1 text-center">
                        <span className="block text-[10px] text-slate-400 font-black">زمان پخت</span>
                        <span className="font-black text-slate-800">{toPersian(enhancedDish.cookTime || 0)} دقیقه</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl flex-1 text-center">
                        <span className="block text-[10px] text-slate-400 font-black">کالری</span>
                        <span className="font-black text-slate-800">{toPersian(enhancedDish.calories || 0)} kcal</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-indigo-600 flex items-center gap-2 border-b pb-2">
                    <Scale size={18} /> مواد اولیه (برای ۴ نفر)
                  </h4>
                  <div className="space-y-2">
                    {enhancedDish.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                        <span className="font-bold text-sm text-slate-700">{ing.item}</span>
                        <span className="font-black text-sm text-indigo-600">{toPersian(ing.amount)} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-indigo-600 flex items-center gap-2 border-b pb-2">
                  <BookOpen size={18} /> مراحل پخت
                </h4>
                <div className="space-y-3">
                  {enhancedDish.recipeSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0">
                        {toPersian(idx + 1)}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex gap-4">
              <button 
                onClick={handleSaveEnhanced}
                disabled={isLoading}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                تایید و ذخیره در دیتابیس
              </button>
              <button 
                onClick={() => setEnhancedDish(null)}
                className="flex-1 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black hover:bg-slate-50 transition-all"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-8">
        <h3 className="font-black text-indigo-800 mb-4 flex items-center gap-2">
          <Info size={20} /> راهنمای بهینه‌سازی
        </h3>
        <ul className="space-y-3 text-sm text-indigo-700 font-bold list-disc list-inside">
          <li>هوش مصنوعی رسپی‌ها را بر اساس استانداردهای آشپزی برای ۴ نفر تنظیم می‌کند.</li>
          <li>تمام واحدهای نامشخص (مانند "واحد") به واحدهای دقیق (گرم، پیمانه و ...) تبدیل می‌شوند.</li>
          <li>در صورت کم بودن مراحل پخت، هوش مصنوعی توضیحات کامل‌تری ارائه می‌دهد.</li>
          <li>قبل از ذخیره نهایی، می‌توانید تغییرات را مشاهده و بررسی کنید.</li>
        </ul>
      </div>
    </div>
  );
};

export default AiRecipeEnhancer;
