
import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Clock, Flame, Info, Utensils, ChefHat, Globe, Activity, ShieldCheck, Sun, Snowflake, Scale, AlertTriangle } from 'lucide-react';
import { Dish, DishCategory, CATEGORY_LABELS, Ingredient, NatureType } from '../../types';
import { PANTRY_ITEMS } from '../../data/pantry';
import { PANTRY_UNIT_OPTIONS } from '../../utils/pantryUnits';
import { convertIngredientQuantity, getIngredientIdentity, parseQuantity } from '../../utils/recipeHelpers';
import { RecipeService } from '../../services/recipeService';

interface DishEditorProps {
  dish: Dish;
  onClose: () => void;
  onSave: () => void;
}

const DishEditor: React.FC<DishEditorProps> = ({ dish, onClose, onSave }) => {
  const [formData, setFormData] = useState<Dish>({ ...dish });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingUnits, setPendingUnits] = useState<number[]>([]);

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
    const previous = newIngredients[index];
    newIngredients[index] = { ...previous, [field]: value };
    if (field === 'item') newIngredients[index].ingredientId = undefined;
    if (field === 'amount') setPendingUnits(current => current.filter(i => i !== index));
    if (field === 'unit') {
      const converted = convertIngredientQuantity(previous.amount, previous.unit, String(value), previous.item);
      if (converted && !converted.estimated) { newIngredients[index].amount = converted.amount; setPendingUnits(current => current.filter(i => i !== index)); }
      else setPendingUnits(current => [...new Set([...current,index])]);
    }

    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { item: '', amount: 0, unit: 'واحد' }]
    }));
  };

  const removeIngredient = (index: number) => {
    setPendingUnits(current => current.filter(i => i !== index).map(i => i > index ? i-1 : i));
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
    setError('');
    if (pendingUnits.length) { setError('برای واحدهای تغییرکردهٔ بدون تبدیل قطعی، مقدار واقعی جدید را هم وارد کن.'); return; }
    if (!Number.isFinite(Number(formData.servings)) || Number(formData.servings) <= 0 || formData.ingredients.some(ingredient => !ingredient.item.trim() || !Number.isFinite(parseQuantity(ingredient.amount)))) { setError('نام مواد، مقدارهای غیرمنفی و تعداد نفرات پایه را بررسی کن.'); return; }
    setIsSaving(true);
    try {
      const rawBasisDish = { ...formData, ingredients: formData.ingredients.map(ingredient => ({ ...ingredient, state: 'raw' as const })) };
      const success = await RecipeService.updateDish(formData.id, rawBasisDish);
      if (success) {
        onSave();
        onClose();
      } else {
        setError("تغییر در GitHub ثبت نشد؛ پیش‌نویس این دستگاه باقی است. اتصال انتشار را بررسی کن.");
      }
    } catch (error) {
      setError("ذخیرهٔ این غذا با خطا روبه‌رو شد.");
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
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-800">{error}</p>}
          <label className="block text-xs font-bold text-slate-700">تعداد نفرات پایهٔ همین رسپی<input type="number" min="1" step="1" value={formData.servings || 4} onChange={e => setFormData(current => ({ ...current, servings: Number(e.target.value) }))} className="mx-3 w-24 rounded-xl border border-slate-200 p-3"/></label>
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Utensils size={18} className="text-teal-600" /> مواد اولیه ({formData.servings || 4} نفره)
              </h3>
              <button onClick={addIngredient} className="flex items-center gap-2 text-teal-600 bg-teal-50 px-4 py-2 rounded-xl text-xs font-black hover:bg-teal-100 transition-all">
                <Plus size={16} /> افزودن ردیف
              </button>
            </div>
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs leading-6 text-emerald-900">مقدار مواد اولیه و کسر از انبار همیشه بر پایهٔ مادهٔ خام است؛ وزن‌کشی بعد از پخت لازم نیست.</p>
            <div className="space-y-3">
              {(formData.ingredients || []).map((ing, idx) => (
                <div key={idx} className="flex flex-wrap gap-2 items-center rounded-xl border border-slate-100 p-3">
                  <input placeholder="نام ماده" value={ing.item} onChange={e => handleIngredientChange(idx, 'item', e.target.value)} className="flex-grow min-w-[150px] px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                  <input type="number" min="0" step="any" aria-label={`مقدار ${ing.item}`} placeholder="مقدار" value={ing.amount} onChange={e => handleIngredientChange(idx, 'amount', parseFloat(e.target.value) || 0)} className="w-20 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-center" />
                  <select aria-label={`واحد ${ing.item}`} value={ing.unit} onChange={e => handleIngredientChange(idx, 'unit', e.target.value)} className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold">{!PANTRY_UNIT_OPTIONS.includes(ing.unit) && ing.unit !== 'به میزان لازم' && <option value={ing.unit}>{ing.unit || 'بدون واحد'}</option>}{[...PANTRY_UNIT_OPTIONS,'به میزان لازم'].map(unit => <option key={unit} value={unit}>{unit}</option>)}</select>
                  <select aria-label={`هویت انباری ${ing.item}`} value={ing.ingredientId || ''} onChange={e => handleIngredientChange(idx,'ingredientId',e.target.value)} className="max-w-52 rounded-xl border border-slate-200 bg-white p-2 text-xs"><option value="">تطبیق بر اساس نام ماده</option>{PANTRY_ITEMS.map(category => <optgroup key={category.id} label={category.title}>{[...new Set(category.items)].map(name => <option key={name} value={getIngredientIdentity(name)}>{name}</option>)}</optgroup>)}</select>
                  {pendingUnits.includes(idx) && <p className="w-full rounded-lg bg-amber-50 p-2 text-xs text-amber-900">تبدیل قطعی نبود؛ مقدار صحیح برای واحد جدید را وارد کن.</p>}
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
            ذخیره و انتشار تغییرات
          </button>
        </div>
      </div>
    </div>
  );
};

export default DishEditor;
