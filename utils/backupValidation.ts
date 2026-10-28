import { CATEGORY_LABELS, InventoryBatch, UserProfile } from '../types';

const record = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, max = 500) => typeof value === 'string' && value.length <= max;
const nonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const strings = (value: unknown) => Array.isArray(value) && value.length <= 20000 && value.every(item => text(item));
const validDateOnly = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
const validBatch = (row: any) => text(row.id, 180) && nonnegative(row.amount) && row.amount > 0 && nonnegative(row.receivedAt) && (row.expiresOn === undefined || validDateOnly(row.expiresOn));
const rows = (value: unknown, check: (item: any) => boolean, max = 20000) => Array.isArray(value) && value.length <= max && value.every(item => record(item) && check(item));

export const validBackupDish = (dish: unknown): boolean => record(dish) && text(dish.id, 180) && text(dish.name, 120) &&
  Object.hasOwn(CATEGORY_LABELS, dish.category) && text(dish.description, 10000) &&
  rows(dish.ingredients, item => text(item.item, 160) && Boolean(item.item.trim()) && nonnegative(item.amount) && text(item.unit, 60), 100) &&
  Array.isArray(dish.recipeSteps) && dish.recipeSteps.length <= 100 && dish.recipeSteps.every((step: unknown) => text(step, 10000));

const validInventoryRow = (row: any) => text(row.id, 180) && text(row.name, 160) && Boolean(row.name.trim()) &&
  nonnegative(row.amount) && text(row.unit, 60) && Boolean(row.unit.trim()) && nonnegative(row.minThreshold) &&
  nonnegative(row.lastUpdated) && (row.minThresholdUnit === undefined || text(row.minThresholdUnit, 60)) &&
  (row.previousIds === undefined || strings(row.previousIds)) &&
  (row.unitWeightGrams === undefined || record(row.unitWeightGrams) && Object.values(row.unitWeightGrams).every(value => nonnegative(value) && Number(value) > 0)) &&
  (row.stockBatches === undefined || rows(row.stockBatches, validBatch, 1000) && Math.abs(row.stockBatches.reduce((sum: number, batch: InventoryBatch) => sum + batch.amount, 0) - row.amount) <= Math.max(0.001, row.amount * 1e-7));

/** Validate every nested value used by the UI before any restore writes occur. */
export const validBackupProfile = (profile: unknown): profile is UserProfile => {
  if (!record(profile) || !Number.isInteger(profile.familySize) || profile.familySize < 1 || profile.familySize > 20) return false;
  for (const key of ['favoriteDishIds', 'blacklistedDishIds', 'dislikedIngredients', 'excludedCategories', 'preferredNatures', 'history']) {
    if (!strings(profile[key])) return false;
  }
  if (!profile.excludedCategories.every((value: string) => Object.hasOwn(CATEGORY_LABELS, value)) || !profile.preferredNatures.every((value: string) => ['hot', 'cold', 'balanced'].includes(value))) return false;
  if (!rows(profile.inventory, validInventoryRow)) return false;
  if (profile.ingredientPrices !== undefined && (!record(profile.ingredientPrices) || Object.entries(profile.ingredientPrices).length > 5000 || !Object.entries(profile.ingredientPrices).every(([key, value]) => text(key, 200) && record(value) && text(value.ingredientId, 200) && text(value.name, 160) && nonnegative(value.quantity) && value.quantity > 0 && text(value.unit, 60) && nonnegative(value.totalPrice) && value.totalPrice > 0 && nonnegative(value.updatedAt)))) return false;
  if (profile.recipeReviews !== undefined && (!record(profile.recipeReviews) || Object.entries(profile.recipeReviews).length > 20000 || !Object.entries(profile.recipeReviews).every(([key, value]) => text(key, 180) && record(value) && (value.rating === undefined || Number.isInteger(value.rating) && value.rating >= 1 && value.rating <= 5) && (value.note === undefined || text(value.note, 2000)) && nonnegative(value.updatedAt)))) return false;
  if (!rows(profile.customShoppingList, row => text(row.id, 180) && text(row.name, 500) && typeof row.checked === 'boolean' && (row.amount === undefined || nonnegative(row.amount)) && (row.unit === undefined || text(row.unit, 60)))) return false;
  for (const key of ['readNotificationIds', 'deletedNotificationIds', 'hiddenGuidanceKeys', 'excludedNationalities']) {
    if (profile[key] !== undefined && !strings(profile[key])) return false;
  }
  if (profile.fullName !== undefined && !text(profile.fullName, 200)) return false;
  if (profile.kitchenMode !== undefined && !['with-inventory', 'without-inventory'].includes(profile.kitchenMode)) return false;
  if (profile.weeklyPlan !== undefined && !rows(profile.weeklyPlan, row => text(row.dayName) && validBackupDish(row.dish) && (row.sideDish === undefined || validBackupDish(row.sideDish)), 31)) return false;
  if (profile.cookingTransactions !== undefined && !rows(profile.cookingTransactions, row => text(row.id, 180) && text(row.dishId, 180) && text(row.dishName) && nonnegative(row.servings) && nonnegative(row.createdAt) &&
    (row.reversedAt === undefined || nonnegative(row.reversedAt)) && (row.notes === undefined || strings(row.notes)) &&
    rows(row.changes, change => text(change.inventoryId, 180) && text(change.name) && text(change.unit, 60) && nonnegative(change.consumed) && nonnegative(change.before) && nonnegative(change.after) && typeof change.estimated === 'boolean' && text(change.reason, 10000) && (change.stockSnapshot === undefined || record(change.stockSnapshot) && validInventoryRow(change.stockSnapshot)) && (change.batchDeductions === undefined || rows(change.batchDeductions, validBatch, 1000))))) return false;
  return true;
};
