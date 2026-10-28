import { Dish, InventoryItem, PurchaseRecord } from '../types';
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
      if (source.estimated || source.batch.costApproximate) approximate = true;
      remainingStock.set(source.batch.id, Math.max(0, (remainingStock.get(source.batch.id) ?? source.batch.amount) - consumedInStockUnits));
      remaining -= consumedInRecipeUnits;
    }
    if (remaining > 1e-7) ingredientFullyPriced = false;
    if (ingredientFullyPriced) pricedRows++;
    else missingIngredients.push(ingredient.item);
  }
  return { pricedSubtotal, pricedRows, eligibleRows, missingIngredients: [...new Set(missingIngredients)], approximate };
};

/** Estimate the full recipe from the user's latest recorded purchase prices, without requiring those quantities to remain in stock. */
export const estimateRecipeBudgetCost = (dish: Dish, servings: number, inventory: InventoryItem[] = [], purchaseHistory: PurchaseRecord[] = []): RecipeCostEstimate => {
  const targetServings = Number.isFinite(servings) && servings > 0 ? servings : dish.servings || 4;
  const baseServings = dish.servings || 4;
  const records = [...purchaseHistory];
  const knownIds = new Set(records.map(row => row.id));
  for (const item of inventory) for (const batch of getInventoryBatches(item)) {
    if (!batch.unitPrice || batch.unitPrice <= 0 || batch.purchaseAmount === undefined || knownIds.has(batch.id)) continue;
    records.push({ id: batch.id, inventoryId: item.id, ingredientId: item.ingredientId || '', name: item.name, amount: batch.purchaseAmount, unit: item.unit, unitPrice: batch.unitPrice, totalPrice: batch.purchaseAmount * batch.unitPrice, purchasedAt: batch.receivedAt, lastPurchasedAt: batch.lastPurchasedAt, approximate: batch.costApproximate });
  }

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

    const candidates = splitIngredientAlternatives(ingredient.item).flatMap(option => {
      const matches = records.filter(record => Number(record.unitPrice) > 0 && (ingredient.ingredientId && record.ingredientId ? ingredient.ingredientId === record.ingredientId : isInventoryIngredientMatch(record.name, option)));
      const latest = matches.sort((a, b) => (b.lastPurchasedAt || b.purchasedAt) - (a.lastPurchasedAt || a.purchasedAt))[0];
      if (!latest) return [];
      const conversion = convertIngredientQuantity(amount, ingredient.unit, latest.unit, ingredient.item, latest.name);
      if (!conversion || conversion.amount <= 0) return [];
      return [{ cost: conversion.amount * latest.unitPrice!, estimated: conversion.estimated || Boolean(latest.approximate), purchasedAt: latest.lastPurchasedAt || latest.purchasedAt }];
    });

    if (!candidates.length) { missingIngredients.push(ingredient.item); continue; }
    // Alternative ingredients are estimated using the least costly recorded option.
    candidates.sort((a, b) => a.cost - b.cost || b.purchasedAt - a.purchasedAt);
    pricedSubtotal += candidates[0].cost;
    pricedRows++;
    approximate ||= candidates[0].estimated;
  }

  return { pricedSubtotal, pricedRows, eligibleRows, missingIngredients: [...new Set(missingIngredients)], approximate };
};
