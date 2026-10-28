import { normalizePersian } from '../utils/text';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, Sparkles, X, UtensilsCrossed, RefreshCw, Trash2, CheckCircle2, AlertCircle, Clock, Heart, Filter, Package, AlertTriangle, Plus, Minus, Save, ShoppingCart, Pencil, CalendarDays } from 'lucide-react';
import { PANTRY_ITEMS, getIngredientCategoryId } from '../data/pantry';
import { RecipeService } from '../services/recipeService';
import { Dish, KitchenMode, UserProfile, InventoryItem } from '../types';
import { isIngredientMatch, isInventoryIngredientMatch, getStandardUnit, convertToBase, convertAmountBetweenUnits, areUnitsComparable, isDishProhibited, evaluateInventory, roundQuantity, getIngredientIdentity } from '../utils/recipeHelpers';
import { UserService } from '../services/userService';
import { getPantryUnitPreference, suggestPantryUnit } from '../utils/pantryUnits';
import RecipeModal from './RecipeModal';
import InventoryHistory from './InventoryHistory';
import MealCard from './MealCard';
import PantryFoodThumbnail from './PantryFoodThumbnail';
import InventoryBatchManager from './InventoryBatchManager';
import { activePurchaseBatchCount, appendInventoryBatch, earliestExpiry, getInventoryBatches, inventoryExpiryState, MAX_ACTIVE_PURCHASE_BATCHES, sumInventoryBatches, resizeInventoryBatches } from '../utils/inventoryBatches';
import { mergePurchaseHistory } from '../utils/purchaseHistory';
import { PANTRY_UNIT_OPTIONS } from '../utils/pantryUnits';

interface PantryChefProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onNavigate: (view: 'plan' | 'search') => void;
  onKitchenModeChange: (mode: KitchenMode) => Promise<void> | void;
}

type ResultFilter = 'all' | 'perfect' | 'near' | 'cookable' | 'quick' | 'favorites';

const PANTRY_STARTER_ITEMS = ['مرغ', 'تخم مرغ', 'برنج', 'گوجه فرنگی', 'پیاز', 'سیب زمینی', 'ماست', 'گوشت چرخ‌کرده'];

interface FoodIngredientComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string, categoryId: string) => void;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const FoodIngredientCombobox: React.FC<FoodIngredientComboboxProps> = ({ id, value, onChange, onSelect, placeholder, inputRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = normalizePersian(value).trim();
  const groupedOptions = useMemo(() => PANTRY_ITEMS.map(category => ({
    ...category,
    groups: category.subcategories.map(subcategory => ({
      ...subcategory,
      items: subcategory.items
        .filter((item, index, all) => all.indexOf(item) === index)
        .filter(item => !query || normalizePersian(item).includes(query)),
    })).filter(subcategory => subcategory.items.length > 0),
  })).filter(category => category.groups.length > 0), [query]);
  const flatOptions = useMemo(() => groupedOptions.flatMap(category => category.groups.flatMap(group => group.items.map(item => ({ item, categoryId: category.id })))), [groupedOptions]);
  const availableBelow = menuRect ? window.innerHeight - menuRect.bottom - 16 : 0;
  const availableAbove = menuRect ? menuRect.top - 16 : 0;
  const placeMenuAbove = availableBelow < 220 && availableAbove > availableBelow;
  const menuMaxHeight = Math.max(100, Math.min(340, placeMenuAbove ? availableAbove : availableBelow));

  const refreshMenuPosition = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setMenuRect(rect);
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshMenuPosition();
    const handleOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node) || menuRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    window.addEventListener('resize', refreshMenuPosition);
    window.addEventListener('scroll', refreshMenuPosition, true);
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => {
      window.removeEventListener('resize', refreshMenuPosition);
      window.removeEventListener('scroll', refreshMenuPosition, true);
      document.removeEventListener('pointerdown', handleOutsidePointer);
    };
  }, [isOpen]);

  useEffect(() => setActiveIndex(0), [query]);

  return <div ref={rootRef} className="relative min-w-0 flex-1">
    <input
      id={id}
      ref={inputRef}
      value={value}
      onFocus={event => { refreshMenuPosition(); setIsOpen(true); }}
      onClick={event => { refreshMenuPosition(); setIsOpen(true); }}
      onChange={event => { onChange(event.target.value); refreshMenuPosition(); setIsOpen(true); }}
      onKeyDown={event => {
        if (event.key === 'Escape') setIsOpen(false);
        else if (event.key === 'ArrowDown' && flatOptions.length) { event.preventDefault(); setIsOpen(true); setActiveIndex(current => Math.min(current + 1, flatOptions.length - 1)); }
        else if (event.key === 'ArrowUp' && flatOptions.length) { event.preventDefault(); setActiveIndex(current => Math.max(current - 1, 0)); }
        else if (event.key === 'Enter' && isOpen && flatOptions[activeIndex]) { event.preventDefault(); const option = flatOptions[activeIndex]; onChange(option.item); onSelect?.(option.item, option.categoryId); setIsOpen(false); }
      }}
      placeholder={placeholder}
      autoComplete="off"
      role="combobox"
      aria-expanded={isOpen}
      aria-controls={`${id}-options`}
      aria-autocomplete="list"
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
    />
    {isOpen && menuRect && createPortal(<div
      ref={menuRef}
      id={`${id}-options`}
      role="listbox"
      className="pantry-food-combobox-menu"
      style={{ position: 'fixed', left: menuRect.left, top: placeMenuAbove ? menuRect.top - menuMaxHeight - 7 : menuRect.bottom + 7, width: menuRect.width, maxHeight: menuMaxHeight, zIndex: 10000 }}
    >
      {groupedOptions.map(category => <section key={category.id} className="pantry-food-combobox-category">
        <h4>{category.title}</h4>
        {category.groups.map(group => <div key={`${category.id}-${group.title}`} className="pantry-food-combobox-subgroup">
          <h5>{group.title}</h5>
          <div className="pantry-food-combobox-options">{group.items.map(item => {
            const optionIndex = flatOptions.findIndex(option => option.item === item && option.categoryId === category.id);
            return <button key={`${category.id}-${group.title}-${item}`} type="button" role="option" aria-selected={value === item} data-active={optionIndex === activeIndex} onMouseEnter={() => setActiveIndex(optionIndex)} onClick={() => { onChange(item); onSelect?.(item, category.id); setIsOpen(false); }} className="pantry-food-combobox-option"><PantryFoodThumbnail item={item} categoryId={category.id} subcategoryId={group.id} /><span>{item}</span></button>;
          })}</div>
        </div>)}
      </section>)}
      {query && !flatOptions.some(option => normalizePersian(option.item).trim() === query) && <button type="button" role="option" aria-selected="false" onClick={() => { onChange(value.trim()); onSelect?.(value.trim(), 'custom'); setIsOpen(false); }} className="flex w-full items-center justify-between border-t border-emerald-100 bg-emerald-50 px-4 py-3 text-right text-sm font-black text-[#276556] hover:bg-emerald-100"><span>+ افزودن مادهٔ دلخواه «{value.trim()}»</span><small className="font-bold">فقط در انبار شما</small></button>}
      {!flatOptions.length && <p className="pantry-food-combobox-empty">ماده‌ای در فهرست نیست؛ همین نام را می‌توانی دستی ثبت کنی.</p>}
    </div>, document.body)}
  </div>;
};

interface ProcessedResult {
  dish: Dish;
  matchedItems: string[];
  missingItems: string[];
  isPerfect: boolean;
  isFullyCookable: boolean;
  missingCount: number;
  priorityScore: number;
  proteinMatchScore: number;
}

