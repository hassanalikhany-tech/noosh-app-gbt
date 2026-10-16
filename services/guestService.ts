import { KitchenMode, UserProfile } from '../types';

const PROFILE_KEY = 'noosh_guest_profile_v1';
const ACTIVE_KEY = 'noosh_guest_active';
const START_MODE_KEY = 'noosh_start_mode_v1';
export const GuestService = {
  getStartMode: (): KitchenMode | null => {
    const value = localStorage.getItem(START_MODE_KEY);
    if (value === 'without-inventory' || value === 'discover') return 'without-inventory';
    if (value === 'with-inventory' || value === 'pantry') return 'with-inventory';
    return null;
  },
  setStartMode: (mode: KitchenMode) => localStorage.setItem(START_MODE_KEY, mode),
  isActive: () => localStorage.getItem(ACTIVE_KEY) === 'true',
  get: (): UserProfile => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      if (saved?.uid === 'local-guest') return { ...saved, kitchenMode: saved.kitchenMode || GuestService.getStartMode() || 'with-inventory' };
    } catch { /* Recover a damaged local profile with safe defaults. */ }
    return {
      uid: 'local-guest', username: 'guest', fullName: 'دوست نوش', passwordCode: '',
      subscriptionExpiry: 0, role: 'user', isApproved: false,
      blacklistedDishIds: [], favoriteDishIds: [], dislikedIngredients: [],
      excludedCategories: [], preferredNatures: ['hot', 'cold', 'balanced'],
      history: [], familySize: 4, inventory: [], customShoppingList: [], hasCompletedSetup: true,
      kitchenMode: GuestService.getStartMode() || 'with-inventory',
    };
  },
  start: (mode?: KitchenMode) => {
    if (mode) GuestService.setStartMode(mode);
    localStorage.setItem(ACTIVE_KEY, 'true');
    if (mode) GuestService.save({ kitchenMode: mode });
  },
  stop: () => localStorage.removeItem(ACTIVE_KEY),
  save: (updates: Partial<UserProfile>) => {
    const profile = { ...GuestService.get(), ...updates, uid: 'local-guest', role: 'user' as const, isAdmin: false };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('user-data-updated'));
    return profile;
  },
};
