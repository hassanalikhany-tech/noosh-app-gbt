import { normalizePersian } from '../utils/text';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, Sparkles, X, UtensilsCrossed, RefreshCw, Trash2, CheckCircle2, AlertCircle, Clock, Heart, Filter, Package, AlertTriangle, Plus, Save, ShoppingCart, Pencil, CalendarDays, PackageCheck } from 'lucide-react';
import { PANTRY_ITEMS, getIngredientCategoryId } from '../data/pantry';
import { RecipeService } from '../services/recipeService';
import { Dish, KitchenMode, UserProfile, InventoryItem, InventoryBatch, ShoppingItem } from '../types';
import { isIngredientMatch, isInventoryIngredientMatch, getStandardUnit, convertToBase, convertAmountBetweenUnits, areUnitsComparable, isDishProhibited, evaluateInventory, roundQuantity, getIngredientIdentity } from '../utils/recipeHelpers';
import { UserService } from '../services/userService';
import { getPantryUnitPreference, suggestPantryUnit } from '../utils/pantryUnits';
import RecipeModal from './RecipeModal';
import InventoryHistory from './InventoryHistory';
import MealCard from './MealCard';
import PantryFoodThumbnail from './PantryFoodThumbnail';
import InventoryBatchManager from './InventoryBatchManager';
import JalaliDateInput from './JalaliDateInput';
import { activePurchaseBatchCount, appendInventoryBatch, earliestExpiry, getInventoryBatches, inventoryExpiryState, MAX_ACTIVE_PURCHASE_BATCHES, sumInventoryBatches, resizeInventoryBatches } from '../utils/inventoryBatches';
import { mergePurchaseHistory } from '../utils/purchaseHistory';
import { formatGregorianDateAsPersian } from '../utils/persianDate';
import { PANTRY_UNIT_OPTIONS } from '../utils/pantryUnits';
import { mergeShoppingNeeds } from '../utils/shoppingQuantities';

interface PantryChefProps {
  page: 'home' | 'inventory';
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onNavigate: (view: 'plan' | 'search' | 'inventory') => void;
  onKitchenModeChange: (mode: KitchenMode) => Promise<void> | void;
  pendingPurchasedItems?: ShoppingItem[];
  onPurchasedItemsCancel?: (items: ShoppingItem[]) => Promise<void> | void;
  onPurchasedItemRemove?: (itemId: string) => Promise<void> | void;
}

interface PurchasedItemDraft { id: string; amount: string; unit: string; unitPrice: string; expiresOn: string; mergeBatchId: string }

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

