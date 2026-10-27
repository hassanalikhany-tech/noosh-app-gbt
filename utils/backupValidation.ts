import { CATEGORY_LABELS, UserProfile } from '../types';

const record = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, max = 500) => typeof value === 'string' && value.length <= max;
const nonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const strings = (value: unknown) => Array.isArray(value) && value.length <= 20000 && value.every(item => text(item));
const rows = (value: unknown, check: (item: any) => boolean, max = 20000) => Array.isArray(value) && value.length <= max && value.every(item => record(item) && check(item));

export const validBackupDish = (dish: unknown): boolean => record(dish) && text(dish.id, 180) && text(dish.name, 120) &&
  Object.hasOwn(CATEGORY_LABELS, dish.category) && text(dish.description, 10000) &&
  rows(dish.ingredients, item => text(item.item, 160) && Boolean(item.item.trim()) && nonnegative(item.amount) && text(item.unit, 60), 100) &&
  Array.isArray(dish.recipeSteps) && dish.recipeSteps.length <= 100 && dish.recipeSteps.every((step: unknown) => text(step, 10000));

const validInventoryRow = (row: any) => text(row.id, 180) && text(row.name, 160) && Boolean(row.name.trim()) &&
  nonnegative(row.amount) && text(row.unit, 60) && Boolean(row.unit.trim()) && nonnegative(row.minThreshold) &&
  nonnegative(row.lastUpdated) && (row.minThresholdUnit === undefined || text(row.minThresholdUnit, 60)) &&
  (row.previousIds === undefined || strings(row.previousIds)) &&
  (row.unitWeightGrams === undefined || record(row.unitWeightGrams) && Object.values(row.unitWeightGrams).every(value => nonnegative(value) && Number(value) > 0));

/** Validate every nested value used by the UI before any restore writes occur. */
export const validBackupProfile = (profile: unknown): profile is UserProfile => {
  if (!record(profile) || !Number.isInteger(profile.familySize) || profile.familySize < 1 || profile.familySize > 20) return false;
  for (const key of ['favoriteDishIds', 'blacklistedDishIds', 'dislikedIngredients', 'excludedCategories', 'preferredNatures', 'history']) {
    if (!strings(profile[key])) return false;
  }
  if (!profile.excludedCategories.every((value: string) => Object.hasOwn(CATEGORY_LABELS, value)) || !profile.preferredNatures.every((value: string) => ['hot', 'cold', 'balanced'].includes(value))) return false;
  if (!rows(profile.inventory, validInventoryRow)) return false;
  if (!rows(profile.customShoppingList, row => text(row.id, 180) && text(row.name, 500) && typeof row.checked === 'boolean' && (row.amount === undefined || nonnegative(row.amount)) && (row.unit === undefined || text(row.unit, 60)))) return false;
  for (const key of ['readNotificationIds', 'deletedNotificationIds', 'hiddenGuidanceKeys', 'excludedNationalities']) {
    if (profile[key] !== undefined && !strings(profile[key])) return false;
  }
  if (profile.fullName !== undefined && !text(profile.fullName, 200)) return false;
  if (profile.kitchenMode !== undefined && !['with-inventory', 'without-inventory'].includes(profile.kitchenMode)) return false;
  if (profile.weeklyPlan !== undefined && !rows(profile.weeklyPlan, row => text(row.dayName) && validBackupDish(row.dish) && (row.sideDish === undefined || validBackupDish(row.sideDish)), 31)) return false;
  if (profile.cookingTransactions !== undefined && !rows(profile.cookingTransactions, row => text(row.id, 180) && text(row.dishId, 180) && text(row.dishName) && nonnegative(row.servings) && nonnegative(row.createdAt) &&
    (row.reversedAt === undefined || nonnegative(row.reversedAt)) && (row.notes === undefined || strings(row.notes)) &&
    rows(row.changes, change => text(change.inventoryId, 180) && text(change.name) && text(change.unit, 60) && nonnegative(change.consumed) && nonnegative(change.before) && nonnegative(change.after) && typeof change.estimated === 'boolean' && text(change.reason, 10000) && (change.stockSnapshot === undefined || record(change.stockSnapshot) && validInventoryRow(change.stockSnapshot))))) return false;
  return true;
};
