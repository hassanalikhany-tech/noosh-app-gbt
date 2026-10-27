import { Dish } from '../types';
import { convertIngredientQuantity, getIngredientIdentity, getIngredientMeasurementName, isUntrackedPantryIngredient, isUnresolvedCompoundIngredient, normalizeUnit, parseQuantity, ReferenceOverrides, splitIngredientAlternatives, UNIT_CONVERSIONS } from './recipeHelpers';
import { suggestPantryUnit } from './pantryUnits';
import { recipeQuantityProblem } from './quantitySanity.mjs';
export interface QuantityIssue { dishId: string; dishName: string; ingredientIndex: number; item: string; unit: string; level: 'blocked' | 'estimated' | 'unmeasured'; reason: string }
export const auditRecipeQuantities = (dishes: Dish[], units?: Record<string,string>, references?: ReferenceOverrides) => {
  const issues: QuantityIssue[] = [];
  dishes.forEach(dish => dish.ingredients.forEach((ingredient,index) => {
    if (isUntrackedPantryIngredient(ingredient.item)) return;
    const trackedAlternatives = splitIngredientAlternatives(ingredient.item).filter(option => !isUntrackedPantryIngredient(option));
    if (trackedAlternatives.length === 0) return;
    const amount = parseQuantity(ingredient.amount);
    const unit = normalizeUnit(ingredient.unit || '');
    const measurementName = getIngredientMeasurementName(ingredient);
    const stockUnit = units?.[getIngredientIdentity(measurementName)] || suggestPantryUnit(ingredient.item);
    let level: QuantityIssue['level'] = 'blocked';
    let reason = '';
    if (recipeQuantityProblem(ingredient, dish.servings || 4)) reason = recipeQuantityProblem(ingredient, dish.servings || 4);
    else if (!Number.isFinite(amount) || amount <= 0 || unit === 'به میزان لازم' || /به\s*(?:میزان|مقدار)\s*لازم|دلخواه/.test(ingredient.item)) { level = 'unmeasured'; reason = 'برای این ماده مقدار قطعی ثبت نشده و مصرف آن خودکار از انبار کسر نمی‌شود.'; }
    else if (!ingredient.ingredientId && trackedAlternatives.length === 1 && splitIngredientAlternatives(ingredient.item).length === 1 && isUnresolvedCompoundIngredient(ingredient.item)) reason = 'این ردیف چند مادهٔ ترکیبی دارد؛ تا تعیین مقدار جداگانهٔ هر ماده، از انبار خودکار کسر نمی‌شود.';
    else if (!UNIT_CONVERSIONS[unit]) reason = `واحد «${ingredient.unit || 'نامشخص'}» تعریف کمّی قابل‌اعتماد ندارد.`;
    else if (splitIngredientAlternatives(ingredient.item).length > 1) {
      const checks = trackedAlternatives.map(option => {
        if (isUntrackedPantryIngredient(option)) return { reason: '', estimated: false };
        const optionMeasurementName = getIngredientMeasurementName({ ...ingredient, item: option });
        const optionUnit = units?.[getIngredientIdentity(optionMeasurementName)] || suggestPantryUnit(option);
        if (!UNIT_CONVERSIONS[optionUnit]) return { reason: `واحد انبارِ گزینهٔ «${option}» نامعتبر است.`, estimated: false };
        const conversion = convertIngredientQuantity(amount, ingredient.unit, optionUnit, option, optionMeasurementName, references);
        return conversion ? { reason: '', estimated: conversion.estimated } : { reason: `گزینهٔ «${option}» از ${ingredient.unit} به ${optionUnit} مرجع تبدیلی ندارد.`, estimated: false };
      });
      const failed = checks.find(check => check.reason);
      if (failed) reason = failed.reason;
      else if (checks.some(check => check.estimated)) { level = 'estimated'; reason = 'یکی از گزینه‌های جایگزین هنگام وجود در انبار با میانگین وزنی تبدیل می‌شود.'; }
    }
    else {
      const converted = convertIngredientQuantity(amount, ingredient.unit, stockUnit, measurementName, measurementName, references);
      if (!converted) reason = `برای تبدیل ${ingredient.unit} به ${stockUnit} مرجع ویژهٔ این ماده/اندازه موجود نیست.`;
      else if (converted.estimated) { level = 'estimated'; reason = converted.reason; }
    }
    if (reason) issues.push({ dishId: dish.id, dishName: dish.name, ingredientIndex:index, item: ingredient.item, unit: ingredient.unit, level, reason });
  }));
  return issues;
};
