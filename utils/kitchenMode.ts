import { InventoryItem, UserProfile } from '../types';

type KitchenModeSource = Pick<UserProfile, 'kitchenMode' | 'inventory'>;

/** Missing mode values belong to legacy users and keep their existing inventory behavior. */
export const usesInventory = (user: Pick<UserProfile, 'kitchenMode'>): boolean => user.kitchenMode !== 'without-inventory';

/** Every inventory-sensitive workflow must use this accessor so free mode never reads stale stock. */
export const getRelevantInventory = (user: KitchenModeSource): InventoryItem[] =>
  usesInventory(user) ? user.inventory || [] : [];
