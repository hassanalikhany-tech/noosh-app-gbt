import { ShoppingItem } from '../types';
import { convertIngredientQuantity, isInventoryIngredientMatch, roundQuantity } from './recipeHelpers';
export interface ShoppingNeed { item: string; amount: number; unit: string; category?: string; estimated?: boolean; unresolved?: boolean }
/** A source is replaced on repeat clicks; different compatible units are added, never overwritten. */
export const mergeShoppingNeeds = (items: ShoppingItem[], needs: ShoppingNeed[], sourceKey: string, sourceLabel: string) => {
  const list = items.filter(item => item.checked || item.sourceKey !== sourceKey).map(item => ({ ...item }));
  for (const need of needs) {
    // Keep each source independently replaceable, and distinguish unresolved requirements.
    const existing = list.find(item => !item.checked && item.sourceKey === sourceKey && item.unresolved === need.unresolved && isInventoryIngredientMatch(item.name, need.item) && item.unit && convertIngredientQuantity(need.amount, need.unit, item.unit, need.item));
    if (existing) {
      const converted = convertIngredientQuantity(need.amount, need.unit, existing.unit!, need.item)!;
      existing.amount = roundQuantity((existing.amount || 0) + converted.amount);
      existing.estimated ||= converted.estimated || need.estimated;
    } else list.push({ id: `shopping-${globalThis.crypto?.randomUUID?.() || Math.random()}`, name: need.item, amount: need.amount, unit: need.unit, category: need.category, checked: false, fromRecipe: sourceLabel, sourceKey, estimated: need.estimated, unresolved: need.unresolved });
  }
  return list;
};
