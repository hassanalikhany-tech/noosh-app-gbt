import { Dish, InventoryItem } from '../types';
import { compareBatchConsumptionOrder, getInventoryBatches } from './inventoryBatches';
import { convertIngredientQuantity, isInventoryIngredientMatch, normalizeUnit, parseQuantity, splitIngredientAlternatives } from './recipeHelpers';

export interface RecipeCostEstimate {
  pricedSubtotal: number;
  pricedRows: number;
  eligibleRows: number;
  missingIngredients: string[];
  approximate: boolean;
}

export const estimateRecipeCost = (dish: Dish, servings: number, inventory: InventoryItem[] = []): RecipeCostEstimate => {
  const targetServings = Number.isFinite(servings) && servings > 0 ? servings : dish.servings || 4;
  const baseServings = dish.servings || 4;
  let pricedSubtotal = 0;
  let pricedRows = 0;
  let eligibleRows = 0;
  let approximate = false;
  const missingIngredients: string[] = [];
  const remainingStock = new Map(inventory.flatMap(row => getInventoryBatches(row).map(batch => [batch.id, batch.amount] as const)));

  for (const ingredient of dish.ingredients || []) {
    const amount = parseQuantity(ingredient.amount) * targetServings / baseServings;
    const recipeUnit = normalizeUnit(ingredient.unit || '');
    if (!Number.isFinite(amount) || amount <= 0 || recipeUnit === 'به میزان لازم') continue;
    eligibleRows++;
    const options = splitIngredientAlternatives(ingredient.item);
    const matchedOption = options.find(option => inventory.some(row => row.amount > 0 && (ingredient.ingredientId && row.ingredientId ? ingredient.ingredientId === row.ingredientId : isInventoryIngredientMatch(row.name, option))));
    const targetName = matchedOption || ingredient.item;
    const rows = inventory.filter(row => row.amount > 0 && (ingredient.ingredientId && row.ingredientId ? ingredient.ingredientId === row.ingredientId : isInventoryIngredientMatch(row.name, targetName)));
    if (!rows.length) { missingIngredients.push(ingredient.item); continue; }

    const sources = rows.flatMap(row => {
      const conversion = convertIngredientQuantity(1, ingredient.unit, row.unit, ingredient.item, row.name);
      if (!conversion || conversion.amount <= 0) return [];
      const batches = getInventoryBatches(row).map(batch => ({ ...batch, amount: remainingStock.get(batch.id) ?? batch.amount })).filter(batch => batch.amount > 0).map(batch => ({ batch, row, stockUnitsPerRecipeUnit: conversion.amount, estimated: conversion.estimated }));
      return batches;
    }).sort((a, b) => compareBatchConsumptionOrder(a.batch, b.batch));
    let remaining = amount;
    let ingredientFullyPriced = sources.length > 0;
    for (const source of sources) {
      if (remaining <= 1e-9) break;
      const capacity = source.batch.amount / source.stockUnitsPerRecipeUnit;
      const consumedInRecipeUnits = Math.min(remaining, capacity);
      const consumedInStockUnits = consumedInRecipeUnits * source.stockUnitsPerRecipeUnit;
      if (source.batch.unitPrice && source.batch.unitPrice > 0) pricedSubtotal += consumedInStockUnits * source.batch.unitPrice;
      else ingredientFullyPriced = false;
      if (source.estimated) approximate = true;
      remainingStock.set(source.batch.id, Math.max(0, (remainingStock.get(source.batch.id) ?? source.batch.amount) - consumedInStockUnits));
      remaining -= consumedInRecipeUnits;
    }
    if (remaining > 1e-7) ingredientFullyPriced = false;
    if (ingredientFullyPriced) pricedRows++;
    else missingIngredients.push(ingredient.item);
  }
  return { pricedSubtotal, pricedRows, eligibleRows, missingIngredients: [...new Set(missingIngredients)], approximate };
};
