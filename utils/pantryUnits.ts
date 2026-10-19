import PANTRY_UNIT_PREFERENCES from '../data/pantry_unit_preferences.json';
import { getBaseIngredientName, getIngredientCategoryId } from '../data/pantry';
import { normalizeItemName, normalizeUnit, getIngredientIdentity } from './recipeHelpers';

export const PANTRY_UNIT_OPTIONS = [
  'کیلوگرم', 'گرم', 'عدد', 'بسته', 'قوطی', 'لیتر', 'میلی‌لیتر', 'پیمانه', 'استکان', 'لیوان',
  'قاشق غذاخوری', 'قاشق مرباخوری', 'قاشق چایخوری', 'حبه', 'تکه', 'شاخه', 'ورق', 'حلقه', 'دانه'
];

export const getPantryUnitKey = (name: string) => {
  return getIngredientIdentity(name);
};

export const getPantryUnitPreference = (name: string): string | undefined => {
  const units = (PANTRY_UNIT_PREFERENCES as { units?: Record<string, string> }).units || {};
  const key = getPantryUnitKey(name);
  return units[key] ? normalizeUnit(units[key]) : undefined;
};

export const suggestPantryUnit = (name: string): string => {
  const saved = getPantryUnitPreference(name);
  if (saved) return saved;
  const category = getIngredientCategoryId(name);
  if (category === 'proteins' && /تخممرغ/.test(getPantryUnitKey(name))) return 'عدد';
  if (category === 'proteins' || category === 'grains' || category === 'vegetables') return 'کیلوگرم';
  if (/^(آب|شیر|دوغ|آبلیمو|آبغوره|سرکه|روغن)/.test(getPantryUnitKey(name))) return 'لیتر';
  if (/^(تنماهی|کنسرو|ربگوجه)/.test(getPantryUnitKey(name))) return 'قوطی';
  return 'گرم';
};
