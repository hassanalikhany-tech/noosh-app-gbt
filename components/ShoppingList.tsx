
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, CheckCircle2, Printer, Trash2, Plus, MessageCircle, AlertTriangle, Smartphone, X, Ruler, Pencil, Check } from 'lucide-react';
import { ShoppingItem, UserProfile, DayPlan } from '../types';
import { UserService } from '../services/userService';
import { getIngredientCategoryId, getBaseIngredientName } from '../data/pantry';

interface ShoppingListProps {
  weeklyPlan: DayPlan[]; 
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onPrintInternal?: () => void;
}

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
  </svg>
);

const ShoppingList: React.FC<ShoppingListProps> = ({ user, weeklyPlan, onUpdateUser, onPrintInternal }) => {
  const [customItems, setCustomItems] = useState<ShoppingItem[]>(user.customShoppingList || []);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftAmount, setDraftAmount] = useState('');
  const [draftUnit, setDraftUnit] = useState('');
  const [quantityError, setQuantityError] = useState('');
  
  useEffect(() => {
    setCustomItems(user.customShoppingList || []);
  }, [user]);

  const uniqueItems = useMemo(() => {
    return [...customItems].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [customItems]);

  const activeItems = useMemo(() => uniqueItems.filter(i => !i.checked), [uniqueItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {
      'proteins': [],
      'grains': [],
      'vegetables': [],
      'other': []
    };

    uniqueItems.forEach(item => {
      const cat = item.category || 'other';
      if (groups[cat]) {
        groups[cat].push(item);
      } else {
        groups['other'].push(item);
      }
    });

    // Internal sorting for each category
    const sortProteins = (a: ShoppingItem, b: ShoppingItem) => {
      const getRank = (name: string) => {
        if (name.includes('گوشت') || name.includes('گوساله') || name.includes('گاو') || name.includes('گوسفند') || name.includes('چرخ‌کرده') || name.includes('پاچه') || name.includes('جگر') || name.includes('سیرابی')) return 1;
        if (name.includes('مرغ') || name.includes('بوقلمون') || name.includes('بلدرچین') || name.includes('اردک') || name.includes('غاز')) return 2;
        if (name.includes('ماهی') || name.includes('میگو') || name.includes('تن ماهی')) return 3;
        if (name.includes('سوسیس') || name.includes('کالباس')) return 4;
        return 5;
      };
      return getRank(a.name) - getRank(b.name);
    };

    const sortGrains = (a: ShoppingItem, b: ShoppingItem) => {
      const getRank = (name: string) => {
        if (name.includes('برنج')) return 1;
        if (name.includes('لوبیا')) return 2;
        if (name.includes('نخود') || name.includes('عدس') || name.includes('لپه')) return 3;
        return 4;
      };
      return getRank(a.name) - getRank(b.name);
    };

    const sortVegetables = (a: ShoppingItem, b: ShoppingItem) => {
      const getRank = (name: string) => {
        if (name.includes('سیب زمینی') || name.includes('پیاز') || name.includes('گوجه') || name.includes('بادمجان') || name.includes('سیر')) return 1;
        if (name.includes('کرفس') || name.includes('گشنیز') || name.includes('جعفری') || name.includes('تره') || name.includes('ریحان') || name.includes('نعنا') || name.includes('شوید') || name.includes('شنبلیله') || name.includes('اسفناج')) return 2;
        return 3;
      };
      return getRank(a.name) - getRank(b.name);
    };

    groups['proteins'].sort(sortProteins);
    groups['grains'].sort(sortGrains);
    groups['vegetables'].sort(sortVegetables);

    return groups;
  }, [uniqueItems]);

  const categoryTitles: Record<string, string> = {
    'proteins': 'مواد پروتئینی',
    'grains': 'غلات و حبوبات',
    'vegetables': 'سبزیجات و صیفی‌جات تازه',
    'other': 'سایر موارد'
  };

  const updateCustomItems = async (newItems: ShoppingItem[]) => {
    setCustomItems(newItems);
    onUpdateUser({ ...user, customShoppingList: newItems });
    UserService.updateShoppingList(user.username, newItems);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const name = getBaseIngredientName(newItemName.trim());
    const amount = newItemAmount ? parseFloat(newItemAmount) : 0;
    const unit = newItemUnit.trim() || '';
    
    const currentList = [...customItems];
    const existingIdx = currentList.findIndex(item => item.name === name);

    if (existingIdx !== -1) {
      currentList[existingIdx] = {
        ...currentList[existingIdx],
        amount: undefined, // No amounts as per user request
        unit: undefined,
        category: currentList[existingIdx].category || getIngredientCategoryId(name) || 'other'
      };
      updateCustomItems(currentList);
    } else {
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name: name,
        amount: undefined, // No amounts as per user request
        unit: undefined,
        checked: false,
        category: getIngredientCategoryId(name) || 'other'
      };
      updateCustomItems([...currentList, newItem]);
    }
    
    setNewItemName('');
    setNewItemAmount('');
    setNewItemUnit('');
  };

  const handleDeleteItem = (id: string) => {
    updateCustomItems(customItems.filter(i => i.id !== id));
  };

  const handleDeleteAll = () => {
    updateCustomItems([]);
    setShowDeleteConfirm(false);
  };

  const toggleCheck = (id: string) => {
    updateCustomItems(customItems.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const startEditingQuantity = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    setDraftAmount(item.amount === undefined ? '' : String(item.amount));
    setDraftUnit(item.unit || '');
    setQuantityError('');
  };

  const cancelEditingQuantity = () => {
    setEditingItemId(null);
    setDraftAmount('');
    setDraftUnit('');
    setQuantityError('');
  };

  const saveQuantity = (id: string) => {
    const normalizedAmount = draftAmount.trim().replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/٫/g, '.').replace(/,/g, '.');
    if (normalizedAmount && (!Number.isFinite(Number(normalizedAmount)) || Number(normalizedAmount) < 0)) {
      setQuantityError('مقدار را به‌صورت عددیِ صفر یا بیشتر وارد کنید.');
      return;
    }
    const amount = normalizedAmount ? Number(normalizedAmount) : undefined;
    const unit = amount === undefined ? undefined : draftUnit.trim() || undefined;
    updateCustomItems(customItems.map(item => item.id === id ? { ...item, amount, unit, estimated: false, unresolved: false } : item));
    cancelEditingQuantity();
  };

  const toPersianDigits = (num: number | string | undefined) => {
    if (num === undefined || num === 0 || num === '') return '';
    const val = typeof num === 'number' ? Math.round(num * 10) / 10 : num;
    return val.toString().replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'['0123456789'.indexOf(d)]);
  };

  const persianDate = useMemo(() => {
    return new Intl.DateTimeFormat('fa-IR').format(new Date());
  }, []);

  const getFormattedListText = () => {
    if (activeItems.length === 0) return 'سبد خرید شما خالی است.';
    let text = `⚪️ NOOSH 🟢 APP\n`;
    text += `همراه سلامتی و آسایش شما\n`;
    text += `📅 تاریخ: ${persianDate}\n`;
    text += `------------------------------------------\n\n`;
    text += `🛒 *لیست مواد مورد نیاز:*\n\n`;
    
    const categories = ['proteins', 'grains', 'vegetables', 'other'];
    categories.forEach(catId => {
      const items = [...activeItems.filter(i => (i.category || 'other') === catId)];
      if (items.length > 0) {
        // Apply internal sorting
        if (catId === 'proteins') {
          items.sort((a, b) => {
            const getRank = (name: string) => {
              if (name.includes('گوشت') || name.includes('گوساله') || name.includes('گاو') || name.includes('گوسفند') || name.includes('چرخ‌کرده') || name.includes('پاچه') || name.includes('جگر') || name.includes('سیرابی')) return 1;
              if (name.includes('مرغ') || name.includes('بوقلمون') || name.includes('بلدرچین') || name.includes('اردک') || name.includes('غاز')) return 2;
              if (name.includes('ماهی') || name.includes('میگو') || name.includes('تن ماهی')) return 3;
              if (name.includes('سوسیس') || name.includes('کالباس')) return 4;
              return 5;
            };
            return getRank(a.name) - getRank(b.name);
          });
        } else if (catId === 'grains') {
          items.sort((a, b) => {
            const getRank = (name: string) => {
              if (name.includes('برنج')) return 1;
              if (name.includes('لوبیا')) return 2;
              if (name.includes('نخود') || name.includes('عدس') || name.includes('لپه')) return 3;
              return 4;
            };
            return getRank(a.name) - getRank(b.name);
          });
        } else if (catId === 'vegetables') {
          items.sort((a, b) => {
            const getRank = (name: string) => {
              if (name.includes('سیب زمینی') || name.includes('پیاز') || name.includes('گوجه') || name.includes('بادمجان') || name.includes('سیر')) return 1;
              if (name.includes('کرفس') || name.includes('گشنیز') || name.includes('جعفری') || name.includes('تره') || name.includes('ریحان') || name.includes('نعنا') || name.includes('شوید') || name.includes('شنبلیله') || name.includes('اسفناج')) return 2;
              return 3;
            };
            return getRank(a.name) - getRank(b.name);
          });
        }

        text += `🔹 *${categoryTitles[catId]}*\n`;
        items.forEach((item, index) => {
          const source = item.fromRecipe ? ` [بابت: ${item.fromRecipe}]` : '';
          const quantity = item.amount && item.unit ? ` — ${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 6 }).format(item.amount)} ${item.unit}` : '';
          text += `  ${toPersianDigits(index + 1)}. ${item.name}${quantity}${source}${item.unresolved ? ' (نیازمند بررسی مقدار)' : item.estimated ? ' (تقریبی)' : ''}\n`;
        });
        text += `\n`;
      }
    });

    text += `------------------------------------------\n`;
    text += `🌐 www.nooshapp.ir\n`;
    return text;
  };

  const handleSMS = () => {
    const text = getFormattedListText();
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1;
    const separator = isIOS ? '&' : '?';
    window.location.href = `sms:${separator}body=${encodeURIComponent(text)}`;
  };

  const shareText = getFormattedListText();
  const encodedText = encodeURIComponent(shareText);
  const appUrl = encodeURIComponent('https://nooshapp.ir');
  const telegramShareLink = `https://t.me/share/url?url=${appUrl}&text=${encodedText}`;

  return (
    <div className="bg-white rounded-2xl min-h-full flex flex-col relative">
      <div className="no-print shopping-list-ui p-6 flex flex-col flex-grow overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b pb-4 flex-shrink-0 pl-12 md:pl-20 pt-2">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
              <ShoppingCart size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 leading-none">سبد خرید</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1">({toPersianDigits(activeItems.length)} قلم کالا) · {user.kitchenMode === 'without-inventory' ? 'مقدار کامل دستورها، مستقل از انبار' : 'کسری پس از کسر موجودی ثبت‌شده'}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onPrintInternal} className="p-3 text-slate-600 hover:bg-slate-100 rounded-2xl transition-all border border-slate-200 active:scale-90 shadow-sm" title="چاپ لیست">
              <Printer size={22} />
            </button>
            <button onClick={handleSMS} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-blue-100 active:scale-90 shadow-sm" title="ارسال پیامک">
              <Smartphone size={22} />
            </button>
            <a href={`https://wa.me/?text=${encodedText}`} target="_blank" rel="noreferrer" className="p-3 text-green-600 hover:bg-green-50 rounded-2xl transition-all border border-green-100 active:scale-90 shadow-sm" title="ارسال به واتس‌اپ">
              <MessageCircle size={22} />
            </a>
            <a href={telegramShareLink} target="_blank" rel="noreferrer" className="p-3 text-sky-500 hover:bg-sky-100 rounded-2xl transition-all border border-sky-100 active:scale-90 shadow-sm" title="ارسال به تلگرام">
              <TelegramIcon />
            </a>
            {customItems.length > 0 && (
               <button onClick={() => setShowDeleteConfirm(true)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-rose-100 active:scale-90 shadow-sm" title="حذف همه">
                 <Trash2 size={22} />
               </button>
            )}
          </div>
        </div>
        {showDeleteConfirm && (
          <div className="mb-6 p-5 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center justify-between animate-enter shadow-lg shadow-rose-100/30">
             <div className="text-rose-700 font-black text-sm flex items-center gap-3"><AlertTriangle size={20} /> حذف کل لیست خرید؟</div>
             <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2 bg-white border border-rose-200 rounded-xl text-xs font-black text-slate-500">انصراف</button>
                <button onClick={handleDeleteAll} className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-md active:scale-95">تایید حذف</button>
             </div>
          </div>
        )}
        <div className="flex-grow overflow-y-auto">
          <div className="shopping-list-content space-y-5 max-w-3xl mx-auto pb-8 pr-1">
            <div className="sticky top-0 bg-white z-10 py-3 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input 
                    type="text" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                    placeholder="نام کالای جدید..."
                    className="w-full px-6 py-4 rounded-[1.5rem] border-2 border-slate-100 focus:border-teal-500 outline-none text-base font-black transition-all text-slate-800 bg-slate-50/50 shadow-inner"
                  />
                </div>
                <button onClick={handleAddItem} className="px-5 bg-teal-600 text-white rounded-[1.5rem] hover:bg-teal-700 shadow-xl shadow-teal-100 active:scale-95 transition-all flex items-center justify-center">
                  <Plus size={32} />
                </button>
              </div>
              <div className="flex justify-center gap-6 px-4">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><ShoppingCart size={10} /> نام کالا</span>
              </div>
            </div>
            <div className="space-y-5">
              {uniqueItems.length === 0 ? (
                <div className="text-center py-24 text-slate-300 border-2 border-dashed border-slate-100 rounded-[3.5rem] bg-slate-50/30">
                  <ShoppingCart size={64} className="mx-auto mb-6 opacity-5" />
                  <p className="font-black text-sm text-slate-400">سبد خرید شما خالی است</p>
                </div>
              ) : (
                ['proteins', 'grains', 'vegetables', 'other'].map(catId => {
                  const items = groupedItems[catId];
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={catId} className="shopping-category space-y-3">
                      <div className="flex items-center gap-3 px-2">
                        <div className={`w-2 h-6 rounded-full ${
                          catId === 'proteins' ? 'bg-rose-500' : 
                          catId === 'grains' ? 'bg-amber-500' : 
                          catId === 'vegetables' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                        <h3 className="text-lg font-black text-slate-800">{categoryTitles[catId]}</h3>
                        <div className="flex-grow h-px bg-slate-100" />
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          {toPersianDigits(items.length)} قلم
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className={`shopping-item group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all ${item.checked ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-slate-200 shadow-sm hover:border-teal-200'}`}>
                            <div className="flex items-center gap-3 cursor-pointer flex-grow min-w-0" onClick={() => toggleCheck(item.id)}>
                              <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200 group-hover:border-teal-400'}`}>
                                {item.checked && <CheckCircle2 size={18} className="text-white" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-extrabold transition-all truncate ${item.checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  {item.name}
                                </span>
                                {item.amount !== undefined && item.amount > 0 && item.unit && (
                                  <span className="mt-1 inline-flex w-fit items-center gap-1 text-[10px] font-bold text-emerald-800" dir="auto">
                                    <Ruler size={12} /> {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 6 }).format(item.amount)} {item.unit}
                                  </span>
                                )}
                                {(item.estimated || item.unresolved) && <span className="mt-1 text-[10px] font-bold text-amber-800">{item.unresolved ? 'مقدار نیاز دستور؛ تبدیل موجودی نیازمند بررسی است' : 'مقدار خرید بر پایهٔ تبدیل تقریبی'}</span>}
                                {item.fromRecipe && (
                                  <div className="flex flex-wrap gap-2 items-center mt-1">
                                    <span className="text-[9px] text-slate-400 font-bold truncate max-w-[230px]">برای: {item.fromRecipe}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-1">
                              <button onClick={() => editingItemId === item.id ? cancelEditingQuantity() : startEditingQuantity(item)} aria-label={`ویرایش مقدار ${item.name}`} title="ویرایش مقدار و واحد" className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all"><Pencil size={16} /></button>
                              <button onClick={() => handleDeleteItem(item.id)} aria-label={`حذف ${item.name}`} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                            {editingItemId === item.id && <div className="shopping-quantity-editor" onClick={event => event.stopPropagation()}>
                              <label><span>مقدار</span><input autoFocus type="text" inputMode="decimal" value={draftAmount} onChange={event => { setDraftAmount(event.target.value); setQuantityError(''); }} placeholder="مثلاً ۰٫۵" /></label>
                              <label><span>واحد</span><input type="text" value={draftUnit} onChange={event => setDraftUnit(event.target.value)} placeholder="کیلوگرم، عدد…" /></label>
                              <button onClick={() => saveQuantity(item.id)} aria-label="ذخیره مقدار"><Check size={17} /> ذخیره</button>
                              <button onClick={cancelEditingQuantity} aria-label="لغو ویرایش" className="shopping-quantity-cancel"><X size={16} /></button>
                              {quantityError && <span className="shopping-quantity-error" role="alert">{quantityError}</span>}
                            </div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;
