import { applyCookingTransaction, reverseCookingTransaction, CookingDraft } from '../utils/inventoryLedger';
import { GuestService } from './guestService';
import { UserProfile } from '../types';

const notifyUpdate = () => window.dispatchEvent(new CustomEvent('user-data-updated'));
const localOnlyMessage = 'در نسخه فعلی اطلاعات فقط روی همین دستگاه و مرورگر ذخیره می‌شود؛ ساخت حساب ابری فعلاً غیرفعال است.';

const disabledAuth = async (..._args: any[]): Promise<{ success: false; message: string; user?: UserProfile }> => ({ success: false, message: localOnlyMessage });

export const UserService = {
  // Kept as compatibility methods for older screens, without contacting a cloud provider.
  login: disabledAuth,
  register: disabledAuth,
  loginWithGoogle: disabledAuth,
  sendResetPassword: disabledAuth,
  loginWithBiometric: disabledAuth,
  promoteToVisitor: async (_uid: string) => false,
  demoteFromVisitor: async (_uid: string) => false,
  getVisitorProfile: async (_uid: string) => null,
  getVisitorFinancialInfo: async (_uid: string) => null,
  updateVisitorFinancialInfo: async (_uid: string, _info: any) => { throw new Error(localOnlyMessage); },
  verifyKyc: async (_uid: string, _status: 'verified' | 'rejected') => { throw new Error(localOnlyMessage); },
  getAllVisitors: async () => [],
  extendSubscription: async (_uid: string, _days: number, _paidAmount = 0) => { throw new Error(localOnlyMessage); },

  getCurrentUser: async (): Promise<UserProfile> => {
    if (!GuestService.isActive()) GuestService.start();
    return GuestService.get();
  },

  commitCooking: async (draft: CookingDraft): Promise<UserProfile> => {
    const commit = () => {
      const latest = GuestService.get();
      const next = applyCookingTransaction(latest, draft);
      return next === latest ? latest : GuestService.save({ inventory: next.inventory, cookingTransactions: next.cookingTransactions, inventorySchemaVersion: 2 });
    };
    return globalThis.navigator?.locks ? navigator.locks.request('noosh-inventory', commit) : commit();
  },
  undoCooking: async (id: string): Promise<UserProfile> => {
    const commit = () => {
      const latest = GuestService.get();
      const next = reverseCookingTransaction(latest, id);
      return next === latest ? latest : GuestService.save({ inventory: next.inventory, cookingTransactions: next.cookingTransactions });
    };
    return globalThis.navigator?.locks ? navigator.locks.request('noosh-inventory', commit) : commit();
  },
  updateProfile: async (_username: string, updates: Partial<UserProfile>): Promise<UserProfile> => GuestService.save(updates),

  logout: async () => {
    // A local-only app should always remain usable; logout resets the local guest session.
    GuestService.stop();
    GuestService.start();
    window.dispatchEvent(new CustomEvent('auth-logout'));
  },

  updateShoppingList: async (username: string, items: any[]) => UserService.updateProfile(username, { customShoppingList: items }),
  updateInventory: async (username: string, items: any[]) => UserService.updateProfile(username, { inventory: items }),
  toggleFavorite: async (username: string, dishId: string) => {
    const user = GuestService.get();
    const favoriteDishIds = user.favoriteDishIds?.includes(dishId)
      ? user.favoriteDishIds.filter(id => id !== dishId)
      : [...(user.favoriteDishIds || []), dishId];
    return UserService.updateProfile(username, {
      favoriteDishIds,
      blacklistedDishIds: (user.blacklistedDishIds || []).filter(id => id !== dishId),
    });
  },
  toggleBlacklist: async (username: string, dishId: string) => {
    const user = GuestService.get();
    const blacklistedDishIds = user.blacklistedDishIds?.includes(dishId)
      ? user.blacklistedDishIds.filter(id => id !== dishId)
      : [...(user.blacklistedDishIds || []), dishId];
    return UserService.updateProfile(username, {
      blacklistedDishIds,
      favoriteDishIds: (user.favoriteDishIds || []).filter(id => id !== dishId),
    });
  },
  getAllUsers: async () => ({ success: true, data: [GuestService.get()] }),
  toggleUserApproval: async (_uid: string, _status: boolean) => { notifyUpdate(); },
  resetUserDevices: async (_uid: string) => { notifyUpdate(); },
  deleteUser: async (_uid: string) => { notifyUpdate(); },
  hideGuidance: async (_uid: string, key: string) => {
    const keys = GuestService.get().hiddenGuidanceKeys || [];
    GuestService.save({ hiddenGuidanceKeys: [...new Set([...keys, key])] });
  },
};
