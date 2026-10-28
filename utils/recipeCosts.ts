import { Dish, IngredientPrice } from '../types';
import { convertIngredientQuantity, getIngredientIdentity, normalizeUnit, parseQuantity, splitIngredientAlternatives } from './recipeHelpers';

export interface RecipeCostEstimate {
  pricedSubtotal: number;
  pricedRows: number;
  eligibleRows: number;
  missingIngredients: string[];
  approximate: boolean;
}

export const estimateRecipeCost = (dish: Dish, servings: number, priceBook: Record<string, IngredientPrice> = {}): RecipeCostEstimate => {
  const targetServings = Number.isFinite(servings) && servings > 0 ? servings : dish.servings || 4;
  const baseServings = dish.servings || 4;
  let pricedSubtotal = 0;
  let pricedRows = 0;
  let eligibleRows = 0;
  let approximate = false;
  const missingIngredients: string[] = [];

  for (const ingredient of dish.ingredients || []) {
    const amount = parseQuantity(ingredient.amount) * targetServings / baseServings;
    const recipeUnit = normalizeUnit(ingredient.unit || '');
    if (!Number.isFinite(amount) || amount <= 0 || recipeUnit === 'به میزان لازم') continue;
    eligibleRows++;
    const options = splitIngredientAlternatives(ingredient.item);
    const entry = options.map(option => priceBook[getIngredientIdentity(option)]).find(Boolean) || priceBook[getIngredientIdentity(ingredient.item)];
    if (!entry) { missingIngredients.push(ingredient.item); continue; }
    const converted = convertIngredientQuantity(amount, ingredient.unit, entry.unit, ingredient.item, entry.name);
    if (!converted || !Number.isFinite(entry.quantity) || entry.quantity <= 0) { missingIngredients.push(ingredient.item); continue; }
    pricedSubtotal += converted.amount / entry.quantity * entry.totalPrice;
    pricedRows++;
    approximate ||= converted.estimated;
  }
  return { pricedSubtotal, pricedRows, eligibleRows, missingIngredients: [...new Set(missingIngredients)], approximate };
};
