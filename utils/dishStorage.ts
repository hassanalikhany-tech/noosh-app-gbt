
import { Dish } from '../types';

const HIDDEN_DISHES_KEY = 'global_hidden_dish_ids_v1';
const RENAMED_DISHES_KEY = 'renamed_dishes_map_v1';

// متد کمکی برای اطلاع‌رسانی به کل اپلیکیشن
const notifyRecipesUpdate = () => {
  window.dispatchEvent(new CustomEvent('recipes-updated', { detail: { timestamp: Date.now() } }));
};

export const getHiddenDishIds = (): string[] => {
  try {
    const stored = localStorage.getItem(HIDDEN_DISHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading hidden dishes', e);
    return [];
  }
};

export const hideDishIds = (ids: string[]) => {
  try {
    const current = getHiddenDishIds();
    const newSet = new Set([...current, ...ids]);
    const arr = Array.from(newSet);
    localStorage.setItem(HIDDEN_DISHES_KEY, JSON.stringify(arr));
    console.log(`Hidden ${ids.length} dishes. Total hidden: ${arr.length}`);
    notifyRecipesUpdate(); // اطلاع رسانی تغییر
  } catch (e) {
    console.error('Error saving hidden dishes', e);
  }
};

export const unhideAllDishes = () => {
  localStorage.removeItem(HIDDEN_DISHES_KEY);
  console.log('Cleared all hidden dishes');
  notifyRecipesUpdate(); // اطلاع رسانی تغییر
};

export const getRenamedDishes = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(RENAMED_DISHES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Error reading renamed dishes', e);
    return {};
  }
};

export const renameDish = (id: string, newName: string) => {
  try {
    const current = getRenamedDishes();
    current[id] = newName;
    localStorage.setItem(RENAMED_DISHES_KEY, JSON.stringify(current));
    console.log(`Renamed dish ${id} to ${newName}`);
    notifyRecipesUpdate(); // اطلاع رسانی تغییر
  } catch (e) {
    console.error('Error saving renamed dish', e);
  }
};
