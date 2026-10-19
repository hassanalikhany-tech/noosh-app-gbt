import { Dish } from '../types';
import { convertIngredientQuantity, getIngredientIdentity, getIngredientMeasurementName, normalizeUnit, parseQuantity, ReferenceOverrides, UNIT_CONVERSIONS } from './recipeHelpers';
import { suggestPantryUnit } from './pantryUnits';
export interface QuantityIssue { dishId: string; dishName: string; ingredientIndex: number; item: string; unit: string; level: 'blocked' | 'estimated' | 'unmeasured'; reason: string }
export const auditRecipeQuantities = (dishes: Dish[], units?: Record<string,string>, references?: ReferenceOverrides) => {
  const issues: QuantityIssue[] = [];
  dishes.forEach(dish => dish.ingredients.forEach((ingredient,index) => {
    const amount = parseQuantity(ingredient.amount);
    const unit = normalizeUnit(ingredient.unit || '');
    const measurementName = getIngredientMeasurementName(ingredient);
    const stockUnit = units?.[getIngredientIdentity(measurementName)] || suggestPantryUnit(ingredient.item);
    let level: QuantityIssue['level'] = 'blocked';
    let reason = '';
    if (!Number.isFinite(amount) || amount <= 0 || unit === 'به میزان لازم') { level = 'unmeasured'; reason = 'مصرف واقعی باید هنگام پخت وارد شود؛ مقدار قطعی برای کسر ثبت نشده.'; }
    else if (!ingredient.ingredientId && /\s+(?:یا|و)\s+|[,،/|]/.test(ingredient.item)) reason = 'این ردیف چند ماده یا جایگزین دارد؛ باید به مواد مستقل تفکیک یا مادهٔ مصرفی هنگام پخت انتخاب شود.';
    else if (!UNIT_CONVERSIONS[unit]) reason = `واحد «${ingredient.unit || 'نامشخص'}» تعریف کمّی قابل‌اعتماد ندارد.`;
    else {
      const converted = convertIngredientQuantity(amount, ingredient.unit, stockUnit, measurementName, measurementName, references);
      if (!converted) reason = `برای تبدیل ${ingredient.unit} به ${stockUnit} مرجع ویژهٔ این ماده/اندازه موجود نیست.`;
      else if (converted.estimated) { level = 'estimated'; reason = converted.reason; }
    }
    if (reason) issues.push({ dishId: dish.id, dishName: dish.name, ingredientIndex:index, item: ingredient.item, unit: ingredient.unit, level, reason });
  }));
  return issues;
};
