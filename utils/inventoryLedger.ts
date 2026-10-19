import REFERENCES from '../data/pantry_unit_preferences.json';
import { CookingTransaction, Dish, InventoryItem, UserProfile } from '../types';
import { convertIngredientQuantity, evaluateInventory, getIngredientIdentity, getPhysicalForm, normalizeUnit, parseQuantity, roundQuantity, UNIT_CONVERSIONS } from './recipeHelpers';

export interface CookingDraftRow {
  key: string; item: string; inventoryId: string; amount: string; enabled: boolean;
  estimated: boolean; reason: string; recipeText: string;
}
export interface CookingDraft {
  id: string; dishId: string; dishName: string; servings: number;
  referenceVersion: string; fingerprint: string; rows: CookingDraftRow[]; notices: string[];
}
export const inventoryFingerprint = (inventory: InventoryItem[]) => JSON.stringify(inventory.map(row => [row.id, row.name, row.amount, row.unit, row.state || getPhysicalForm(row.name), row.unitWeightGrams, row.previousIds]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))));

/** Migration preserves the entered physical quantity, never guesses historical losses. */
export const normalizeInventoryStorage = (inventory: InventoryItem[]) => inventory.map(row => {
  const amount = parseQuantity(row.amount);
  const definition = UNIT_CONVERSIONS[normalizeUnit(row.unit || '')];
  const measurement = Number.isFinite(amount) && definition ? {
    value: row.measurement?.enteredAmount === amount && row.measurement.enteredUnit === row.unit && row.measurement.baseUnit === definition.baseUnit && Number.isFinite(row.measurement.value) && row.measurement.value >= 0 ? row.measurement.value : roundQuantity(amount * definition.factor),
    baseUnit: definition.baseUnit, enteredAmount: amount, enteredUnit: row.unit,
  } : undefined;
  return { ...row, ingredientId: row.ingredientId || getIngredientIdentity(row.name), state: row.state || getPhysicalForm(row.name), measurement };
});

export const prepareCooking = (inventory: InventoryItem[], dish: Dish, servings: number): CookingDraft => {
  const evaluation = evaluateInventory(inventory, dish.ingredients, servings, dish.servings || 4);
  const rows: CookingDraftRow[] = [];
  const notices: string[] = [];
  evaluation.lines.forEach(line => {
    line.allocations.forEach((allocation, i) => rows.push({ key: `${line.index}-${i}`, item: line.item, inventoryId: allocation.inventoryId, amount: String(allocation.consumed), enabled: true, estimated: allocation.estimated, reason: allocation.reason, recipeText: `${roundQuantity(line.recipeAmount,6)} ${line.recipeUnit}` }));
    if (line.status !== 'ready') notices.push(`${line.item}: ${line.reason}`);
    // Missing, unmeasured and unmatched foods are recorded as notes. A cook
    // event never asks the user to repair the recipe at the moment of cooking.
  });
  return { id: `cook-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`, dishId: dish.id, dishName: dish.name, servings, referenceVersion: REFERENCES.updatedAt, fingerprint: inventoryFingerprint(inventory), rows, notices };
};

export const applyCookingTransaction = (user: UserProfile, draft: CookingDraft): UserProfile => {
  if ((user.cookingTransactions || []).some(tx => tx.id === draft.id)) return user;
  if (user.kitchenMode === 'without-inventory') throw new Error('سیستم انبار خاموش شده است؛ ثبت مصرف انجام نشد.');
  const inventory = user.inventory || [];
  if (inventoryFingerprint(inventory) !== draft.fingerprint) throw new Error('موجودی از زمان پیش‌نمایش تغییر کرده است. پنجره را ببند و دوباره پیش‌نمایش بگیر.');
  const changes = new Map<string, CookingTransaction['changes'][number]>();
  for (const row of draft.rows.filter(row => row.enabled)) {
    const amount = parseQuantity(row.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new Error(`مقدار مصرف ${row.item} معتبر نیست.`);
    if (amount === 0) continue;
    const stock = inventory.find(item => item.id === row.inventoryId);
    if (!stock) throw new Error(`برای ${row.item} یک ماده از انبار انتخاب کن.`);
    const existing = changes.get(stock.id);
    const consumed = roundQuantity((existing?.consumed || 0) + amount);
    if (consumed > stock.amount + 1e-9) throw new Error(`مصرف ${stock.name} از موجودی ثبت‌شده بیشتر است؛ مقدار را اصلاح کن.`);
    changes.set(stock.id, { inventoryId: stock.id, name: stock.name, unit: stock.unit, before: stock.amount, consumed, after: roundQuantity(Math.max(0, stock.amount-consumed)), estimated: Boolean(existing?.estimated || row.estimated), reason: [existing?.reason, row.reason].filter(Boolean).join('؛ '), stockSnapshot: { ...stock, unitWeightGrams: stock.unitWeightGrams ? { ...stock.unitWeightGrams } : undefined } });
  }
  const tx: CookingTransaction = { id: draft.id, dishId: draft.dishId, dishName: draft.dishName, servings: draft.servings, engineVersion: 3, referenceVersion: draft.referenceVersion, createdAt: Date.now(), changes: [...changes.values()], notes: draft.notices };
  return { ...user, inventorySchemaVersion: 2, inventory: normalizeInventoryStorage(inventory.map(row => changes.has(row.id) ? { ...row, amount: changes.get(row.id)!.after, lastUpdated: Date.now() } : row)), cookingTransactions: [...(user.cookingTransactions || []), tx] };
};

export const reverseCookingTransaction = (user: UserProfile, id: string): UserProfile => {
  const tx = user.cookingTransactions?.find(row => row.id === id);
  if (!tx) throw new Error('این سابقه پیدا نشد.');
  if (tx.reversedAt) return user;
  const inventory = (user.inventory || []).map(row => ({ ...row }));
  for (const change of tx.changes) {
    let row = inventory.find(row => row.id === change.inventoryId || row.previousIds?.includes(change.inventoryId));
    if (!row) {
      row = { ...(change.stockSnapshot || { id: change.inventoryId, name: change.name, unit: change.unit, minThreshold: 0, lastUpdated: Date.now() }), amount: 0 };
      inventory.push(row);
    }
    const conversion = convertIngredientQuantity(change.consumed, change.unit, row.unit, row.name);
    if (!conversion || conversion.estimated) throw new Error(`واحد ${row.name} تغییر کرده و بازگردانی دقیق ممکن نیست؛ ابتدا واحد را به ${change.unit} برگردان.`);
    row.amount = roundQuantity(row.amount + conversion.amount);
    row.lastUpdated = Date.now();
  }
  return { ...user, inventory: normalizeInventoryStorage(inventory), cookingTransactions: (user.cookingTransactions || []).map(row => row.id === id ? { ...row, reversedAt: Date.now() } : row) };
};