const PantryChef: React.FC<PantryChefProps> = ({ page, user, onUpdateUser, onNavigate, onKitchenModeChange, pendingPurchasedItems = [], onPurchasedItemsCancel = (_items: ShoppingItem[]) => undefined, onPurchasedItemRemove = (_itemId: string) => undefined }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemThreshold, setNewItemThreshold] = useState('0');
  const [newItemThresholdUnit, setNewItemThresholdUnit] = useState('');
  const [newItemExpiry, setNewItemExpiry] = useState('');
  const [newItemUnitPrice, setNewItemUnitPrice] = useState('');
  const [addMessage, setAddMessage] = useState('');
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(null);
  const [pendingUnitCorrection, setPendingUnitCorrection] = useState<{ id: string; name: string; oldAmount: number; oldUnit: string; nextUnit: string; oldThreshold: number; oldThresholdUnit: string; amount: string; threshold: string } | null>(null);
  const [inventoryFormColumn, setInventoryFormColumn] = useState<number | null>(null);
  const [showInventoryAddConfirm, setShowInventoryAddConfirm] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState<InventoryItem | null>(null);
  const [dishCount, setDishCount] = useState(() => RecipeService.getAllDishes().length);
  const [purchaseDrafts, setPurchaseDrafts] = useState<PurchasedItemDraft[]>([]);
  const [purchaseReviewError, setPurchaseReviewError] = useState('');
  const [isSavingPurchasedItems, setIsSavingPurchasedItems] = useState(false);

  useEffect(() => {
    setPurchaseDrafts(current => {
      const existing = new Map(current.map(draft => [draft.id, draft]));
      return pendingPurchasedItems.map(item => existing.get(item.id) || ({
        id: item.id,
        amount: item.amount !== undefined && item.amount > 0 ? String(item.amount) : '',
        unit: item.unit || suggestPantryUnit(item.name),
        unitPrice: '',
        expiresOn: '',
        mergeBatchId: '',
      }));
    });
  }, [pendingPurchasedItems]);

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
    if (inventoryFormColumn === null) return;
    window.requestAnimationFrame(() => newItemNameRef.current?.focus());
  }, [inventoryFormColumn]);
  const starterItemsToAdd = PANTRY_STARTER_ITEMS.filter(name => !inventory.some(item => isInventoryIngredientMatch(item.name, name)));

  const isBelowThreshold = (item: InventoryItem) => {
    if (item.amount <= 0) return true;
    const current = convertToBase(item.amount, item.unit, item.name);
    const threshold = convertToBase(item.minThreshold, item.minThresholdUnit || item.unit, item.name);
    return areUnitsComparable(current, threshold) ? current.value <= threshold.value : false;
  };

  const lowStockItems = useMemo(() => {
    return inventory.filter(isBelowThreshold);
  }, [inventory]);

  const addLowStockToShoppingList = () => {
    const needs = lowStockItems.map(item => {
      const thresholdUnit = item.minThresholdUnit || item.unit;
      const threshold = Math.max(0, item.minThreshold || 0);
      const stockInThresholdUnit = convertAmountBetweenUnits(item.amount, item.unit, thresholdUnit, item.name);
      const targetAmount = threshold > 0 ? threshold * 2 : 1;
      const amountToBuy = Math.max(0, targetAmount - (stockInThresholdUnit?.amount ?? 0));
      return {
        item: item.name,
        amount: roundQuantity(amountToBuy),
        unit: threshold > 0 ? thresholdUnit : item.unit,
        category: getIngredientCategoryId(item.name) || undefined,
        estimated: stockInThresholdUnit?.estimated,
      };
    }).filter(need => need.amount > 0);

    const currentList = user.customShoppingList || [];
    const updatedList = mergeShoppingNeeds(currentList, needs, 'inventory-low-stock', 'هشدار انبار');
    onUpdateUser({ ...user, customShoppingList: updatedList });
    void UserService.updateShoppingList(user.username, updatedList);
    setAddMessage(needs.length
      ? `${toPersian(needs.length)} قلم از اقلام هشدار به سبد خرید اضافه شد.`
      : 'برای این اقلام مقدار خریدی لازم نبود.');
  };

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

  const addToInventory = async (itemName: string, amount = 1, unit?: string, focusNext = false, expiresOn = '', unitPrice?: number, minThreshold = 0, minThresholdUnit?: string): Promise<boolean> => {
    const cleanName = itemName.trim();
    if (!cleanName || !Number.isFinite(amount) || amount <= 0) return false;
    const prepareNextEntry = (nextColumn = 0) => {
      setNewItemName('');
      setNewItemAmount('1');
      setNewItemUnit('');
      setNewItemThreshold('0');
      setNewItemThresholdUnit('');
      setNewItemExpiry('');
      setNewItemUnitPrice('');
      if (focusNext) {
        setInventoryFormColumn(nextColumn);
        window.requestAnimationFrame(() => newItemNameRef.current?.focus());
      }
    };
    const existingItem = inventory.find(item => isInventoryIngredientMatch(item.name, cleanName));
    if (existingItem) {
      const inputUnit = unit || suggestPantryUnit(cleanName);
      const incoming = convertAmountBetweenUnits(amount, inputUnit, existingItem.unit, existingItem.name);
      if (!incoming || incoming.estimated) {
        setAddMessage(`واحد ورودی ${inputUnit} با موجودی ${existingItem.unit} تبدیل دقیق ندارد. ابتدا واحد و مقدار واقعی موجودی قبلی را از بخش ویرایش اصلاح کن؛ موجودی دست‌نخورده ماند.`);
        return false;
      }
      let appended: InventoryItem;
      const priceInInventoryUnit = unitPrice && incoming.amount > 0 ? unitPrice * amount / incoming.amount : undefined;
      try { appended = appendInventoryBatch(existingItem, incoming.amount, expiresOn || undefined, priceInInventoryUnit); }
      catch (error) { setAddMessage(error instanceof Error ? error.message : 'سری خرید تازه ثبت نشد.'); return false; }
      const newBatch = appended.stockBatches![appended.stockBatches!.length - 1];
      const newInventory = inventory.map(row => row.id === existingItem.id ? { ...appended, lastUpdated: Date.now() } : row);
      const purchaseHistory = mergePurchaseHistory(user.purchaseHistory || [], existingItem, [newBatch]);
      onUpdateUser({ ...user, inventory: newInventory, purchaseHistory });
      UserService.updateProfile(user.username, { inventory: newInventory, purchaseHistory }).catch(error => console.error('Failed to save purchase:', error));
      setAddMessage(`${cleanName} به موجودی اضافه شد؛ واحد قبلی ${existingItem.unit} حفظ شد.`);
      prepareNextEntry(0);
      return true;
    }

    const selectedUnit = unit || suggestPantryUnit(cleanName);
    const receivedAt = Date.now();
    const newBatch = { id: globalThis.crypto?.randomUUID?.() || `lot-${receivedAt}`, amount, purchaseAmount: amount, ...(Number.isFinite(unitPrice) && unitPrice! > 0 ? { unitPrice } : {}), ...(expiresOn ? { expiresOn } : {}), receivedAt, lastPurchasedAt: receivedAt };
    const newItem: InventoryItem = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11),
      name: cleanName,
      amount,
      unit: selectedUnit,
      minThreshold: Number.isFinite(minThreshold) && minThreshold >= 0 ? minThreshold : 0,
      minThresholdUnit: minThresholdUnit || selectedUnit,
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
    prepareNextEntry(0);
    return true;
  };

  const updatePurchaseDraft = (id: string, patch: Partial<PurchasedItemDraft>) => {
    setPurchaseDrafts(current => current.map(draft => draft.id === id ? { ...draft, ...patch } : draft));
    setPurchaseReviewError('');
  };

  const savePurchasedItems = async (shoppingItem: ShoppingItem) => {
    if (!pendingPurchasedItems.length || isSavingPurchasedItems) return;
    setPurchaseReviewError('');
    const draft = purchaseDrafts.find(row => row.id === shoppingItem.id);
    const amount = Number(draft?.amount);
    if (!draft || !Number.isFinite(amount) || amount <= 0) {
      setPurchaseReviewError(`مقدار خرید «${shoppingItem.name}» را به‌صورت عددی بزرگ‌تر از صفر وارد کن.`);
      return;
    }
    const priceText = draft.unitPrice.trim();
    if (priceText && (!Number.isFinite(Number(priceText)) || Number(priceText) <= 0)) {
      setPurchaseReviewError(`قیمت هر واحد «${shoppingItem.name}» باید عددی بزرگ‌تر از صفر باشد یا خالی بماند.`);
      return;
    }

    setIsSavingPurchasedItems(true);
    try {
      let nextInventory = [...inventory];
      let nextPurchaseHistory = [...(user.purchaseHistory || [])];
      const now = Date.now();

      {
        const enteredAmount = Number(draft.amount);
        const enteredPrice = draft.unitPrice.trim() ? Number(draft.unitPrice) : undefined;
        const matchIndex = nextInventory.findIndex(row => isInventoryIngredientMatch(row.name, shoppingItem.name));

        if (matchIndex < 0) {
          const batch: InventoryBatch = {
            id: globalThis.crypto?.randomUUID?.() || `lot-${now}-${Math.random().toString(36).slice(2, 8)}`,
            amount: enteredAmount,
            purchaseAmount: enteredAmount,
            ...(enteredPrice ? { unitPrice: enteredPrice } : {}),
            ...(draft.expiresOn ? { expiresOn: draft.expiresOn } : {}),
            receivedAt: now,
            lastPurchasedAt: now,
          };
          const newItem: InventoryItem = {
            id: globalThis.crypto?.randomUUID?.() || `inv-${now}-${Math.random().toString(36).slice(2, 8)}`,
            name: shoppingItem.name.trim(),
            amount: enteredAmount,
            unit: draft.unit,
            minThreshold: 0,
            minThresholdUnit: draft.unit,
            lastUpdated: now,
            stockBatches: [batch],
          };
          nextInventory.push(newItem);
          nextPurchaseHistory = mergePurchaseHistory(nextPurchaseHistory, newItem, [batch]);
        } else {
        const existing = nextInventory[matchIndex];
        const converted = convertAmountBetweenUnits(enteredAmount, draft.unit, existing.unit, existing.name);
        if (!converted || !Number.isFinite(converted.amount) || converted.amount <= 0) {
          throw new Error(`واحد «${draft.unit}» برای ${shoppingItem.name} به واحد انبار «${existing.unit}» تبدیل نمی‌شود. واحد سازگار را انتخاب کن.`);
        }
        const priceInInventoryUnit = enteredPrice ? enteredPrice * enteredAmount / converted.amount : undefined;
        const batches = getInventoryBatches(existing);
        const activeCount = activePurchaseBatchCount(batches);
        const shouldMerge = Boolean(draft.mergeBatchId) || activeCount >= MAX_ACTIVE_PURCHASE_BATCHES;
        let updatedItem: InventoryItem;
        let changedBatch: InventoryBatch;

        if (shouldMerge) {
          const targetId = draft.mergeBatchId || '';
          const target = batches.find(batch => batch.id === targetId && batch.amount > 0);
          if (!target) {
            throw new Error(`برای «${shoppingItem.name}» دو سری خرید فعال است؛ یکی از سری‌ها را برای افزودن خرید انتخاب کن.`);
          }
          const previousPurchased = target.purchaseAmount ?? target.amount;
          const nextPurchased = previousPurchased + converted.amount;
          const nextPrice = priceInInventoryUnit
            ? target.unitPrice ? (previousPurchased * target.unitPrice + converted.amount * priceInInventoryUnit) / nextPurchased : priceInInventoryUnit
            : target.unitPrice;
          changedBatch = {
            ...target,
            amount: target.amount + converted.amount,
            purchaseAmount: nextPurchased,
            ...(nextPrice ? { unitPrice: nextPrice } : {}),
            ...(!target.unitPrice && priceInInventoryUnit && target.amount > 0 ? { costApproximate: true } : {}),
            ...(converted.estimated ? { costApproximate: true } : {}),
            lastPurchasedAt: now,
          };
          const updatedBatches = batches.map(batch => batch.id === target.id ? changedBatch : batch);
          updatedItem = { ...existing, amount: sumInventoryBatches(updatedBatches), lastUpdated: now, stockBatches: updatedBatches };
        } else {
          updatedItem = appendInventoryBatch(existing, converted.amount, draft.expiresOn || undefined, priceInInventoryUnit);
          const appended = updatedItem.stockBatches![updatedItem.stockBatches!.length - 1];
          changedBatch = converted.estimated ? { ...appended, costApproximate: true } : appended;
          if (converted.estimated) updatedItem = { ...updatedItem, stockBatches: updatedItem.stockBatches!.map(batch => batch.id === changedBatch.id ? changedBatch : batch) };
        }

        nextInventory[matchIndex] = updatedItem;
        nextPurchaseHistory = mergePurchaseHistory(nextPurchaseHistory, existing, [changedBatch]);
        }
      }

      const updatedUser = await UserService.updateProfile(user.username, {
        inventory: nextInventory,
        purchaseHistory: nextPurchaseHistory,
        pendingPurchasedItems: pendingPurchasedItems.filter(item => item.id !== shoppingItem.id),
      });
      onUpdateUser(updatedUser);
      setAddMessage(`خرید «${shoppingItem.name}» در انبار ثبت شد.`);
    } catch (error) {
      setPurchaseReviewError(error instanceof Error ? error.message : 'ثبت خریدها انجام نشد؛ اطلاعات واردشده را بررسی کن.');
    } finally {
      setIsSavingPurchasedItems(false);
    }
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
  const openInventoryForPrices = async () => {
    setSelectedDish(null);
    if (!isInventoryMode) await onKitchenModeChange('with-inventory');
    onNavigate('inventory');
  };
  const selectedPurchaseItem = inventory.find(item => newItemName.trim() && isInventoryIngredientMatch(item.name, newItemName.trim()));
  const purchaseLimitReached = Boolean(selectedPurchaseItem && activePurchaseBatchCount(getInventoryBatches(selectedPurchaseItem)) >= MAX_ACTIVE_PURCHASE_BATCHES);

  const nextInventoryColumn = 0;
  const clearInlineInventoryEntry = () => {
    setNewItemName('');
    setNewItemAmount('1');
    setNewItemUnit('');
    setNewItemThreshold('0');
    setNewItemThresholdUnit('');
    setNewItemExpiry('');
    setNewItemUnitPrice('');
  };
  const cancelInlineInventoryAdd = () => {
    clearInlineInventoryEntry();
    setShowInventoryAddConfirm(false);
    setInventoryFormColumn(null);
    setAddMessage('');
  };
  const toggleInventoryForm = () => {
    setAddMessage('');
    if (inventoryFormColumn !== null) cancelInlineInventoryAdd();
    else setInventoryFormColumn(nextInventoryColumn);
  };

  const confirmInventoryAdd = async (focusNext: boolean) => {
    const price = Number(newItemUnitPrice);
    const saved = await addToInventory(newItemName, Number(newItemAmount), newItemUnit || suggestPantryUnit(newItemName), focusNext, newItemExpiry, Number.isFinite(price) && price > 0 ? price : undefined, Number(newItemThreshold) || 0, newItemThresholdUnit || newItemUnit || suggestPantryUnit(newItemName));
    if (!saved) return;
    setShowInventoryAddConfirm(false);
    if (!focusNext) setInventoryFormColumn(null);
  };

  const renderInlineInventoryForm = (compact = false) => {
    const customItem = newItemName.trim() && !PANTRY_ITEMS.some(category => category.subcategories.some(group => group.items.some(item => normalizePersian(item).trim() === normalizePersian(newItemName).trim())));
    const suggestedUnit = newItemUnit || suggestPantryUnit(newItemName);
    const submit = (event: React.FormEvent) => {
      event.preventDefault();
      if (!newItemName.trim() || !Number.isFinite(Number(newItemAmount)) || Number(newItemAmount) <= 0 || !Number.isFinite(Number(newItemThreshold)) || Number(newItemThreshold) < 0 || purchaseLimitReached) return;
      setShowInventoryAddConfirm(true);
    };
    return <form id={`inventory-add-row-${inventoryFormColumn ?? 0}`} onSubmit={submit} className={`grid items-stretch gap-2 ${compact ? 'min-w-[850px] grid-cols-[1.8fr_1fr_1.1fr_1fr_1.1fr_.8fr_1fr]' : 'grid-cols-1 sm:grid-cols-2'}`}>
      <div className="min-w-0 p-1"><FoodIngredientCombobox id={`inline-pantry-name-${compact ? inventoryFormColumn ?? 0 : 'empty'}`} inputRef={newItemNameRef} value={newItemName} onChange={value => { const unit = value.trim() ? suggestPantryUnit(value) : ''; setNewItemName(value); setNewItemUnit(unit); setNewItemThresholdUnit(unit); }} onSelect={value => { const unit = suggestPantryUnit(value); setNewItemUnit(unit); setNewItemThresholdUnit(unit); }} placeholder="نام ماده را جست‌وجو یا وارد کن…" /></div>
      <div className="flex min-w-0 flex-col justify-center gap-2 p-1"><input aria-label="موجودی اولیه" title="موجودی اولیه" placeholder="مقدار" type="number" min="0" step="any" value={newItemAmount} onChange={event => setNewItemAmount(event.target.value)} className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2.5 text-center text-sm font-black outline-none focus:ring-2 focus:ring-emerald-100"/>{customItem ? <select aria-label="واحد موجودی" value={suggestedUnit} onChange={event => { setNewItemUnit(event.target.value); setNewItemThresholdUnit(event.target.value); }} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs">{PANTRY_UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select> : <span className="truncate text-center text-xs font-bold text-emerald-800">{newItemName ? suggestPantryUnit(newItemName) : 'واحد'}</span>}</div>
      <div className="flex min-w-0 flex-col justify-center gap-2 p-1"><input aria-label="آستانهٔ هشدار اولیه" title="آستانهٔ هشدار" placeholder="آستانه" type="number" min="0" step="any" value={newItemThreshold} onChange={event => setNewItemThreshold(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-center text-sm font-bold"/><select aria-label="واحد آستانهٔ هشدار" value={newItemThresholdUnit || suggestedUnit} onChange={event => setNewItemThresholdUnit(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs">{PANTRY_UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></div>
      <div className="min-w-0 p-1"><JalaliDateInput value={newItemExpiry} onChange={setNewItemExpiry} ariaLabel="تاریخ انقضا به شمسی" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-xs text-slate-700 outline-none focus:border-[#276556]"/></div>
      <div className="flex min-w-0 items-center justify-center p-1"><input aria-label={`قیمت هر ${suggestedUnit} به تومان (اختیاری)`} title={`قیمت هر ${suggestedUnit} به تومان (اختیاری)`} type="number" min="0.01" step="any" value={newItemUnitPrice} onChange={event => setNewItemUnitPrice(event.target.value)} placeholder="قیمت (تومان)" className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-center text-xs"/></div>
      <div className="flex items-center justify-center p-1"><span className="rounded-full bg-emerald-50 px-2 py-1.5 text-center text-[10px] font-black text-emerald-800">قلم تازه</span></div>
      <div className="flex flex-col items-center justify-center gap-2 p-1"><button type="submit" form={`inventory-add-row-${inventoryFormColumn ?? 0}`} disabled={!newItemName.trim() || !Number.isFinite(Number(newItemAmount)) || Number(newItemAmount) <= 0 || !Number.isFinite(Number(newItemThreshold)) || Number(newItemThreshold) < 0 || purchaseLimitReached} title="ثبت مادهٔ غذایی" aria-label="ثبت مادهٔ غذایی" className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"><Save size={17}/></button><button type="button" aria-label="انصراف و حذف ردیف افزودن" title="انصراف" onClick={cancelInlineInventoryAdd} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><X size={15}/></button></div>
      {purchaseLimitReached && <p role="status" className="col-span-7 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">دو سری خرید فعال برای این ماده ثبت شده؛ تا مصرف بخشی از آن‌ها، خرید تازه را اضافه نکن.</p>}
    </form>;
  };

  const sortedInventory = useMemo(() => [...inventory].sort((a, b) => a.name.localeCompare(b.name, 'fa')), [inventory]);
  const getInventoryPriceSummary = (item: InventoryItem) => {
    const liveBatches = getInventoryBatches(item).filter(batch => batch.amount > 1e-9);
    const pricedBatches = liveBatches.filter(batch => Number.isFinite(batch.unitPrice) && batch.unitPrice! > 0);
    if (!pricedBatches.length) return null;
    const pricedAmount = pricedBatches.reduce((sum, batch) => sum + batch.amount, 0);
    if (pricedAmount <= 0) return null;
    const weightedPrice = pricedBatches.reduce((sum, batch) => sum + batch.amount * batch.unitPrice!, 0) / pricedAmount;
    return { unitPrice: weightedPrice };
  };

  const renderInventoryColumn = (items: InventoryItem[], column: number) => <div key={`inventory-column-${column}`} className="min-w-0 rounded-2xl border border-emerald-100 bg-white shadow-sm">
    <div>
      <table className="w-full min-w-[850px] table-fixed border border-slate-200 border-collapse text-right text-[13px] [&_th]:border-b [&_th]:border-l [&_th]:border-slate-200 [&_td]:border-b [&_td]:border-l [&_td]:border-slate-200">
        <colgroup><col className="w-[23%]"/><col className="w-[12%]"/><col className="w-[15%]"/><col className="w-[13%]"/><col className="w-[14%]"/><col className="w-[10%]"/><col className="w-[13%]"/></colgroup>
        <thead className="sticky top-[104px] z-20 bg-[#eaf3ed] text-sm font-black text-[#214e3d] shadow-[0_2px_5px_rgba(15,23,42,0.12)] sm:top-[64px] sm:text-[15px]">
          <tr><th className="px-3 py-4">مادهٔ غذایی</th><th className="px-2 py-4 text-center">موجودی</th><th className="px-2 py-4 text-center">آستانهٔ هشدار</th><th className="px-2 py-4 text-center">تاریخ انقضا</th><th className="px-2 py-4 text-center">قیمت هر واحد</th><th className="px-2 py-4 text-center">وضعیت</th><th className="px-2 py-4 text-center">عملیات</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(item => {
            const editing = selectedInventoryItemId === item.id;
            const empty = item.amount <= 0;
            const low = !empty && isBelowThreshold(item);
            const expiry = earliestExpiry(item);
            const expiryState = inventoryExpiryState(expiry);
            const price = getInventoryPriceSummary(item);
            return <tr key={item.id} className={`pantry-dense-row ${editing ? 'is-selected' : ''}`}>
              <td className="px-3 py-4"><div className="flex min-w-0 items-center gap-2.5"><PantryFoodThumbnail item={item.name}/><strong className="line-clamp-2 min-w-0 text-[13px] leading-5 sm:text-sm">{item.name}</strong></div></td>
              <td className="px-2 py-4 text-center">{editing ? <div className="flex flex-col items-center gap-2"><input type="number" min="0" step="any" value={item.amount} aria-label={`موجودی ${item.name}`} onChange={event => updateInventoryItem(item.id, { amount: Math.max(0, Number(event.target.value) || 0) })} className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-center text-sm font-black text-emerald-900"/><select value={item.unit} aria-label={`واحد موجودی ${item.name}`} onChange={event => changeInventoryUnit(item, event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-xs">{['کیلوگرم','گرم','عدد','بسته','لیتر','میلی‌لیتر'].map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></div> : <span className="whitespace-nowrap text-sm font-black text-emerald-800">{toPersian(item.amount)} <small className="font-semibold text-slate-500">{item.unit}</small></span>}</td>
              <td className="px-2 py-4 text-center">{editing ? <div className="flex flex-col items-center gap-2"><input type="number" min="0" step="any" value={item.minThreshold} aria-label={`آستانهٔ هشدار ${item.name}`} onChange={event => updateInventoryItem(item.id, { minThreshold: Math.max(0, Number(event.target.value) || 0) })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm font-bold"/><select value={item.minThresholdUnit || item.unit} aria-label={`واحد آستانه ${item.name}`} onChange={event => { const nextUnit = event.target.value; const converted = convertAmountBetweenUnits(item.minThreshold, item.minThresholdUnit || item.unit, nextUnit, item.name); if (!converted) { setAddMessage('واحد آستانه باید از همان بُعد موجودی باشد؛ مثلاً کیلوگرم با گرم.'); return; } updateInventoryItem(item.id, { minThreshold: converted.amount, minThresholdUnit: nextUnit }); }} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-xs">{['کیلوگرم','گرم','عدد','بسته','لیتر','میلی‌لیتر'].map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></div> : <span className="whitespace-nowrap text-sm text-slate-700">{toPersian(item.minThreshold)} {item.minThresholdUnit || item.unit}</span>}</td>
              <td className="px-2 py-4 text-center"><div className="flex items-center justify-center gap-2"><span className={`text-xs leading-5 ${expiry ? expiryState === 'expired' ? 'font-black text-rose-700' : expiryState === 'soon' ? 'font-black text-amber-800' : 'text-slate-700' : 'text-slate-400'}`}>{expiry ? formatGregorianDateAsPersian(expiry) : 'ندارد'}</span><button type="button" onClick={() => setSelectedBatchItem(item)} aria-label={`ویرایش سری خرید و تاریخ انقضای ${item.name}`} title={`تاریخ انقضا و سری‌های ${item.name}`} className="shrink-0 rounded-lg bg-amber-50 p-2 text-amber-800 hover:bg-amber-100"><CalendarDays size={16}/></button></div></td>
              <td className="px-2 py-4 text-center">{price && <span title={`میانگین وزنی قیمت سری‌های موجود: ${toPersian(price.unitPrice)} تومان برای هر ${item.unit}`} className="whitespace-nowrap text-xs font-black text-slate-700 sm:text-sm">{toPersian(Math.round(price.unitPrice))}<small className="mr-1 font-bold text-slate-500">تومان</small><small className="mr-0.5 block text-[10px] font-medium text-slate-500">هر {item.unit}</small></span>}</td>
              <td className="px-2 py-4 text-center"><span className={`whitespace-nowrap text-xs font-black sm:text-sm ${empty || low ? 'text-rose-700' : 'text-emerald-800'}`}>{empty ? 'تمام‌شده' : low ? 'کم' : 'موجود'}</span></td>
              <td className="px-2 py-4 text-center"><div className="flex items-center justify-center gap-2"><button type="button" onClick={() => setSelectedInventoryItemId(editing ? null : item.id)} aria-label={`${editing ? 'پایان ویرایش' : 'ویرایش'} ${item.name}`} title="ویرایش" className={`grid h-9 w-9 place-items-center rounded-lg ${editing ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100'}`}><Pencil size={16}/></button><button type="button" onClick={() => removeFromInventory(item.id)} aria-label={`حذف ${item.name} از انبار`} title="حذف" className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 size={16}/></button></div></td>
            </tr>;
          })}
          {inventoryFormColumn === column && <tr><td colSpan={7} className="bg-emerald-50/60 p-2">{renderInlineInventoryForm(true)}</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;

  return (
    <div className="pantry-page flex flex-col h-full [@media(orientation:landscape)_and_(max-height:500px)]:h-auto animate-enter">
      {page === 'home' && <section className="pantry-hero" aria-label="پیشنهاد غذا بر پایهٔ موجودی آشپزخانه">
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
              {isInventoryMode ? <button
                type="button"
                onClick={suggestFromInventory}
                disabled={inventory.length === 0 || isSearching}
                className="pantry-hero-stock-cta noosh-cta-3d pantry-hero-stock-cta-primary"
              >
                {isSearching ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                <span>{isSearching ? 'در حال بررسی…' : 'پیشنهاد غذا با موجودی'}</span>
              </button> : <button
                type="button"
                onClick={() => void onKitchenModeChange('with-inventory')}
                className="pantry-hero-stock-cta noosh-cta-3d pantry-hero-stock-cta-primary"
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
      </section>}
      {page === 'inventory' && <section className="mx-4 mb-2 mt-4 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm sm:mx-10"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#276556]"><Package size={20}/></span><div><h1 className="text-base font-black text-slate-900 sm:text-xl">انبار مواد غذایی آشپزخانه</h1><p className="text-xs font-semibold text-slate-500">ثبت و به‌روزرسانی موجودی شخصی شما · {toPersian(inventory.length)} قلم</p></div></section>}
      {(page === 'inventory' && isInventoryMode) || (page === 'home' && isInventoryMode && rawResults) ? <>
      <div className="flex-grow overflow-y-auto [@media(orientation:landscape)_and_(max-height:500px)]:overflow-visible px-4 sm:px-10 pb-20 no-scrollbar">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 space-y-6 sm:space-y-10">
              {page === 'inventory' && <div className="space-y-6 animate-enter">
                  {pendingPurchasedItems.length > 0 && <section aria-labelledby="purchased-review-title" className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-lg shadow-emerald-950/5">
                    <header className="flex items-start gap-3 border-b border-emerald-100 bg-emerald-50/80 p-4 sm:p-6">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#276556] text-white"><PackageCheck size={22}/></span>
                      <div className="min-w-0"><h2 id="purchased-review-title" className="text-base font-black text-slate-900 sm:text-lg">خریدهای تازه را به انبار اضافه کن</h2><p className="mt-1 text-xs leading-6 text-slate-600">هر قلم را جداگانه بررسی و ثبت کن؛ پس از ثبت هر ردیف، ردیف‌های باقی‌مانده برای ادامه در همین فهرست می‌مانند.</p></div>
                    </header>
                    <div className="space-y-3 p-3 sm:p-5">
                      {purchaseReviewError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold leading-6 text-rose-800">{purchaseReviewError}</p>}
                      {pendingPurchasedItems.map(item => {
                        const draft = purchaseDrafts.find(row => row.id === item.id);
                        const match = inventory.find(row => isInventoryIngredientMatch(row.name, item.name));
                        const batches = match ? getInventoryBatches(match) : [];
                        const activeBatches = batches.filter(batch => batch.amount > 0);
                        const mustChooseBatch = activePurchaseBatchCount(batches) >= MAX_ACTIVE_PURCHASE_BATCHES;
                        const isMerging = Boolean(draft?.mergeBatchId) || mustChooseBatch;
                        return <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2"><strong className="truncate text-sm font-black text-slate-900">{item.name}</strong>{item.fromRecipe && <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">{item.fromRecipe}</span>}</div>
                            <button type="button" disabled={isSavingPurchasedItems} onClick={() => void onPurchasedItemRemove(item.id)} aria-label={`حذف ${item.name} از فهرست خریدهای آمادهٔ انبار`} title="حذف این ردیف از فهرست خریدهای آمادهٔ انبار" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-rose-100 bg-white px-2.5 text-[10px] font-black text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15}/><span>حذف ردیف</span></button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="text-[11px] font-bold text-slate-600">مقدار خرید <span className="text-rose-600">الزامی</span><input type="number" min="0.001" step="any" value={draft?.amount || ''} onChange={event => updatePurchaseDraft(item.id, { amount: event.target.value })} placeholder="مقدار واقعی" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none focus:border-[#276556] focus:ring-2 focus:ring-emerald-100" /></label>
                            <label className="text-[11px] font-bold text-slate-600">واحد خرید<select value={draft?.unit || item.unit || suggestPantryUnit(item.name)} onChange={event => updatePurchaseDraft(item.id, { unit: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-[#276556]">{Array.from(new Set([...(item.unit ? [item.unit] : []), ...PANTRY_UNIT_OPTIONS])).map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></label>
                            <label className="text-[11px] font-bold text-slate-600">قیمت هر واحد (تومان، اختیاری)<input type="number" min="0.01" step="any" value={draft?.unitPrice || ''} onChange={event => updatePurchaseDraft(item.id, { unitPrice: event.target.value })} placeholder="مثلاً ۸۵۰۰۰" className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-[#276556]" /></label>
                            <label className="text-[11px] font-bold text-slate-600">تاریخ انقضا (شمسی، اختیاری)<JalaliDateInput value={draft?.expiresOn || ''} disabled={isMerging} onChange={expiresOn => updatePurchaseDraft(item.id, { expiresOn })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#276556] disabled:bg-slate-100 disabled:text-slate-400" />{isMerging && <small className="mt-1 block text-[10px] font-medium text-amber-800">این خرید به سری موجود اضافه می‌شود و تاریخ همان سری حفظ می‌شود.</small>}</label>
                          </div>
                          {match && activeBatches.length > 0 && <label className="mt-3 block max-w-xl text-[11px] font-bold text-slate-600">{mustChooseBatch ? 'این ماده دو سری فعال دارد؛ خرید را به کدام سری اضافه کنیم؟' : 'در صورت تمایل، خرید را به یکی از سری‌های موجود اضافه کن'}<select value={draft?.mergeBatchId || ''} onChange={event => updatePurchaseDraft(item.id, { mergeBatchId: event.target.value, ...(event.target.value ? { expiresOn: '' } : {}) })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-[#276556]"><option value="">{mustChooseBatch ? 'انتخاب سری خرید الزامی است' : 'ثبت به‌عنوان سری خرید تازه'}</option>{activeBatches.map((batch, index) => <option key={batch.id} value={batch.id}>سری {toPersian(index + 1)} · {toPersian(batch.amount)} {match.unit}{batch.expiresOn ? ` · انقضا ${formatGregorianDateAsPersian(batch.expiresOn)}` : ''}</option>)}</select></label>}
                          <div className="mt-3 flex justify-end border-t border-slate-200 pt-3">
                            <button type="button" disabled={isSavingPurchasedItems} onClick={() => void savePurchasedItems(item)} className="noosh-cta-3d inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black disabled:cursor-wait disabled:opacity-60">
                              <PackageCheck size={16}/>{isSavingPurchasedItems ? 'در حال ثبت…' : 'تأیید و ثبت در انبار'}
                            </button>
                          </div>
                        </article>;
                      })}
                      <div className="flex justify-start border-t border-slate-100 pt-3"><button type="button" disabled={isSavingPurchasedItems} onClick={() => void onPurchasedItemsCancel(pendingPurchasedItems)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">برگرداندن اقلام باقی‌مانده به سبد خرید</button></div>
                    </div>
                  </section>}
                  {/* بخش هشدار موجودی کم */}
                  {lowStockItems.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                      <AlertTriangle className="text-rose-500 shrink-0 mt-1" size={20} />
                      <div className="flex-grow">
                        <h4 className="text-rose-800 font-black text-xs sm:text-sm">هشدار موجودی رو به اتمام!</h4>
                        <p className="text-rose-600 text-[10px] sm:text-xs mt-1">مواد تمام‌شده و زیر آستانه اینجا فهرست شده‌اند؛ مقدار خرید تا رسیدن به حدود دو برابر آستانه محاسبه می‌شود.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {lowStockItems.map(item => (
                            <span key={item.id} className={`rounded-lg border px-2 py-1 text-[10px] font-black ${item.amount <= 0 ? 'border-rose-300 bg-rose-100 text-rose-800' : 'border-rose-200 bg-white text-rose-700'}`}>
                              {item.name} · {item.amount <= 0 ? 'تمام‌شده' : `${toPersian(item.amount)} ${item.unit}`}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button type="button" onClick={addLowStockToShoppingList} className="noosh-cta-3d inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black">
                            <ShoppingCart size={17} />
                            به سبد خرید اضافه کن
                          </button>
                          {addMessage && <span role="status" className="text-xs font-bold text-emerald-800">{addMessage}</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {expiringItems.length > 0 && <section aria-label="مواد نزدیک به تاریخ انقضا" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3"><CalendarDays size={20} className="mt-0.5 shrink-0 text-amber-700"/><div className="min-w-0 flex-1"><h4 className="text-sm font-black text-amber-950">این مواد را زودتر مصرف کن</h4><p className="mt-1 text-xs leading-5 text-amber-800">بر اساس نزدیک‌ترین تاریخ ثبت‌شده؛ هنگام مصرف، سری‌ای که زودتر منقضی می‌شود اول از انبار کم می‌شود.</p><div className="mt-3 flex flex-wrap gap-2">{expiringItems.map(({ item, date }) => { const state = inventoryExpiryState(date); const label = state === 'expired' ? 'تاریخ گذشته' : state === 'soon' ? 'تا ۳ روز' : 'تا یک هفته'; return <button key={item.id} type="button" onClick={() => setSelectedBatchItem(item)} className={`rounded-xl border px-3 py-2 text-right text-xs font-black ${state === 'expired' ? 'border-rose-200 bg-white text-rose-700' : 'border-amber-200 bg-white text-amber-900'}`}><span className="block">{item.name} · {label}</span><small className="mt-1 block font-semibold opacity-75">{formatGregorianDateAsPersian(date)}</small></button>; })}</div></div></div>
                  </section>}

                  {user.inventoryNeedsReview && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><p>موجودی‌های قبلی حفظ شده‌اند. اگر قبلاً مقدار اشتباه کم شده، مقدار واقعی اقلام را یک‌بار اصلاح کن؛ از روی سوابق قدیمی نمی‌توان مصرف واقعی را بازسازی کرد.</p><button type="button" onClick={() => { const updated = { ...user, inventoryNeedsReview: false }; onUpdateUser(updated); void UserService.updateProfile(user.username, { inventoryNeedsReview: false }); }} className="rounded-xl bg-white px-4 py-2 font-bold">مقدارها را بررسی کردم</button></div>}
                  {addMessage && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">{addMessage}</p>}
                  <div className="grid grid-cols-1 gap-6 pantry-workspace">
                    {/* لیست موجودی فعلی */}
                    <div className="order-1 space-y-4 pantry-inventory-panel">
                      <div className="sticky top-0 z-40 -mx-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#f8fafc]/95 px-3 py-3 shadow-sm backdrop-blur sm:-mx-4 sm:px-4">
                        <h3 className="text-slate-800 font-black text-sm sm:text-base flex items-center gap-2">
                          <Package className="text-teal-500" size={20} />
                          موجودی انبار شما
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-black">{toPersian(inventory.length)} قلم در انبار</span>
                          <InventoryHistory user={user} onUpdateUser={onUpdateUser}/>
                          <button type="button" onClick={toggleInventoryForm} className="noosh-cta-3d inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black">
                            <Plus size={16} /> {inventoryFormColumn !== null ? 'بستن فرم افزودن' : 'افزودن مادهٔ غذایی'}
                          </button>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                        {inventory.length > 0 ? (
                          <div className="p-3 sm:p-4">
                            {renderInventoryColumn(sortedInventory, 0)}
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
                            {inventoryFormColumn === 0 && <div className="mt-3 w-full max-w-3xl">{renderInlineInventoryForm()}</div>}
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
              </div>}

              {page === 'home' && rawResults && (
                <div ref={resultsAreaRef} className="space-y-4 sm:space-y-6 animate-enter pt-2 sm:pt-4 border-t border-slate-100 scroll-mt-3">
                  <div className="pantry-result-filters sticky top-0 z-30 bg-white border border-slate-200 p-2 sm:p-4 rounded-2xl sm:rounded-[2.5rem] flex flex-wrap items-center gap-2 sm:gap-3 shadow-lg max-w-5xl mx-auto">
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
                          className={`flex-grow px-3 py-2.5 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition-all border-2 ${activeFilter === filter.id ? 'noosh-cta-3d' : 'bg-white border-transparent text-slate-500 hover:border-slate-200'}`}
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
                        <MealCard plan={{ dayName: isFullyCookable ? 'کامل' : isPerfect ? 'آماده' : `${toPersian(missingCount)} کسری`, dish }} user={user} onUpdateUser={onUpdateUser} onOpenInventory={openInventoryForPrices} />
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
      </> : page === 'inventory' ? <section className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-900 sm:mx-10">برای باز کردن انبار، به صفحهٔ «آشپزخانه من» برو و کلید «استفاده از موجودی انبار» را روشن کن.</section> : !isInventoryMode && <section className="pantry-discovery-card" aria-label="پیشنهاد و برنامه‌ریزی بدون انبار">
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
      {showInventoryAddConfirm && createPortal(
        <div className="fixed inset-0 z-[13000] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" dir="rtl" onKeyDown={event => { if (event.key === 'Escape') cancelInlineInventoryAdd(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="inventory-add-confirm-title" className="w-full max-w-md overflow-hidden rounded-[26px] border border-emerald-100 bg-[#f8faf7] shadow-2xl" onClick={event => event.stopPropagation()}>
            <header className="flex items-center gap-3 bg-[#276556] px-5 py-4 text-white">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#d7bd75] text-[#214a3f]"><PackageCheck size={22}/></span>
              <div><h2 id="inventory-add-confirm-title" className="text-base font-black">ثبت ماده در انبار</h2><p className="mt-1 text-xs font-medium text-white/80">اطلاعات واردشده را بررسی کن</p></div>
            </header>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3"><span className="text-xs font-bold text-slate-500">مادهٔ غذایی</span><strong className="text-sm font-black text-slate-800">{newItemName}</strong></div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3"><span className="text-xs font-bold text-slate-500">موجودی اولیه</span><strong className="text-sm font-black text-[#276556]">{toPersian(Number(newItemAmount))} {newItemUnit || suggestPantryUnit(newItemName)}</strong></div>
              {addMessage && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700">{addMessage}</p>}
              <div className="grid gap-2 pt-1 sm:grid-cols-3">
                <button type="button" onClick={() => void confirmInventoryAdd(false)} className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-black text-[#276556] transition hover:bg-emerald-50">ذخیره</button>
                <button type="button" onClick={() => void confirmInventoryAdd(true)} className="noosh-cta-3d min-h-11 rounded-xl px-3 py-2 text-sm font-black">ذخیره و بعدی</button>
                <button type="button" onClick={cancelInlineInventoryAdd} className="min-h-11 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700">انصراف</button>
              </div>
            </div>
          </section>
        </div>, document.body
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
      {selectedDish && <RecipeModal dish={selectedDish} isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} user={user} onUpdateUser={onUpdateUser} onOpenInventory={openInventoryForPrices} />}
    </div>
  );
};

export default PantryChef;
