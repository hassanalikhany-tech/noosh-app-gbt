
import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Clock, Flame, Info, Utensils, ChefHat, Globe, Activity, ShieldCheck, Sun, Snowflake, Scale, AlertTriangle } from 'lucide-react';
import { Dish, DishCategory, CATEGORY_LABELS, Ingredient, NatureType } from '../../types';
import { RecipeService } from '../../services/recipeService';

interface DishEditorProps {
  dish: Dish;
  onClose: () => void;
  onSave: () => void;
}

const DishEditor: React.FC<DishEditorProps> = ({ dish, onClose, onSave }) => {
  const [formData, setFormData] = useState<Dish>({ ...dish });
  const [isSaving, setIsSaving] = useState(false);

  if (!formData || !formData.id) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white p-8 rounded-[2rem] text-center shadow-2xl">
          <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
          <p className="font-black text-slate-800 mb-6 text-lg">خطا در بارگذاری اطلاعات غذا</p>
          <button onClick={onClose} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all">بستن</button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...(formData.ingredients || [])];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { item: '', amount: 0, unit: 'واحد' }]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...(formData.recipeSteps || [])];
    newSteps[index] = value;
    setFormData(prev => ({ ...prev, recipeSteps: newSteps }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      recipeSteps: [...(prev.recipeSteps || []), '']
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipeSteps: prev.recipeSteps.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await RecipeService.updateDish(formData.id, formData);
      if (success) {
        onSave();
        onClose();
      } else {
        alert("خطا در ذخیره‌سازی اطلاعات در فایربیس.");
      }
    } catch (error) {
      alert("خطای سیستمی در برقراری ارتباط با دیتابیس.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl">
              <ChefHat size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black">{formData.name || 'نامشخص'}</h2>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Database Editor Mode</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* General Information */}
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Info size={16} /> اطلاعات پایه
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 pr-2">نام غذا</label>
                <input name="name" value={formData.name || ''} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 pr-2">دسته‌بندی</label>
                <select name="category" value={formData.category || 'khorak'} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-emerald-500">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-600 pr-2">توضیحات کوتاه</label>
                <textarea name="description" value={formData.description || ''} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-emerald-500 h-24 resize-none" />
              </div>
            </div>
          </section>

          {/* Cooking Details */}
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} /> جزئیات پخت و تغذیه
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 flex items-center gap-1"><Clock size={12}/> زمان (دقیقه)</label>
                <input type="number" name="cookTime" value={formData.cookTime || 0} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 flex items-center gap-1"><Flame size={12}/> کالری</label>
                <input type="number" name="calories" value={formData.calories || 0} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 flex items-center gap-1"><Globe size={12}/> ملیت (کد)</label>
                <input name="nationality" value={formData.nationality || 'ir'} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 flex items-center gap-1"><Activity size={12}/> سختی</label>
                <select name="difficulty" value={formData.difficulty || 'متوسط'} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500">
                  <option value="آسان">آسان</option>
                  <option value="متوسط">متوسط</option>
                  <option value="سخت">سخت</option>
                </select>
              </div>
            </div>
          </section>

          {/* Nature and Mosleh */}
          <section className="space-y-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
              <ShieldCheck size={18} className="text-teal-600" /> مزاج و اصلاحیه
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 pr-2">طبع غذا</label>
                <div className="flex gap-2">
                  {[
                    { id: 'hot', label: 'گرم', icon: Sun, color: 'text-orange-600 bg-orange-50' },
                    { id: 'cold', label: 'سرد', icon: Snowflake, color: 'text-blue-600 bg-blue-50' },
                    { id: 'balanced', label: 'معتدل', icon: Scale, color: 'text-emerald-600 bg-emerald-50' }
                  ].map(n => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, nature: n.id as NatureType, natureLabel: n.label }))}
                      className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${formData.nature === n.id ? 'border-teal-500 bg-teal-50' : 'border-transparent bg-white opacity-60'}`}
                    >
                      <n.icon size={18} className={n.color.split(' ')[0]} />
                      <span className="text-[10px] font-black">{n.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 pr-2">مصلح غذا</label>
                <input name="mosleh" value={formData.mosleh || ''} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:border-emerald-500" placeholder="مثلاً: گردو، نعنا، عسل..." />
              </div>
            </div>
          </section>

          {/* Ingredients */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Utensils size={18} className="text-teal-600" /> مواد اولیه (۴ نفره)
              </h3>
              <button onClick={addIngredient} className="flex items-center gap-2 text-teal-600 bg-teal-50 px-4 py-2 rounded-xl text-xs font-black hover:bg-teal-100 transition-all">
                <Plus size={16} /> افزودن ردیف
              </button>
            </div>
            <div className="space-y-3">
              {(formData.ingredients || []).map((ing, idx) => (
                <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                  <input placeholder="نام ماده" value={ing.item} onChange={e => handleIngredientChange(idx, 'item', e.target.value)} className="flex-grow min-w-[150px] px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                  <input type="number" placeholder="مقدار" value={ing.amount} onChange={e => handleIngredientChange(idx, 'amount', parseFloat(e.target.value) || 0)} className="w-20 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-center" />
                  <input placeholder="واحد" value={ing.unit} onChange={e => handleIngredientChange(idx, 'unit', e.target.value)} className="w-24 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-center" />
                  <button onClick={() => removeIngredient(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                </div>
              ))}
              {(!formData.ingredients || formData.ingredients.length === 0) && (
                <p className="text-center text-slate-400 py-4 text-xs font-bold">هیچ ماده اولیه‌ای ثبت نشده است.</p>
              )}
            </div>
          </section>

          {/* Recipe Steps */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <ChefHat size={18} className="text-orange-600" /> مراحل دستور پخت
              </h3>
              <button onClick={addStep} className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-xl text-xs font-black hover:bg-orange-100 transition-all">
                <Plus size={16} /> افزودن مرحله
              </button>
            </div>
            <div className="space-y-4">
              {(formData.recipeSteps || []).map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center font-black text-xs">{idx + 1}</div>
                  <textarea value={step} onChange={e => handleStepChange(idx, e.target.value)} className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs leading-relaxed h-20 resize-none" />
                  <button onClick={() => removeStep(idx)} className="shrink-0 p-2 text-rose-500 hover:bg-rose-50 rounded-lg h-fit transition-all"><Trash2 size={18}/></button>
                </div>
              ))}
              {(!formData.recipeSteps || formData.recipeSteps.length === 0) && (
                <p className="text-center text-slate-400 py-4 text-xs font-bold">هیچ مرحله‌ای ثبت نشده است.</p>
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-8 py-3.5 bg-white border border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all">انصراف</button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-12 py-3.5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Save size={20} />}
            ذخیره تغییرات در فایربیس
          </button>
        </div>
      </div>
    </div>
  );
};

export default DishEditor;
