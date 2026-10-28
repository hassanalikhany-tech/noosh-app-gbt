import { InventoryBatch, InventoryItem, PurchaseRecord } from '../types';
import { convertIngredientQuantity, getIngredientIdentity } from './recipeHelpers';

export const purchaseRecordFromBatch = (item: InventoryItem, batch: InventoryBatch): PurchaseRecord | null => {
  if (batch.purchaseAmount === undefined || batch.purchaseAmount <= 0) return null;
  const unitPrice = Number.isFinite(batch.unitPrice) && batch.unitPrice! > 0 ? batch.unitPrice : undefined;
  return {
    id: batch.id,
    inventoryId: item.id,
    ingredientId: item.ingredientId || getIngredientIdentity(item.name),
    name: item.name,
    amount: batch.purchaseAmount,
    unit: item.unit,
    ...(unitPrice ? { unitPrice, totalPrice: batch.purchaseAmount * unitPrice } : {}),
    purchasedAt: batch.receivedAt,
    ...(batch.expiresOn ? { expiresOn: batch.expiresOn } : {}),
  };
};

/** Updates only user-editable price/date metadata while preserving historical purchase units and quantities. */
export const mergePurchaseHistory = (history: PurchaseRecord[], item: InventoryItem, batches: InventoryBatch[]) => {
  const next = [...history];
  for (const batch of batches) {
    const record = purchaseRecordFromBatch(item, batch);
    if (!record) continue;
    const index = next.findIndex(row => row.id === batch.id);
    if (index < 0) next.push(record);
    else {
      const previous = next[index];
      const toPreviousUnit = convertIngredientQuantity(1, item.unit, previous.unit, item.name, previous.name);
      const adjustedPrice = record.unitPrice && toPreviousUnit?.amount ? record.unitPrice / toPreviousUnit.amount : undefined;
      next[index] = { ...previous, ...(record.unitPrice ? adjustedPrice ? { unitPrice: adjustedPrice, totalPrice: previous.amount * adjustedPrice, approximate: Boolean(toPreviousUnit?.estimated) } : {} : { unitPrice: undefined, totalPrice: undefined }), expiresOn: record.expiresOn };
    }
  }
  return next;
};
