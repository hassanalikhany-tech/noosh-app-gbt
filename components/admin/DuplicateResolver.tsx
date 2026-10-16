
import React, { useState, useEffect, useMemo } from 'react';
import { Dish, DishCategory, CATEGORY_LABELS } from '../../types';
import { RecipeService } from '../../services/recipeService';
import { getHiddenDishIds } from '../../utils/dishStorage';
import { Trash2, Search, Eye, Edit2, Loader2, Check, ShieldAlert, Wifi, WifiOff, X, RefreshCw, Filter, Layers } from 'lucide-react';
import RecipeModal from '../RecipeModal';
import DishEditor from './DishEditor';

type AdminDish = Dish & { _internalId: string, isHidden: boolean };

interface DuplicateGroup {
  nameKey: string;
  originalName: string; 
  dishes: AdminDish[];
}

const normalizeText = (text: string) => {
  if (!text) return '';
  return text
    .trim()
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[\u200C\s\u00A0_-]+/g, '')
    .toLowerCase();
};

const DuplicateResolver: React.FC = () => {
  const [allDishes, setAllDishes] = useState<AdminDish[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DishCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDish, setViewingDish] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const loadFromSource = () => {
    const dishes = RecipeService.getRawDishes(); 
    const hiddenIds = getHiddenDishIds();
    const safeDishes = dishes.map((d, idx) => ({
      ...d, 
      _internalId: `admin-${d.id}-${idx}`,
      isHidden: hiddenIds.includes(d.id)
    }));
    setAllDishes(safeDishes);
  };

  useEffect(() => {
    loadFromSource();
    const handleRefresh = () => loadFromSource();
    window.addEventListener('recipes-updated', handleRefresh);
    return () => window.removeEventListener('recipes-updated', handleRefresh);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, AdminDish[]>();
    
    const filteredSource = allDishes.filter(dish => {
      const matchesCategory = selectedCategory === 'all' || dish.category === selectedCategory;
      const matchesSearch = !searchTerm || normalizeText(dish.name).includes(normalizeText(searchTerm));
      return matchesCategory && matchesSearch;
    });

    filteredSource.forEach(dish => {
      const key = normalizeText(dish.name); 
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(dish);
    });

    const resultGroups: DuplicateGroup[] = [];
    map.forEach((groupDishes, key) => {
      const isDuplicate = groupDishes.length > 1;
      if (!showAll && !isDuplicate && !searchTerm && selectedCategory === 'all') return;
      
      resultGroups.push({ nameKey: key, originalName: groupDishes[0].name, dishes: groupDishes });
    });
    
    return resultGroups.sort((a, b) => b.dishes.length - a.dishes.length);
  }, [allDishes, showAll, searchTerm, selectedCategory]);

  const executeDelete = async (dishId: string) => {
    if (!isOnline) {
      alert("شما آفلاین هستید! برای حذف دائمی باید به اینترنت متصل باشید.");
      return;
    }
    setProcessingId(dishId);
    setConfirmDeleteId(null);
    try {
      await RecipeService.deleteDish(dishId);
    } catch (e: any) {
      alert(`خطا: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleForceSync = async () => {
    setIsRefreshing(true);
    await RecipeService.syncFromCloud(true);
    setIsRefreshing(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden pb-10 relative min-h-[600px] animate-enter">
      <div className="bg-indigo-600 p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
           <div className="p-3 bg-white/20 rounded-2xl">
              <Layers size={24} />
           </div>
           <div>
              <h2 className="text-xl font-black">مدیریت و اصلاح فهرست‌ها</h2>
              <p className="text-[10px] opacity-80 mt-1 font-bold">تغییر دسته‌بندی غذاها و حذف موارد تکراری</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={handleForceSync} disabled={isRefreshing} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black ${isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300 animate-pulse'}`}>
                {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>}
                {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 z-20 space-y-4">
        <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar py-2">
            <button 
              onClick={() => setSelectedCategory('all')} 
              className={`px-5 py-2.5 rounded-xl text-[11px] font-black border-2 transition-all whitespace-nowrap ${selectedCategory === 'all' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'}`}
            >
              همه پخت‌ها
            </button>
            {(Object.keys(CATEGORY_LABELS) as DishCategory[]).map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)} 
                className={`px-5 py-2.5 rounded-xl text-[11px] font-black border-2 transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'}`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4">
           <div className="relative flex-grow sm:w-64">
              <input type="text" placeholder="جستجو در این فهرست..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-4 py-3 text-sm border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold bg-white" />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
           </div>
           <button onClick={() => setShowAll(!showAll)} className={`px-8 py-3 rounded-2xl text-xs font-black border-2 transition-all ${showAll ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
             {showAll ? 'نمایش همه' : 'فقط تکراری‌ها'}
           </button>
        </div>
      </div>

      <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto no-scrollbar">
        {groups.length === 0 ? (
           <div className="py-24 text-center text-slate-300 flex flex-col items-center gap-4">
             <Filter size={48} className="opacity-10" />
             <p className="font-black italic">موردی یافت نشد.</p>
           </div>
        ) : groups.map(group => (
          <div key={group.nameKey} className="border border-slate-200 rounded-[2.5rem] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow group/card">
            <div className="p-5 bg-slate-50/50 border-b flex justify-between items-center group-hover/card:bg-indigo-50/30 transition-colors">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border border-slate-200 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm">
                    {group.dishes.length}
                  </div>
                  <span className="font-black text-slate-800 text-lg">{group.originalName}</span>
               </div>
            </div>
            <div className="divide-y divide-slate-50">
              {group.dishes.map(dish => (
                  <div key={dish._internalId} className="flex items-center p-5 hover:bg-slate-50/80 group/row">
                    <div className="flex-grow">
                        <div className="font-black text-sm text-slate-700 flex items-center gap-2">
                          {dish.name}
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] rounded uppercase font-mono">{CATEGORY_LABELS[dish.category]}</span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-300 font-mono mt-1">{dish.id}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {confirmDeleteId === dish.id ? (
                          <div className="flex items-center gap-2 animate-enter bg-rose-50 p-1.5 rounded-2xl border border-rose-100">
                             <button onClick={() => executeDelete(dish.id)} className="px-4 py-2 bg-rose-600 text-white text-[10px] font-black rounded-xl shadow-md">حذف</button>
                             <button onClick={() => setConfirmDeleteId(null)} className="p-2 text-slate-400 hover:bg-white rounded-xl"><X size={16}/></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => setViewingDish(dish)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"><Eye size={20}/></button>
                            <button onClick={() => setEditingDish(dish)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-white rounded-xl transition-all"><Edit2 size={20}/></button>
                            <button 
                                disabled={processingId === dish.id}
                                onClick={() => setConfirmDeleteId(dish.id)} 
                                className={`p-3 rounded-2xl transition-all ${processingId === dish.id ? 'bg-slate-100 text-slate-400 animate-pulse' : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'}`}
                            >
                                {processingId === dish.id ? <Loader2 className="animate-spin" size={20}/> : <Trash2 size={20}/>}
                            </button>
                          </>
                        )}
                    </div>
                  </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {viewingDish && <RecipeModal dish={viewingDish} isOpen={!!viewingDish} onClose={() => setViewingDish(null)} user={null} />}
      {editingDish && (
        <DishEditor 
          dish={editingDish} 
          onClose={() => setEditingDish(null)} 
          onSave={() => loadFromSource()} 
        />
      )}
    </div>
  );
};

export default DuplicateResolver;
