import { InventoryBatch, InventoryItem } from '../types';
import { roundQuantity } from './recipeHelpers';

const makeId = () => globalThis.crypto?.randomUUID?.() || `lot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const MAX_ACTIVE_PURCHASE_BATCHES = 2;
export const compareBatchConsumptionOrder = (a: InventoryBatch, b: InventoryBatch) => {
  if (a.expiresOn && b.expiresOn) return a.expiresOn.localeCompare(b.expiresOn) || a.receivedAt - b.receivedAt;
  if (a.expiresOn) return -1;
  if (b.expiresOn) return 1;
  return a.receivedAt - b.receivedAt;
};

export const activePurchaseBatchCount = (batches: InventoryBatch[]) => batches.filter(batch => batch.amount > 1e-9 && batch.purchaseAmount !== undefined).length;

export const getInventoryBatches = (item: InventoryItem): InventoryBatch[] => {
  if (Array.isArray(item.stockBatches) && item.stockBatches.length) return item.stockBatches.map(batch => ({ ...batch }));
  return item.amount > 0 ? [{ id: `legacy-${item.id}`, amount: item.amount, receivedAt: item.lastUpdated }] : [];
};

export const sumInventoryBatches = (batches: InventoryBatch[]) => roundQuantity(batches.reduce((sum, batch) => sum + batch.amount, 0));

/** Latest active purchase with expiry within 7 days and price within 10%. Unknown values stay separate. */
export const findCompatiblePurchaseBatch = (batches: InventoryBatch[], expiresOn?: string, unitPrice?: number) => {
  if (!expiresOn || !Number.isFinite(unitPrice) || unitPrice! <= 0) return undefined;
  const expiry = Date.parse(`${expiresOn}T00:00:00Z`);
  return batches.filter(batch => batch.amount > 0 && batch.purchaseAmount !== undefined && batch.expiresOn && batch.unitPrice &&
    Math.abs(Date.parse(`${batch.expiresOn}T00:00:00Z`) - expiry) <= 7 * 86400000 &&
    Math.abs(batch.unitPrice - unitPrice!) / batch.unitPrice <= 0.1 + 1e-9)
    .sort((a, b) => (b.lastPurchasedAt ?? b.receivedAt) - (a.lastPurchasedAt ?? a.receivedAt))[0];
};

export const mergeInventoryPurchase = (batch: InventoryBatch, amount: number, expiresOn?: string, unitPrice?: number): InventoryBatch => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('مقدار خرید باید بیشتر از صفر باشد.');
  const previousPurchased = batch.purchaseAmount ?? batch.amount;
  const purchaseAmount = previousPurchased + amount;
  const hasPrice = Number.isFinite(unitPrice) && unitPrice! > 0;
  const nextPrice = hasPrice ? batch.unitPrice ? (batch.amount * batch.unitPrice + amount * unitPrice!) / (batch.amount + amount) : unitPrice : batch.unitPrice;
  const previousPurchasePrice = batch.purchaseUnitPrice ?? batch.unitPrice;
  const purchaseUnitPrice = hasPrice ? previousPurchasePrice ? (previousPurchased * previousPurchasePrice + amount * unitPrice!) / purchaseAmount : unitPrice : previousPurchasePrice;
  return {
    ...batch,
    amount: roundQuantity(batch.amount + amount),
    purchaseAmount,
    ...(nextPrice ? { unitPrice: nextPrice } : {}),
    ...(purchaseUnitPrice ? { purchaseUnitPrice } : {}),
    ...((!batch.unitPrice || !hasPrice) && batch.amount > 0 ? { costApproximate: true } : {}),
    expiresOn: batch.expiresOn && expiresOn ? [batch.expiresOn, expiresOn].sort()[0] : batch.expiresOn || expiresOn,
    lastPurchasedAt: Date.now(),
  };
};

export const appendInventoryBatch = (item: InventoryItem, amount: number, expiresOn?: string, unitPrice?: number, mergeBatchId?: string): InventoryItem => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('مقدار خرید باید بیشتر از صفر باشد.');
  const existing = getInventoryBatches(item);
  const target = mergeBatchId ? existing.find(batch => batch.id === mergeBatchId && batch.amount > 0)
    : activePurchaseBatchCount(existing) >= MAX_ACTIVE_PURCHASE_BATCHES ? findCompatiblePurchaseBatch(existing, expiresOn, unitPrice) : undefined;
  if (mergeBatchId && !target) throw new Error('سری انتخاب‌شده دیگر موجودی ندارد؛ سری دیگری انتخاب کن.');
  if (target) {
    const merged = mergeInventoryPurchase(target, amount, expiresOn, unitPrice);
    const stockBatches = existing.map(batch => batch.id === target.id ? merged : batch);
    return { ...item, amount: sumInventoryBatches(stockBatches), stockBatches };
  }
  const purchasedAt = Date.now();
  return {
    ...item,
    amount: roundQuantity(item.amount + amount),
    stockBatches: [...existing, { id: makeId(), amount, purchaseAmount: amount, ...(Number.isFinite(unitPrice) && unitPrice! > 0 ? { unitPrice } : {}), ...(expiresOn ? { expiresOn } : {}), receivedAt: purchasedAt, lastPurchasedAt: purchasedAt }],
  };
};

/** Adjusts a manually edited aggregate, preserving dated lots and consuming earliest-expiring stock first. */
export const resizeInventoryBatches = (item: InventoryItem, nextAmount: number): InventoryBatch[] | undefined => {
  if (!item.stockBatches?.length) return undefined;
  const current = getInventoryBatches(item);
  const delta = roundQuantity(nextAmount - item.amount);
  if (delta > 0) return [...current, { id: makeId(), amount: delta, receivedAt: Date.now() }];
  if (delta === 0) return current;
  return deductInventoryBatches(current, -delta).batches;
};

export const deductInventoryBatches = (batches: InventoryBatch[], amount: number): { batches: InventoryBatch[]; deductions: InventoryBatch[] } => {
  let remaining = roundQuantity(amount);
  const next = batches.map(batch => ({ ...batch }));
  const deductions: InventoryBatch[] = [];
  for (const batch of [...next].sort(compareBatchConsumptionOrder)) {
    if (remaining <= 1e-9) break;
    const live = next.find(row => row.id === batch.id);
    if (!live || live.amount <= 0) continue;
    const consumed = roundQuantity(Math.min(live.amount, remaining));
    if (consumed <= 0) continue;
    live.amount = roundQuantity(live.amount - consumed);
    remaining = roundQuantity(remaining - consumed);
    deductions.push({ ...live, amount: consumed });
  }
  if (remaining > 1e-7) throw new Error('جمع مقدار سری‌های خرید از موجودی کل کمتر است؛ تاریخچهٔ انبار را بررسی کن.');
  return { batches: next.filter(batch => batch.amount > 1e-9 || batch.purchaseAmount !== undefined || batch.unitPrice !== undefined), deductions };
};

export const restoreInventoryBatches = (batches: InventoryBatch[], deductions: InventoryBatch[]): InventoryBatch[] => {
  const next = batches.map(batch => ({ ...batch }));
  for (const deduction of deductions) {
    const existing = next.find(batch => batch.id === deduction.id);
    if (existing) existing.amount = roundQuantity(existing.amount + deduction.amount);
    else next.push({ ...deduction });
  }
  return next;
};

export const earliestExpiry = (item: InventoryItem): string | undefined => getInventoryBatches(item)
  .filter(batch => batch.amount > 0 && batch.expiresOn)
  .map(batch => batch.expiresOn!)
  .sort()[0];

export const inventoryExpiryState = (date?: string, today = new Date()) => {
  if (!date) return 'none' as const;
  const expiry = new Date(`${date}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return 'none' as const;
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.ceil((expiry.getTime() - startToday) / 86_400_000);
  return days < 0 ? 'expired' as const : days <= 3 ? 'soon' as const : days <= 7 ? 'upcoming' as const : 'fresh' as const;
};
