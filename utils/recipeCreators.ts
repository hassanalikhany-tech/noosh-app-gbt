import { Dish } from '../types';
import { normalizePersian } from './text';

// Until accounts are available, contributors are grouped by their public name.
export const creatorKey = (name: string) => normalizePersian(name).replace(/\s/g, '');
export const recipeCreatorKey = (dish: Dish) => dish.isPersonal ? 'personal'
  : dish.isCommunityRecipe && dish.creatorName?.trim() ? `creator:${creatorKey(dish.creatorName)}` : 'library';

export const getRecipeCreators = (dishes: Dish[]) => {
  const creators = new Map<string, { key: string; name: string; count: number }>();
  for (const dish of dishes) {
    if (!dish.isCommunityRecipe || !dish.creatorName?.trim() || dish.isPersonal) continue;
    const key = recipeCreatorKey(dish);
    const current = creators.get(key);
    if (current) current.count++;
    else creators.set(key, { key, name: dish.creatorName.trim(), count: 1 });
  }
  return [...creators.values()].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
};

export const showCreatorRecipes = (name: string) => {
  if (name.trim()) window.dispatchEvent(new CustomEvent('show-creator-recipes', { detail: { name: name.trim() } }));
};