const PantryChef: React.FC<PantryChefProps> = ({ user, onUpdateUser, onNavigate, onKitchenModeChange }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemExpiry, setNewItemExpiry] = useState('');
  const [newItemUnitPrice, setNewItemUnitPrice] = useState('');
  const [addMessage, setAddMessage] = useState('');
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(null);
  const [pendingUnitCorrection, setPendingUnitCorrection] = useState<{ id: string; name: string; oldAmount: number; oldUnit: string; nextUnit: string; oldThreshold: number; oldThresholdUnit: string; amount: string; threshold: string } | null>(null);
  const [isInventoryOverviewOpen, setIsInventoryOverviewOpen] = useState(false);
  const [inventoryOverviewView, setInventoryOverviewView] = useState<'rows' | 'table'>('table');
  const [isInlineAddingInventory, setIsInlineAddingInventory] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState<InventoryItem | null>(null);
  const [dishCount, setDishCount] = useState(() => RecipeService.getAllDishes().length);

  useEffect(() => {
    const syncCount = (event: Event) => setDishCount((event as CustomEvent<{count: number}>).detail?.count ?? RecipeService.getAllDishes().length);
    window.addEventListener('recipes-updated', syncCount);
    return () => window.removeEventListener('recipes-updated', syncCount);
  }, []);
  const [rawResults, setRawResults] = useState<ProcessedResult[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<ResultFilter>('all');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const resultsAreaRef = useRef<HTMLDivElement>(null);
  const newItemNameRef = useRef<HTMLInputElement>(null);

  const rawInventory = useMemo(() => user.inventory || [], [user.inventory]);
  const inventory = useMemo(() => {
    const merged: InventoryItem[] = [];
    const indexes = new Map<string, number>();
    rawInventory.forEach(item => {
      const key = `${getIngredientIdentity(item.name)}:${JSON.stringify(item.unitWeightGrams || {})}`;
      const index = indexes.get(key);
      if (index === undefined) {
        indexes.set(key, merged.length);
        merged.push({ ...item });
        return;
      }
      const existing = merged[index];
      const convertedAmount = item.unit === existing.unit
        ? { amount: item.amount, estimated: false }
        : convertAmountBetweenUnits(item.amount, item.unit, existing.unit, existing.name);
      // Keep incompatible or estimate-only legacy rows intact; never guess while consolidating stock.
      if (!convertedAmount || convertedAmount.estimated) {
        indexes.set(`${key}\u0000${item.id}`, merged.length);
        merged.push({ ...item });
        return;
      }
      existing.amount = roundQuantity(existing.amount + convertedAmount.amount);
      const incomingBatches = getInventoryBatches(item).map(batch => ({ ...batch, amount: item.amount > 0 ? roundQuantity(batch.amount * convertedAmount.amount / item.amount) : 0 }));
      existing.stockBatches = [...getInventoryBatches(existing), ...incomingBatches];
      existing.previousIds = [...new Set([...(existing.previousIds || []), item.id, ...(item.previousIds || [])])];
      existing.lastUpdated = Math.max(existing.lastUpdated, item.lastUpdated);
      const incomingThreshold = convertAmountBetweenUnits(
        item.minThreshold,
        item.minThresholdUnit || item.unit,
        existing.minThresholdUnit || existing.unit,
        existing.name
      );
      if (incomingThreshold && !incomingThreshold.estimated) {
        existing.minThreshold = Math.max(existing.minThreshold, incomingThreshold.amount);
      }
    });
    return merged;
  }, [rawInventory]);

  useEffect(() => {
    if (inventory.length === rawInventory.length) return;
    onUpdateUser({ ...user, inventory });
    UserService.updateInventory(user.username, inventory).catch(err => console.error('Failed to merge duplicate pantry rows:', err));
  }, [inventory, rawInventory.length, user, onUpdateUser]);

  useEffect(() => {
    if (!isInventoryOverviewOpen) return;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsInventoryOverviewOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isInventoryOverviewOpen]);
  const starterItemsToAdd = PANTRY_STARTER_ITEMS.filter(name => !inventory.some(item => isInventoryIngredientMatch(item.name, name)));

  const isBelowThreshold = (item: InventoryItem) => {
    const current = convertToBase(item.amount, item.unit, item.name);
    const threshold = convertToBase(item.minThreshold, item.minThresholdUnit || item.unit, item.name);
    return areUnitsComparable(current, threshold) ? current.value <= threshold.value : false;
  };

  const lowStockItems = useMemo(() => {
    return inventory.filter(isBelowThreshold);
  }, [inventory]);

  const expiringItems = useMemo(() => inventory.map(item => ({ item, date: earliestExpiry(item) })).filter(entry => entry.date && inventoryExpiryState(entry.date) !== 'fresh').sort((a, b) => String(a.date).localeCompare(String(b.date))), [inventory]);

  const findRecipes = (items: string[]) => {
    if (items.length === 0) { setRawResults([]); return; }
    setIsSearching(true);
    setTimeout(() => {
      const all = RecipeService.getAllDishes(user).filter(dish => !isDishProhibited(dish, user));
      const processed: ProcessedResult[] = all.map(dish => {
        const evaluation = evaluateInventory(inventory, dish.ingredients, user.familySize || 4, dish.servings || 4);
        const matched = evaluation.lines.filter(line => line.allocations.length > 0).map(line => line.item);
        const missing = evaluation.lines.filter(line => line.status === 'shortage' || line.status === 'blocked').map(line => line.item);
        const essentialMissing = [...new Set(missing)];
        // Calculate priority score based on matched categories
        // Proteins (1) > Grains (2) > Vegetables (3)
        let priorityScore = 0;
        matched.forEach(item => {
          const catId = getIngredientCategoryId(item);
          if (catId === 'proteins') priorityScore += 100;
          else if (catId === 'grains') priorityScore += 10;
          else if (catId === 'vegetables') priorityScore += 1;
        });

        // Protein specific logic for prioritization
        const recipeProteins = dish.ingredients.filter(ing => getIngredientCategoryId(ing.item) === 'proteins').map(i => i.item);
        const selectedProteins = items.filter(item => getIngredientCategoryId(item) === 'proteins');

        const matchedProteins = recipeProteins.filter(rp =>
          selectedProteins.some(sp => isIngredientMatch(sp, rp))
        );
        const unmatchedProteins = recipeProteins.filter(rp =>
          !matchedProteins.includes(rp)
        );

        // Calculate protein match score
        // +1000 for each matched protein
        // -5000 for each unmatched protein (penalty for expensive unselected proteins)
        let proteinMatchScore = (matchedProteins.length * 1000) - (unmatchedProteins.length * 5000);

        // Check if fully cookable based on inventory amounts
        const isFullyCookable = evaluation.lines.every(line => line.status === 'ready');

        return {
          dish,
          matchedItems: matched,
          missingItems: missing,
          isPerfect: isFullyCookable,
          isFullyCookable,
          missingCount: essentialMissing.length,
          priorityScore, // Higher is better
          proteinMatchScore
        };
      })
      .filter(res => res.matchedItems.length > 0)
      .sort((a, b) => {
        // First priority: least essential missing items
        if (a.missingCount !== b.missingCount) {
          return a.missingCount - b.missingCount;
        }
        // Second priority: Protein Match Quality (Exact matches first, no unselected proteins)
        if (a.proteinMatchScore !== b.proteinMatchScore) {
          return b.proteinMatchScore - a.proteinMatchScore;
        }
        // Third priority: category score (Proteins > Grains > Vegetables)
        return b.priorityScore - a.priorityScore;
      });

      setRawResults(processed);
      setIsSearching(false);
      setTimeout(() => {
        resultsAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }, 600);
  };

  const updateInventoryItem = (itemId: string, updates: Partial<InventoryItem>) => {
    if (updates.amount !== undefined && (!Number.isFinite(updates.amount) || updates.amount < 0)) { setAddMessage('مقدار موجودی باید عددی معتبر و صفر یا بیشتر باشد.'); return; }
    if (updates.minThreshold !== undefined && (!Number.isFinite(updates.minThreshold) || updates.minThreshold < 0)) { setAddMessage('آستانهٔ هشدار باید عددی معتبر و صفر یا بیشتر باشد.'); return; }
    const newInventory = inventory.map(item => {
      if (item.id !== itemId) return item;
      let stockBatches = updates.stockBatches;
      const nextAmount = updates.amount ?? item.amount;
      const nextUnit = updates.unit ?? item.unit;
      if (!stockBatches && item.stockBatches?.length) {
        if (nextUnit !== item.unit && item.amount > 0) {
          const factor = nextAmount / item.amount;
          stockBatches = getInventoryBatches(item).map(batch => ({ ...batch, amount: roundQuantity(batch.amount * factor), ...(factor > 0 ? { ...(batch.purchaseAmount !== undefined ? { purchaseAmount: roundQuantity(batch.purchaseAmount * factor) } : {}), ...(batch.unitPrice !== undefined ? { unitPrice: batch.unitPrice / factor } : {}) } : { purchaseAmount: undefined, unitPrice: undefined }) }));
        } else stockBatches = resizeInventoryBatches(item, nextAmount);
      }
      return { ...item, ...updates, ...(stockBatches ? { stockBatches } : {}), lastUpdated: Date.now() };
    });
    // Optimistic update for immediate UI feedback
    onUpdateUser({ ...user, inventory: newInventory });
    // Sync with backend in background
    UserService.updateInventory(user.username, newInventory).catch(err => {
      console.error("Failed to sync inventory update:", err);
      // Optional: Rollback if sync fails significantly, but usually Firestore handles offline/sync
    });
  };

  const changeInventoryUnit = (item: InventoryItem, nextUnit: string) => {
    if (nextUnit === item.unit) return;
    const converted = convertAmountBetweenUnits(item.amount, item.unit, nextUnit, item.name);
    if (!converted || converted.estimated) {
      setPendingUnitCorrection({ id: item.id, name: item.name, oldAmount: item.amount, oldUnit: item.unit, nextUnit, oldThreshold: item.minThreshold, oldThresholdUnit: item.minThresholdUnit || item.unit, amount: '', threshold: '' });
      return;
    }
    updateInventoryItem(item.id, { amount: converted.amount, unit: nextUnit });
    setAddMessage(converted.estimated ? `مقدار ${item.name} با وزن مرجع متوسط تبدیل شد؛ برای دقت کامل، وزن واقعی را وارد کن.` : `واحد ${item.name} با حفظ مقدار واقعی تغییر کرد.`);
  };

  const addToInventory = async (itemName: string, amount = 1, unit?: string, focusNext = false, expiresOn = '', unitPrice?: number) => {
    const cleanName = itemName.trim();
    if (!cleanName || !Number.isFinite(amount) || amount <= 0) return;
    const prepareNextEntry = () => {
      setNewItemName('');
      setNewItemAmount('1');
      setNewItemUnit('');
      setNewItemExpiry('');
      setNewItemUnitPrice('');
      if (focusNext) window.requestAnimationFrame(() => newItemNameRef.current?.focus());
    };
    const existingItem = inventory.find(item => isInventoryIngredientMatch(item.name, cleanName));
    if (existingItem) {
      const inputUnit = unit || suggestPantryUnit(cleanName);
      const incoming = convertAmountBetweenUnits(amount, inputUnit, existingItem.unit, existingItem.name);
      if (!incoming || incoming.estimated) {
        setAddMessage(`واحد ورودی ${inputUnit} با موجودی ${existingItem.unit} تبدیل دقیق ندارد. ابتدا واحد و مقدار واقعی موجودی قبلی را از بخش ویرایش اصلاح کن؛ موجودی دست‌نخورده ماند.`);
        return;
      }
      let appended: InventoryItem;
      const priceInInventoryUnit = unitPrice && incoming.amount > 0 ? unitPrice * amount / incoming.amount : undefined;
      try { appended = appendInventoryBatch(existingItem, incoming.amount, expiresOn || undefined, priceInInventoryUnit); }
      catch (error) { setAddMessage(error instanceof Error ? error.message : 'سری خرید تازه ثبت نشد.'); return; }
      const newBatch = appended.stockBatches![appended.stockBatches!.length - 1];
      const newInventory = inventory.map(row => row.id === existingItem.id ? { ...appended, lastUpdated: Date.now() } : row);
      const purchaseHistory = mergePurchaseHistory(user.purchaseHistory || [], existingItem, [newBatch]);
      onUpdateUser({ ...user, inventory: newInventory, purchaseHistory });
      UserService.updateProfile(user.username, { inventory: newInventory, purchaseHistory }).catch(error => console.error('Failed to save purchase:', error));
      setAddMessage(`${cleanName} به موجودی اضافه شد؛ واحد قبلی ${existingItem.unit} حفظ شد.`);
      prepareNextEntry();
      return;
    }

    const defaultThreshold = 0;
    const selectedUnit = unit || suggestPantryUnit(cleanName);
    const receivedAt = Date.now();
    const newBatch = { id: globalThis.crypto?.randomUUID?.() || `lot-${receivedAt}`, amount, purchaseAmount: amount, ...(Number.isFinite(unitPrice) && unitPrice! > 0 ? { unitPrice } : {}), ...(expiresOn ? { expiresOn } : {}), receivedAt, lastPurchasedAt: receivedAt };
    const newItem: InventoryItem = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11),
      name: cleanName,
      amount,
      unit: selectedUnit,
      minThreshold: defaultThreshold,
      minThresholdUnit: selectedUnit,
      lastUpdated: Date.now(),
      stockBatches: [newBatch]
    };
    const newInventory = [...inventory, newItem];

    // Optimistic update
    const purchaseHistory = mergePurchaseHistory(user.purchaseHistory || [], newItem, [newBatch]);
    onUpdateUser({ ...user, inventory: newInventory, purchaseHistory });
    // Sync in background
    UserService.updateProfile(user.username, { inventory: newInventory, purchaseHistory }).catch(err => {
      console.error("Failed to sync inventory add:", err);
    });
    setAddMessage(`${cleanName} به انبار اضافه شد.`);
    prepareNextEntry();
  };

  const removeFromInventory = (itemId: string) => {
    const newInventory = inventory.filter(item => item.id !== itemId);
    // Optimistic update
    onUpdateUser({ ...user, inventory: newInventory });
    // Sync in background
    UserService.updateInventory(user.username, newInventory).catch(err => {
      console.error("Failed to sync inventory remove:", err);
    });
  };

  const suggestFromInventory = () => {
    const availableItems = inventory.filter(i => i.amount > 0).map(i => i.name);
    findRecipes(availableItems);
  };

  const filteredResults = useMemo(() => {
    if (!rawResults) return null;
    switch (activeFilter) {
      case 'perfect': return rawResults.filter(r => r.isPerfect);
      case 'cookable': return rawResults.filter(r => r.isFullyCookable);
      case 'near': return rawResults.filter(r => r.missingCount > 0 && r.missingCount <= 2);
      case 'quick': return rawResults.filter(r => (r.dish.cookTime || 60) <= 45);
      case 'favorites': return rawResults.filter(r => user.favoriteDishIds?.includes(r.dish.id));
      default: return rawResults;
    }
  }, [rawResults, activeFilter, user.favoriteDishIds]);

  const toPersian = (n: number) => n.toLocaleString('fa-IR', { maximumFractionDigits: 6 });

  const getResultCount = (filter: ResultFilter) => {
    if (!rawResults) return 0;
    switch (filter) {
      case 'perfect': return rawResults.filter(r => r.isPerfect).length;
      case 'cookable': return rawResults.filter(r => r.isFullyCookable).length;
      case 'near': return rawResults.filter(r => r.missingCount > 0 && r.missingCount <= 2).length;
      case 'quick': return rawResults.filter(r => (r.dish.cookTime || 60) <= 45).length;
      case 'favorites': return rawResults.filter(r => user.favoriteDishIds?.includes(r.dish.id)).length;
      default: return rawResults.length;
    }
  };
  const isInventoryMode = user.kitchenMode !== 'without-inventory';
  const selectedPurchaseItem = inventory.find(item => newItemName.trim() && isInventoryIngredientMatch(item.name, newItemName.trim()));
  const purchaseLimitReached = Boolean(selectedPurchaseItem && activePurchaseBatchCount(getInventoryBatches(selectedPurchaseItem)) >= MAX_ACTIVE_PURCHASE_BATCHES);

  const renderOverviewQuantity = (item: InventoryItem) => selectedInventoryItemId === item.id ? (
    <div className="flex items-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50 p-1" onClick={event => event.stopPropagation()}>
      <button type="button" aria-label={`کم کردن ${item.name}`} onClick={() => {
        const step = item.unit === 'کیلوگرم' ? 0.1 : 1;
        updateInventoryItem(item.id, { amount: Math.max(0, roundQuantity(item.amount - step)) });
      }} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-rose-600"><Minus size={15} /></button>
      <input type="number" min="0" step="any" value={item.amount} aria-label={`مقدار ${item.name}`} onChange={event => updateInventoryItem(item.id, { amount: Math.max(0, Number(event.target.value) || 0) })} className="w-20 rounded-lg bg-white px-2 py-2 text-center text-sm font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-200" />
      <select aria-label={`واحد ${item.name}`} value={item.unit} onChange={event => changeInventoryUnit(item, event.target.value)} className="max-w-28 rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200">
        <option value="کیلوگرم">کیلوگرم</option><option value="عدد">عدد</option><option value="بسته">بسته</option><option value="لیتر">لیتر</option><option value="گرم">گرم</option><option value="میلی‌لیتر">میلی‌لیتر</option>
      </select>
      <button type="button" aria-label={`زیاد کردن ${item.name}`} onClick={() => {
        const step = item.unit === 'کیلوگرم' ? 0.1 : 1;
        updateInventoryItem(item.id, { amount: roundQuantity(item.amount + step) });
      }} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-emerald-700"><Plus size={15} /></button>
    </div>
  ) : <span className="whitespace-nowrap font-black text-emerald-800">{toPersian(item.amount)} <small className="font-semibold text-slate-500">{item.unit}</small></span>;

  const renderInlineInventoryForm = (compact = false) => <form onSubmit={event => { event.preventDefault(); const price = Number(newItemUnitPrice); void addToInventory(newItemName, Number(newItemAmount), newItemUnit || suggestPantryUnit(newItemName), false, newItemExpiry, Number.isFinite(price) && price > 0 ? price : undefined); }} className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-[minmax(160px,1fr)_90px_130px_140px_150px_auto_auto]' : 'grid-cols-1 md:grid-cols-[minmax(220px,1fr)_110px_135px_145px_160px_auto_auto]'}`}>
    <FoodIngredientCombobox id={`inline-pantry-name-${compact ? 'modal' : 'list'}`} inputRef={newItemNameRef} value={newItemName} onChange={value => { setNewItemName(value); setNewItemUnit(value.trim() ? suggestPantryUnit(value) : ''); }} onSelect={value => setNewItemUnit(suggestPantryUnit(value))} placeholder="نام ماده را جست‌وجو یا وارد کن…" />
    <input aria-label="مقدار قلم تازه" type="number" min="0" step="any" value={newItemAmount} onChange={event => setNewItemAmount(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-black outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
    {newItemName.trim() && !PANTRY_ITEMS.some(category => category.subcategories.some(group => group.items.some(item => normalizePersian(item).trim() === normalizePersian(newItemName).trim()))) ? <><label className="sr-only" htmlFor={`inline-pantry-unit-${compact ? 'modal' : 'list'}`}>واحد مادهٔ دلخواه</label><select id={`inline-pantry-unit-${compact ? 'modal' : 'list'}`} aria-label="واحد مادهٔ دلخواه" value={newItemUnit || suggestPantryUnit(newItemName)} onChange={event => setNewItemUnit(event.target.value)} className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">{PANTRY_UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></> : <span className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-800">{newItemName.trim() ? `واحد استاندارد: ${suggestPantryUnit(newItemName)}` : 'واحد پس از انتخاب ماده'}</span>}
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-500"><CalendarDays size={15} className="shrink-0 text-[#276556]"/><span className="sr-only">تاریخ انقضا (اختیاری)</span><input aria-label="تاریخ انقضای سری خرید" title="تاریخ انقضا (اختیاری)" type="date" value={newItemExpiry} onChange={event => setNewItemExpiry(event.target.value)} className="min-w-0 w-full bg-transparent text-xs text-slate-700 outline-none" /></label>
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-500"><span className="shrink-0">تومان / {newItemUnit || (newItemName.trim() ? suggestPantryUnit(newItemName) : 'واحد')}</span><input aria-label={`قیمت هر ${newItemUnit || (newItemName.trim() ? suggestPantryUnit(newItemName) : 'واحد')} به تومان (اختیاری)`} type="number" min="0.01" step="any" value={newItemUnitPrice} onChange={event => setNewItemUnitPrice(event.target.value)} placeholder="اختیاری" className="min-w-0 w-full bg-transparent text-xs text-slate-700 outline-none" /></label>
    {purchaseLimitReached && <p role="status" className="sm:col-span-full rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">دو سری خرید فعال برای این ماده ثبت شده؛ پس از مصرف بخشی از آن‌ها، خرید بعدی را اضافه کن.</p>}
    <button type="submit" disabled={!newItemName.trim() || Number(newItemAmount) <= 0 || purchaseLimitReached} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={17} /> افزودن</button>
    <button type="button" aria-label="بستن ردیف افزودن" onClick={() => setIsInlineAddingInventory(false)} className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-3 py-3 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><X size={17} /></button>
  </form>;

  return (
    <div className="pantry-page flex flex-col h-full [@media(orientation:landscape)_and_(max-height:500px)]:h-auto animate-enter">
      <section className="pantry-hero" aria-label="پیشنهاد غذا بر پایهٔ موجودی آشپزخانه">
        <div className="pantry-hero-copy"><span className="pantry-hero-label"><ChefHat size={15}/> آشپزخانهٔ تو</span>
          <h1>امروز چی بپزم؟</h1>
          <p>{user.kitchenMode === 'without-inventory' ? 'در حالت مستقل از انبار، پیشنهادها بدون توجه به موجودی ثبت‌شده چیده می‌شوند؛ هر زمان خواستی از کلید پایین حالت را عوض کن.' : 'موجودی ثبت‌شده‌ات را به‌روز کن تا پیشنهادها با مواد خانه جور باشند و کسری‌های خرید دقیق حساب شوند.'}</p>
        </div><div className="pantry-hero-photo" role="img" aria-label="زرشک پلو با مرغ زعفرانی خانگی" />
        <div className="pantry-hero-stats">
          <div className="pantry-hero-controls">
            <div className="pantry-mode-switch-wrap">
              <button
                type="button"
                role="switch"
                aria-checked={isInventoryMode}
                aria-label="استفاده از موجودی انبار برای پیشنهاد غذا"
                className={`pantry-mode-switch ${isInventoryMode ? 'is-on' : 'is-off'}`}
                onClick={() => void onKitchenModeChange(isInventoryMode ? 'without-inventory' : 'with-inventory')}
              >
                <span className="pantry-mode-icon"><Package size={19} /></span>
                <span className="pantry-mode-copy">
                  <strong>استفاده از موجودی انبار</strong>
                  <small>{isInventoryMode ? 'پیشنهادها با مواد خانه هماهنگ‌اند' : 'پیشنهادها مستقل از انبارند'}</small>
                </span>
                <span className="pantry-mode-status">{isInventoryMode ? 'روشن' : 'خاموش'}</span>
                <span className="pantry-mode-track" aria-hidden="true"><i /></span>
              </button>
            </div>
            <div className="pantry-hero-inventory">
              <div className="pantry-toolbar-title">
                <div className="pantry-toolbar-icon"><Package size={18} /></div>
                <div><strong>انبار مواد غذایی آشپزخانه</strong><span>{toPersian(inventory.length)} قلم ثبت‌شده</span></div>
              </div>
              {isInventoryMode ? <button
                type="button"
                onClick={suggestFromInventory}
                disabled={inventory.length === 0 || isSearching}
                className="pantry-hero-stock-cta"
              >
                {isSearching ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                <span>{isSearching ? 'در حال بررسی…' : 'پیشنهاد غذا با موجودی'}</span>
              </button> : <button
                type="button"
                onClick={() => void onKitchenModeChange('with-inventory')}
                className="pantry-hero-stock-cta"
              >
                <Package size={16} />
                <span>روشن‌کردن انبار</span>
              </button>}
            </div>
          </div>
          {isInventoryMode && <div className="pantry-hero-metrics">
            <span><Package size={15}/><strong>{toPersian(inventory.length)}</strong> ماده در انبار</span>
            <i/>
            <span><ChefHat size={15}/><strong>{toPersian(dishCount)}</strong> دستور در کتابخانه</span>
            <i/>
            <span className={lowStockItems.length ? 'stock-alert' : ''}><AlertTriangle size={14}/><strong>{toPersian(lowStockItems.length)}</strong> نیازمند توجه</span>
          </div>}
        </div>
      </section>
      {isInventoryMode ? <>
      <div className="flex-grow overflow-y-auto [@media(orientation:landscape)_and_(max-height:500px)]:overflow-visible px-4 sm:px-10 pb-20 no-scrollbar">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 space-y-6 sm:space-y-10">
              <div className="space-y-6 animate-enter">
                  {/* بخش هشدار موجودی کم */}
                  {lowStockItems.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                      <AlertTriangle className="text-rose-500 shrink-0 mt-1" size={20} />
                      <div className="flex-grow">
                        <h4 className="text-rose-800 font-black text-xs sm:text-sm">هشدار موجودی رو به اتمام!</h4>
                        <p className="text-rose-600 text-[10px] sm:text-xs mt-1">مواد زیر در آستانه تمام شدن هستند، پیشنهاد می‌شود به لیست خرید اضافه کنید:</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {lowStockItems.map(item => (
                            <div key={item.id} className="px-2 py-1 bg-white border border-rose-200 text-rose-700 rounded-lg text-[10px] font-black flex items-center gap-2">
                              {item.name} ({toPersian(item.amount)} {item.unit})
                                <button onClick={() => {
                                  const currentList = [...(user.customShoppingList || [])];

                                  // Strictly allow only 3 categories: proteins, grains, vegetables
                                  const categoryId = getIngredientCategoryId(item.name);
                                  const allowedCategories = ['proteins', 'grains', 'vegetables'];
                                  if (!categoryId || !allowedCategories.includes(categoryId)) return;

                                  const existingIdx = currentList.findIndex(i => i.name === item.name);
                                  let amountToAdd = item.minThreshold * 2;
                                  const amountUnit = item.minThresholdUnit || item.unit;

                                  if (existingIdx !== -1) {
                                    const existingUnit = currentList[existingIdx].unit || amountUnit;
                                    if (existingUnit !== amountUnit) {
                                      const amountBase = convertToBase(amountToAdd, amountUnit, item.name);
                                      const existingBase = convertToBase(1, existingUnit, item.name);
                                      if (!areUnitsComparable(amountBase, existingBase) || existingBase.value <= 0) {
                                        setAddMessage(`واحد ${amountUnit} با واحد ${existingUnit} قابل تبدیل مطمئن نیست؛ مقدار به فهرست خرید افزوده نشد.`);
                                        return;
                                      }
                                      amountToAdd = amountBase.value / existingBase.value;
                                    }
                                    currentList[existingIdx] = {
                                      ...currentList[existingIdx],
                                      amount: (currentList[existingIdx].amount || 0) + amountToAdd
                                    };
                                  } else {
                                    currentList.push({
                                      id: Math.random().toString(),
                                      name: item.name,
                                      checked: false,
                                      amount: amountToAdd,
                                      unit: amountUnit
                                    });
                                  }

                                  onUpdateUser({ ...user, customShoppingList: currentList });
                                  UserService.updateShoppingList(user.username, currentList);
                                }} className="text-teal-600 hover:text-teal-700"><ShoppingCart size={14} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {expiringItems.length > 0 && <section aria-label="مواد نزدیک به تاریخ انقضا" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3"><CalendarDays size={20} className="mt-0.5 shrink-0 text-amber-700"/><div className="min-w-0 flex-1"><h4 className="text-sm font-black text-amber-950">این مواد را زودتر مصرف کن</h4><p className="mt-1 text-xs leading-5 text-amber-800">بر اساس نزدیک‌ترین تاریخ ثبت‌شده؛ هنگام مصرف، سری‌ای که زودتر منقضی می‌شود اول از انبار کم می‌شود.</p><div className="mt-3 flex flex-wrap gap-2">{expiringItems.map(({ item, date }) => { const state = inventoryExpiryState(date); const label = state === 'expired' ? 'تاریخ گذشته' : state === 'soon' ? 'تا ۳ روز' : 'تا یک هفته'; return <button key={item.id} type="button" onClick={() => setSelectedBatchItem(item)} className={`rounded-xl border px-3 py-2 text-right text-xs font-black ${state === 'expired' ? 'border-rose-200 bg-white text-rose-700' : 'border-amber-200 bg-white text-amber-900'}`}><span className="block">{item.name} · {label}</span><small className="mt-1 block font-semibold opacity-75">{new Date(`${date}T00:00:00`).toLocaleDateString('fa-IR')}</small></button>; })}</div></div></div>
                  </section>}

                  {user.inventoryNeedsReview && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><p>موجودی‌های قبلی حفظ شده‌اند. اگر قبلاً مقدار اشتباه کم شده، مقدار واقعی اقلام را یک‌بار اصلاح کن؛ از روی سوابق قدیمی نمی‌توان مصرف واقعی را بازسازی کرد.</p><button type="button" onClick={() => { const updated = { ...user, inventoryNeedsReview: false }; onUpdateUser(updated); void UserService.updateProfile(user.username, { inventoryNeedsReview: false }); }} className="rounded-xl bg-white px-4 py-2 font-bold">مقدارها را بررسی کردم</button></div>}
                  {addMessage && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">{addMessage}</p>}
                  <div className="grid grid-cols-1 gap-6 pantry-workspace">
                    {/* لیست موجودی فعلی */}
                    <div className="order-1 space-y-4 pantry-inventory-panel">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-slate-800 font-black text-sm sm:text-base flex items-center gap-2">
                          <Package className="text-teal-500" size={20} />
                          موجودی انبار شما
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-black">{toPersian(inventory.length)} قلم در انبار</span>
                          <InventoryHistory user={user} onUpdateUser={onUpdateUser}/>
                          <button type="button" onClick={() => setIsInventoryOverviewOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100" aria-haspopup="dialog">
                            <Plus size={16} /> افزودن / مدیریت موجودی
                          </button>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                        {inventory.length > 0 ? (
                          <div className="pantry-inventory-list">
                            {[...inventory].sort((a, b) => a.name.localeCompare(b.name, 'fa')).map(item => (
                              <div key={item.id} className={`pantry-inventory-row p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedInventoryItemId === item.id ? 'is-selected' : ''}`} role="group" aria-label={`قلم ${item.name}`} aria-current={selectedInventoryItemId === item.id ? 'true' : undefined}>
                                <div className="flex items-center gap-3">
                                  <button type="button" onClick={() => setSelectedInventoryItemId(selectedInventoryItemId === item.id ? null : item.id)} aria-label={`${selectedInventoryItemId === item.id ? 'پایان ویرایش' : 'ویرایش'} ${item.name}`} aria-pressed={selectedInventoryItemId === item.id} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${selectedInventoryItemId === item.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-800'}`}><Pencil size={15} /></button>
                                  <PantryFoodThumbnail item={item.name} />
                                  <div>
                                    <h4 className="text-slate-800 font-black text-xs sm:text-sm">{item.name}</h4>
                                    <span className={`pantry-stock-state ${isBelowThreshold(item) ? 'is-low' : ''}`}>{isBelowThreshold(item) ? `کم · ${toPersian(item.amount)} ${item.unit}` : `موجود: ${toPersian(item.amount)} ${item.unit}`}</span>
                                    {earliestExpiry(item) && <small className={`mt-1 block text-[10px] font-bold ${inventoryExpiryState(earliestExpiry(item)) === 'expired' ? 'text-rose-700' : inventoryExpiryState(earliestExpiry(item)) === 'soon' ? 'text-amber-800' : 'text-slate-500'}`}>نزدیک‌ترین انقضا: {new Date(`${earliestExpiry(item)}T00:00:00`).toLocaleDateString('fa-IR')}</small>}
                                  </div>
                                </div>
                                  <div className="pantry-item-actions flex items-center gap-3">
                                    <button type="button" onClick={() => setSelectedBatchItem(item)} title={`مدیریت سری‌های خرید و تاریخ انقضای ${item.name}`} aria-label={`تاریخ‌ها و سری‌های خرید ${item.name}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 text-[10px] font-black text-amber-800 hover:bg-amber-100"><CalendarDays size={15}/><span className="hidden sm:inline">تاریخ‌ها</span></button>
                                    <div className="pantry-control-stack flex flex-col items-end gap-1">
                                      {selectedInventoryItemId === item.id ? <div className="pantry-quantity-control flex items-center bg-slate-100 rounded-lg p-1">
                                        <div className="flex items-center gap-1">
                                          <button onClick={() => {
                                            const step = item.unit === 'کیلوگرم' ? 0.1 : 1;
                                            updateInventoryItem(item.id, { amount: Math.max(0, roundQuantity(item.amount - step)) });
                                          }} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><Minus size={14} /></button>
                                          <div className="px-2 min-w-[100px] flex items-center justify-center gap-1">
                                            <input
                                              type="number" min="0"
                                              step="any"
                                              value={item.amount}
                                              onBlur={e => updateInventoryItem(item.id, { amount: Math.max(0, Number(e.target.value) || 0) })}
                                              onChange={(e) => updateInventoryItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                              className={`w-14 bg-white/50 rounded px-1 py-0.5 text-xs font-black outline-none text-center border border-transparent focus:border-teal-300 transition-all ${isBelowThreshold(item) ? 'text-rose-600' : 'text-slate-700'}`}
                                            />
                                            <select
                                              value={item.unit}
                                              onChange={(e) => changeInventoryUnit(item, e.target.value)}
                                              className="text-[9px] text-slate-400 bg-transparent outline-none cursor-pointer hover:text-teal-500"
                                            >
                                              <option value="کیلوگرم">کیلوگرم</option>
                                              <option value="عدد">عدد</option>
                                              <option value="بسته">بسته</option>
                                              <option value="لیتر">لیتر</option>
                                              <option value="گرم">گرم</option>
                                              <option value="میلی‌لیتر">میلی‌لیتر</option>
                                            </select>
                                          </div>
                                          <button onClick={() => {
                                            const step = item.unit === 'کیلوگرم' ? 0.1 : 1;
                                            updateInventoryItem(item.id, { amount: roundQuantity(item.amount + step) });
                                          }} className="p-1 hover:bg-white rounded-md text-slate-500 transition-all"><Plus size={14} /></button>
                                        </div>
                                      </div> : <span className="px-2 py-2 text-xs font-black text-emerald-800">{toPersian(item.amount)} {item.unit}</span>}
                                      <label className="pantry-threshold-control">
                                        <span>هشدار در</span>
                                        <input
                                          type="number" min="0" step="any"
                                          value={item.minThreshold}
                                          onBlur={e => updateInventoryItem(item.id, { minThreshold: Math.max(0, Number(e.target.value) || 0) })}
                                          onChange={(e) => updateInventoryItem(item.id, { minThreshold: parseFloat(e.target.value) || 0 })}
                                          aria-label={`مقدار هشدار برای ${item.name}`}
                                        />
                                        <select
                                          aria-label={`واحد هشدار برای ${item.name}`}
                                          value={item.minThresholdUnit || item.unit}
                                          onChange={e => {
                                            const previousUnit = item.minThresholdUnit || item.unit;
                                            const nextUnit = e.target.value;
                                            const converted = convertAmountBetweenUnits(item.minThreshold, previousUnit, nextUnit, item.name);
                                            if (!converted) {
                                              setAddMessage('واحد آستانه باید از همان بُعد موجودی باشد؛ مثلاً کیلوگرم با گرم.');
                                              return;
                                            }
                                            updateInventoryItem(item.id, { minThreshold: converted.amount, minThresholdUnit: nextUnit });
                                            if (converted.estimated) setAddMessage(`آستانهٔ ${item.name} با وزن مرجع متوسط تبدیل شد؛ اگر وزن دقیق داری، آن را ثبت کن.`);
                                          }}
                                        >
                                          <option value="کیلوگرم">کیلوگرم</option><option value="عدد">عدد</option><option value="بسته">بسته</option><option value="لیتر">لیتر</option><option value="گرم">گرم</option><option value="میلی‌لیتر">میلی‌لیتر</option>
                                        </select>
                                      </label>
                                    </div>
                                    <button onClick={event => { event.stopPropagation(); if (selectedInventoryItemId === item.id) setSelectedInventoryItemId(null); removeFromInventory(item.id); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                                  </div>
                              </div>
                            ))}
                            <button type="button" onClick={() => { setInventoryOverviewView('rows'); setIsInlineAddingInventory(true); setIsInventoryOverviewOpen(true); }} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 px-4 py-3 text-sm font-black text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-100"><Plus size={18} /> افزودن قلم جدید به انبار</button>
                          </div>
                        ) : (
                          <div className="pantry-empty-state">
                            <span className="pantry-empty-icon"><Package size={25}/></span>
                            <div><strong>انبارت را با چند قلم پرکاربرد شروع کن</strong><p>روی هر مورد بزن تا یک‌راست به انبار اضافه شود؛ بعد مقدار دقیقش را تنظیم کن.</p></div>
                            <div className="pantry-starter-grid">
                              {starterItemsToAdd.map(item => (
                                <button type="button" key={item} onClick={() => addToInventory(item)}><PantryFoodThumbnail item={item} /><span>{item}</span><Plus size={14}/></button>
                              ))}
                            </div>
                          </div>
                        )}
                        {inventory.length > 0 && starterItemsToAdd.length > 0 && (
                          <div className="space-y-1 border-t border-slate-100 p-4 sm:p-5">
                            <div><strong className="text-sm font-black text-slate-700">قلم‌های پرکاربرد بعدی</strong><p className="mt-1 text-xs leading-6 text-slate-500">مواردی را که هنوز در انبارت نیستند انتخاب کن؛ پیشنهادها بعد از هر افزودن باقی می‌مانند.</p></div>
                            <div className="pantry-starter-grid">
                              {starterItemsToAdd.map(item => (
                                <button type="button" key={item} onClick={() => addToInventory(item)}><PantryFoodThumbnail item={item} /><span>{item}</span><Plus size={14}/></button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
              </div>

              {rawResults && (
                <div ref={resultsAreaRef} className="space-y-6 sm:space-y-10 animate-enter pt-6 sm:pt-10 border-t border-slate-100 scroll-mt-24">
                  <div className="pantry-result-filters bg-white border border-slate-200 p-2 sm:p-4 rounded-2xl sm:rounded-[2.5rem] flex flex-wrap items-center gap-2 sm:gap-3 shadow-lg max-w-5xl mx-auto">
                     {[
                       { id: 'all', label: 'همه پیشنهادات', icon: Sparkles },
                       { id: 'cookable', label: 'قابل پخت', icon: UtensilsCrossed },
                       { id: 'perfect', label: 'آماده طبخ', icon: CheckCircle2 },
                       { id: 'near', label: 'کمبود جزئی', icon: AlertCircle },
                       { id: 'favorites', label: 'محبوب‌ها', icon: Heart },
                     ].map(filter => {
                       const count = getResultCount(filter.id as ResultFilter);
                       return (
                         <button
                          key={filter.id}
                          onClick={() => setActiveFilter(filter.id as ResultFilter)}
                          className={`flex-grow px-3 py-2.5 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition-all border-2 ${activeFilter === filter.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-transparent text-slate-500 hover:border-slate-200'}`}
                         >
                           <filter.icon size={12} sm:size={16} />
                           {filter.label}
                           <span className={`px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] ${activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                             ({toPersian(count)})
                           </span>
                         </button>
                       )
                     })}
                  </div>

                  <div className="pantry-results-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 pb-10">
                    {filteredResults && filteredResults.length > 0 ? filteredResults.map(({ dish, missingCount, isPerfect, isFullyCookable }) => (
                      <div key={dish.id} className="relative animate-enter">
                        {isFullyCookable && <div className="absolute -top-2 -right-2 z-20 bg-teal-500 text-white px-3 py-1 rounded-lg shadow-xl border-2 border-white font-black text-[8px] sm:text-[10px]">موجود در انبار</div>}
                        {!isFullyCookable && isPerfect && <div className="absolute -top-2 -right-2 z-20 bg-emerald-500 text-white px-3 py-1 rounded-lg shadow-xl border-2 border-white font-black text-[8px] sm:text-[10px]">آماده طبخ</div>}
                        <MealCard plan={{ dayName: isFullyCookable ? 'کامل' : isPerfect ? 'آماده' : `${toPersian(missingCount)} کسری`, dish }} user={user} onUpdateUser={onUpdateUser} />
                      </div>
                    )) : (
                      <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-3">
                          <ChefHat size={40} className="text-slate-100" />
                          <p className="text-slate-400 font-black text-sm italic">غذایی با مواد انتخابی یافت نشد.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
      </div>
      </> : <section className="pantry-discovery-card" aria-label="پیشنهاد و برنامه‌ریزی بدون انبار">
        <div className="pantry-discovery-mark"><Sparkles size={21} /></div>
        <div className="pantry-discovery-copy">
          <strong>بدون ثبت موجودی هم آشپزی کن</strong>
          <span>از میان دستورها جستجو کن یا برنامهٔ غذایی‌ات را مستقل از انبار بچین.</span>
        </div>
        <div className="pantry-discovery-actions">
          <button type="button" onClick={() => onNavigate('plan')}>برنامهٔ غذایی</button>
          <button type="button" onClick={() => onNavigate('search')}>جستجوی غذا</button>
        </div>
      </section>}
      {isInventoryOverviewOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-2 text-slate-800 backdrop-blur-md animate-enter sm:p-4" dir="rtl" role="presentation" onClick={() => setIsInventoryOverviewOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="inventory-overview-title" className="flex h-[calc(100dvh-16px)] max-h-[calc(100dvh-16px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-[#f4f7f4] shadow-2xl shadow-slate-950/30 sm:h-[calc(100dvh-40px)] sm:max-h-[calc(100dvh-40px)] sm:rounded-[2rem]" onClick={event => event.stopPropagation()}>
            <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-emerald-100 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-8 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Package size={22} /></span>
                <div className="min-w-0">
                  <h2 id="inventory-overview-title" className="truncate text-lg font-black text-slate-900 sm:text-2xl">موجودی انبار آشپزخانه</h2>
                  <p className="mt-1 text-xs text-slate-500">{toPersian(inventory.length)} قلم غذایی · مرتب‌شده بر اساس نام</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 sm:flex" role="group" aria-label="نوع نمایش موجودی">
                  <button type="button" onClick={() => setInventoryOverviewView('rows')} aria-pressed={inventoryOverviewView === 'rows'} className={`rounded-lg px-3 py-2 text-xs font-black transition ${inventoryOverviewView === 'rows' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>ردیفی</button>
                  <button type="button" onClick={() => setInventoryOverviewView('table')} aria-pressed={inventoryOverviewView === 'table'} className={`rounded-lg px-3 py-2 text-xs font-black transition ${inventoryOverviewView === 'table' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>جدولی</button>
                </div>
                <button type="button" onClick={() => setIsInventoryOverviewOpen(false)} aria-label="بستن مدیریت موجودی" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100"><X size={20} /></button>
              </div>
            </header>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-4 py-2 sm:hidden">
              <span className="text-xs font-bold text-slate-500">نوع نمایش</span>
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="نوع نمایش موجودی">
                <button type="button" onClick={() => setInventoryOverviewView('rows')} aria-pressed={inventoryOverviewView === 'rows'} className={`rounded-lg px-3 py-1.5 text-xs font-black ${inventoryOverviewView === 'rows' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}>ردیفی</button>
                <button type="button" onClick={() => setInventoryOverviewView('table')} aria-pressed={inventoryOverviewView === 'table'} className={`rounded-lg px-3 py-1.5 text-xs font-black ${inventoryOverviewView === 'table' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}>جدولی</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
              <div className="mx-auto max-w-[1380px] overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-lg shadow-emerald-950/5 sm:rounded-3xl">
                {inventory.length ? inventoryOverviewView === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-right">
                      <thead className="bg-emerald-50 text-xs font-black text-emerald-900 sm:text-sm">
                        <tr><th className="w-24 px-4 py-4 sm:px-6">ویرایش</th><th className="px-4 py-4 sm:px-6">مادهٔ غذایی</th><th className="px-4 py-4 sm:px-6">موجودی</th><th className="px-4 py-4 sm:px-6">آستانهٔ هشدار</th><th className="px-4 py-4 sm:px-6">وضعیت</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...inventory].sort((a, b) => a.name.localeCompare(b.name, 'fa')).map(item => {
                          const isLow = isBelowThreshold(item);
                          return <tr key={item.id} className={`pantry-overview-table-row transition hover:bg-emerald-50/40 ${selectedInventoryItemId === item.id ? 'is-selected' : ''}`}>
                            <td className="px-4 py-3 sm:px-6"><button type="button" onClick={() => setSelectedInventoryItemId(selectedInventoryItemId === item.id ? null : item.id)} aria-label={`ویرایش ${item.name}`} aria-pressed={selectedInventoryItemId === item.id} className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${selectedInventoryItemId === item.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-800'}`}><Pencil size={15} /></button></td>
                            <td className="px-4 py-3 font-bold text-slate-800 sm:px-6">{item.name}</td>
                            <td className="whitespace-nowrap px-4 py-3 sm:px-6">{renderOverviewQuantity(item)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600 sm:px-6">{toPersian(item.minThreshold)} {item.minThresholdUnit || item.unit}</td>
                            <td className="px-4 py-3 sm:px-6"><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${isLow ? 'bg-rose-50 text-rose-700' : selectedInventoryItemId === item.id ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-800'}`}><i className={`h-1.5 w-1.5 rounded-full ${isLow ? 'bg-rose-500' : selectedInventoryItemId === item.id ? 'bg-emerald-200' : 'bg-emerald-500'}`} />{isLow ? 'نیازمند خرید' : 'موجود'}</span><button type="button" onClick={() => setSelectedBatchItem(item)} aria-label={`تاریخ‌ها و سری‌های خرید ${item.name}`} className="rounded-lg bg-amber-50 p-2 text-amber-800 hover:bg-amber-100"><CalendarDays size={15}/></button>{earliestExpiry(item) && <small className="text-[10px] font-bold text-amber-800">{new Date(`${earliestExpiry(item)}T00:00:00`).toLocaleDateString('fa-IR')}</small>}</div></td>
                          </tr>;
                        })}
                        {isInlineAddingInventory ? <tr><td colSpan={5} className="bg-emerald-50/60 p-3 sm:p-4">{renderInlineInventoryForm(true)}</td></tr> : <tr><td colSpan={5} className="p-2 sm:p-3"><button type="button" onClick={() => setIsInlineAddingInventory(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/70 px-4 py-3 text-sm font-black text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-100"><Plus size={18} /> افزودن ردیف جدید</button></td></tr>}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-50 p-3 sm:p-5">
                    {[...inventory].sort((a, b) => a.name.localeCompare(b.name, 'fa')).map(item => {
                      const isLow = isBelowThreshold(item);
                      return <article key={item.id} className={`pantry-overview-row-card grid items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition sm:grid-cols-[minmax(180px,1fr)_auto_auto] sm:gap-5 sm:p-4 ${selectedInventoryItemId === item.id ? 'is-selected' : 'border-slate-100 hover:border-emerald-200'}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <button type="button" onClick={() => setSelectedInventoryItemId(selectedInventoryItemId === item.id ? null : item.id)} aria-label={`ویرایش ${item.name}`} aria-pressed={selectedInventoryItemId === item.id} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${selectedInventoryItemId === item.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-800'}`}><Pencil size={15} /></button>
                          <PantryFoodThumbnail item={item.name} />
                          <div className="min-w-0"><h3 className="truncate font-black text-slate-800">{item.name}</h3><p className={`mt-1 text-xs font-bold ${isLow ? 'text-rose-700' : 'text-emerald-800'}`}>{isLow ? 'نیازمند خرید' : 'موجود'} · هشدار در {toPersian(item.minThreshold)} {item.minThresholdUnit || item.unit}</p>{earliestExpiry(item) && <p className="mt-1 text-[10px] font-bold text-amber-800">نزدیک‌ترین انقضا: {new Date(`${earliestExpiry(item)}T00:00:00`).toLocaleDateString('fa-IR')}</p>}<button type="button" onClick={() => setSelectedBatchItem(item)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-800"><CalendarDays size={13}/>سری خرید و تاریخ مصرف</button></div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-xs font-semibold text-slate-500 sm:hidden">موجودی</span>{renderOverviewQuantity(item)}</div>
                      </article>;
                    })}
                    {isInlineAddingInventory ? <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 p-3 sm:p-4">{renderInlineInventoryForm()}</div> : <button type="button" onClick={() => setIsInlineAddingInventory(true)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-white px-4 py-3 text-sm font-black text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-50"><Plus size={18} /> افزودن ردیف جدید</button>}
                  </div>
                ) : <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><Package size={34} className="text-emerald-300" /><strong className="text-slate-700">هنوز قلمی در انبار ثبت نشده است</strong><span className="text-sm text-slate-500">با ردیف افزودن، موجودی آشپزخانه‌ات را ثبت کن.</span><button type="button" onClick={() => setIsInlineAddingInventory(true)} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white"><Plus size={17} /> افزودن مادهٔ غذایی</button>{isInlineAddingInventory && <div className="mt-3 w-full max-w-3xl">{renderInlineInventoryForm()}</div>}</div>}
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}
      {pendingUnitCorrection && createPortal(
        <div className="fixed inset-0 z-[11000] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" dir="rtl" role="presentation" onClick={() => setPendingUnitCorrection(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="unit-correction-title" className="w-full max-w-lg rounded-[28px] border border-white/70 bg-[#f7f9f6] p-5 shadow-2xl sm:p-7" onClick={event => event.stopPropagation()}>
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800"><AlertTriangle size={21}/></span><div><h2 id="unit-correction-title" className="text-lg font-black text-slate-900">اصلاح دستی واحد {pendingUnitCorrection.name}</h2><p className="mt-1 text-xs leading-6 text-slate-600">برای تبدیل {pendingUnitCorrection.oldUnit} به {pendingUnitCorrection.nextUnit} مرجع قابل اعتمادی نداریم. موجودی قبلی تغییر نکرده؛ مقدار واقعی را با واحد تازه وارد کن.</p></div></div>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">موجودی ثبت‌شده: <strong>{toPersian(pendingUnitCorrection.oldAmount)} {pendingUnitCorrection.oldUnit}</strong><br/>آستانهٔ هشدار فعلی: <strong>{toPersian(pendingUnitCorrection.oldThreshold)} {pendingUnitCorrection.oldThresholdUnit}</strong></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">موجودی واقعی به {pendingUnitCorrection.nextUnit}<input autoFocus type="number" min="0" step="any" value={pendingUnitCorrection.amount} onChange={event => setPendingUnitCorrection(current => current ? { ...current, amount: event.target.value } : current)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600" /></label>
              <label className="text-xs font-bold text-slate-600">آستانهٔ هشدار به {pendingUnitCorrection.nextUnit}<input type="number" min="0" step="any" value={pendingUnitCorrection.threshold} onChange={event => setPendingUnitCorrection(current => current ? { ...current, threshold: event.target.value } : current)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600" /></label>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-slate-500">هر دو مقدار را بررسی کن؛ مقدار قبلیِ قاشق/پیمانه بدون حدس به کیلوگرم یا واحد تازه تبدیل نمی‌شود.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setPendingUnitCorrection(null)} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200">انصراف</button><button type="button" disabled={!pendingUnitCorrection.amount.trim() || !pendingUnitCorrection.threshold.trim() || !Number.isFinite(Number(pendingUnitCorrection.amount)) || !Number.isFinite(Number(pendingUnitCorrection.threshold)) || Number(pendingUnitCorrection.amount) < 0 || Number(pendingUnitCorrection.threshold) < 0} onClick={() => {
              const correction = pendingUnitCorrection;
              if (!correction) return;
              updateInventoryItem(correction.id, { amount: Number(correction.amount), unit: correction.nextUnit, minThreshold: Number(correction.threshold), minThresholdUnit: correction.nextUnit });
              setAddMessage(`موجودی و آستانهٔ ${correction.name} با واحد ${correction.nextUnit} اصلاح شد.`);
              setPendingUnitCorrection(null);
            }} className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">ثبت مقدار و واحد جدید</button></div>
          </section>
        </div>, document.body
      )}
      {selectedBatchItem && <InventoryBatchManager item={inventory.find(item => item.id === selectedBatchItem.id) || selectedBatchItem} onClose={() => setSelectedBatchItem(null)} onSave={batches => {
        const item = inventory.find(row => row.id === selectedBatchItem.id) || selectedBatchItem;
        const nextItem = { ...item, stockBatches: batches, amount: sumInventoryBatches(batches), lastUpdated: Date.now() };
        const nextInventory = inventory.map(row => row.id === item.id ? nextItem : row);
        const purchaseHistory = mergePurchaseHistory(user.purchaseHistory || [], item, batches);
        onUpdateUser({ ...user, inventory: nextInventory, purchaseHistory });
        UserService.updateProfile(user.username, { inventory: nextInventory, purchaseHistory }).catch(error => console.error('Failed to save inventory batches:', error));
        setSelectedBatchItem(null);
      }} />}
      {selectedDish && <RecipeModal dish={selectedDish} isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} user={user} onUpdateUser={onUpdateUser} />}
    </div>
  );
};

export default PantryChef;
