import React, { useMemo, useState } from 'react';
import { AlertCircle, Check, CheckSquare, Copy, Download, Filter, Image as ImageIcon, LoaderCircle, RefreshCw, Search, Square, ZoomIn, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CATEGORY_LABELS, Dish } from '../../types';
import { RecipeService } from '../../services/recipeService';
import { getDishImageCandidates } from '../../utils/dishImageSources';
import DishVisual from '../DishVisual';

type ImageAuditStatus = 'available' | 'missing' | 'broken';
type AuditFilter = 'all' | 'missing' | 'broken' | 'duplicate' | 'replace';
type AuditResult = { status: ImageAuditStatus; url?: string };

const explicitImage = (dish: Dish) => Boolean(dish.imageUrl?.trim() && dish.imageUrl.trim().toLowerCase() !== 'none');

const normalizedSource = (source: string) => {
  try {
    const url = new URL(source, window.location.origin);
    url.hash = '';
    url.search = '';
    return url.href.replace(/\/$/, '').toLowerCase();
  } catch {
    return source.split(/[?#]/)[0].replace(/\/$/, '').toLowerCase();
  }
};

const checkImage = (source: string): Promise<boolean> => new Promise(resolve => {
  const image = new Image();
  const timeout = window.setTimeout(() => {
    image.src = '';
    resolve(false);
  }, 12000);
  image.onload = () => { window.clearTimeout(timeout); resolve(true); };
  image.onerror = () => { window.clearTimeout(timeout); resolve(false); };
  image.src = source;
});

const DishImagePreview: React.FC<{ dish: Dish; onZoom: (url: string) => void }> = ({ dish, onZoom }) => {
  const sources = useMemo(() => getDishImageCandidates(dish.id, dish.imageUrl), [dish.id, dish.imageUrl]);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  React.useEffect(() => { setIndex(0); setFailed(false); }, [sources]);

  if (!sources.length || failed || index >= sources.length) {
    return (
      <button type="button" className="w-16 h-16 rounded-2xl overflow-hidden cursor-default" aria-label={`تصویر شماتیک ${dish.name}`}>
        <DishVisual category={dish.category} dishId={dish.id} imageUrl={dish.imageUrl} className="w-full h-full" iconSize={24} />
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onZoom(sources[index])} className="w-16 h-16 rounded-2xl overflow-hidden mx-auto shadow-sm border border-slate-200 cursor-zoom-in relative group/img bg-slate-100" aria-label={`بزرگ‌نمایی تصویر ${dish.name}`}>
      <img src={sources[index]} alt={dish.name} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" onError={() => {
        if (index + 1 < sources.length) setIndex(current => current + 1);
        else setFailed(true);
      }} loading="lazy" decoding="async" />
      <span className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 grid place-items-center opacity-0 group-hover/img:opacity-100 transition-all"><ZoomIn size={18} className="text-white" /></span>
    </button>
  );
};

const ImageGuide: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; name: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<AuditFilter>('all');
  const [auditResults, setAuditResults] = useState<Record<string, AuditResult>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ complete: 0, total: 0 });
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  const allDishes = useMemo(() => RecipeService.getAllDishes(), [refreshKey]);
  const duplicateDishIds = useMemo(() => {
    const sourceGroups = new Map<string, string[]>();
    allDishes.forEach(dish => {
      if (!explicitImage(dish)) return;
      const source = normalizedSource(dish.imageUrl!.trim());
      sourceGroups.set(source, [...(sourceGroups.get(source) || []), dish.id]);
    });
    return new Set(Array.from(sourceGroups.values()).filter(ids => ids.length > 1).flat());
  }, [allDishes]);

  const filteredDishes = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    return allDishes.filter(dish => {
      if (term && !`${dish.name} ${dish.id}`.toLocaleLowerCase().includes(term)) return false;
      const result = auditResults[dish.id];
      if (activeFilter === 'missing') return result?.status === 'missing';
      if (activeFilter === 'broken') return result?.status === 'broken';
      if (activeFilter === 'duplicate') return duplicateDishIds.has(dish.id);
      if (activeFilter === 'replace') return dish.imageReviewStatus === 'replace';
      return true;
    });
  }, [allDishes, searchTerm, activeFilter, auditResults, duplicateDishIds]);

  const counts = useMemo(() => ({
    all: allDishes.length,
    missing: allDishes.filter(dish => auditResults[dish.id]?.status === 'missing').length,
    broken: allDishes.filter(dish => auditResults[dish.id]?.status === 'broken').length,
    duplicate: duplicateDishIds.size,
    replace: allDishes.filter(dish => dish.imageReviewStatus === 'replace').length,
  }), [allDishes, auditResults, duplicateDishIds]);

  const handleToggleSelect = (id: string) => setSelectedIds(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSelectAll = () => setSelectedIds(previous =>
    previous.size === filteredDishes.length ? new Set() : new Set(filteredDishes.map(dish => dish.id))
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setMessage('مرورگر اجازهٔ کپی نداد. شناسه را دستی کپی کنید.');
    }
  };

  const scanImages = async () => {
    setIsScanning(true);
    setMessage('');
    setAuditResults({});
    setScanProgress({ complete: 0, total: allDishes.length });
    const results: Record<string, AuditResult> = {};
    let cursor = 0;
    let complete = 0;
    const worker = async () => {
      while (true) {
        const dish = allDishes[cursor++];
        if (!dish) return;
        const sources = getDishImageCandidates(dish.id, dish.imageUrl);
        let workingUrl: string | undefined;
        for (const source of sources) {
          if (await checkImage(source)) { workingUrl = source; break; }
        }
        results[dish.id] = workingUrl
          ? { status: 'available', url: workingUrl }
          : { status: explicitImage(dish) ? 'broken' : 'missing' };
        complete++;
        if (complete % 12 === 0 || complete === allDishes.length) {
          setScanProgress({ complete, total: allDishes.length });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, allDishes.length) }, worker));
    setAuditResults(results);
    setIsScanning(false);
    setMessage(`بررسی ${allDishes.length} تصویر تمام شد.`);
  };

  const toggleReviewFlag = async (dish: Dish) => {
    const nextStatus = dish.imageReviewStatus === 'replace' ? 'approved' : 'replace';
    setSavingIds(previous => new Set(previous).add(dish.id));
    const saved = await RecipeService.updateDish(dish.id, { imageReviewStatus: nextStatus });
    setSavingIds(previous => { const next = new Set(previous); next.delete(dish.id); return next; });
    if (saved) {
      setMessage(nextStatus === 'replace' ? `«${dish.name}» برای جایگزینی علامت خورد.` : `علامت بازبینی «${dish.name}» برداشته شد.`);
      setRefreshKey(key => key + 1);
    } else {
      setMessage('ذخیرهٔ علامت انجام نشد. اتصال Firebase یا دسترسی مدیریت را بررسی کنید.');
    }
  };

  const handleExportExcel = () => {
    const exportDishes = selectedIds.size ? allDishes.filter(dish => selectedIds.has(dish.id)) : filteredDishes;
    if (!exportDishes.length) { setMessage('موردی برای خروجی وجود ندارد.'); return; }
    const rows = exportDishes.map(dish => ({
      'شناسه': dish.id,
      'نام غذا': dish.name,
      'دسته‌بندی': CATEGORY_LABELS[dish.category] || dish.category,
      'آدرس تصویر اصلی': dish.imageUrl || '',
      'تصویر قابل نمایش در اپ': auditResults[dish.id]?.url || '',
      'وضعیت بررسی': auditResults[dish.id]?.status || 'بررسی نشده',
      'منبع تکراری': duplicateDishIds.has(dish.id) ? 'بله؛ آدرس یکسان' : 'خیر',
      'نیازمند جایگزینی': dish.imageReviewStatus === 'replace' ? 'بله' : 'خیر',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'بازبینی عکس‌ها');
    XLSX.writeFile(workbook, `Noosh_Image_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filterOptions: { id: AuditFilter; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'همه' },
    { id: 'missing', label: 'بدون تصویر' },
    { id: 'broken', label: 'لینک خراب' },
    { id: 'duplicate', label: 'منبع تکراری' },
    { id: 'replace', label: 'نیازمند جایگزینی' },
  ];

  return (
    <div dir="rtl" className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[560px] animate-enter relative">
      {zoomedImage && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-5" onClick={() => setZoomedImage(null)}>
          <button type="button" aria-label="بستن" className="absolute top-5 left-5 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full"><X size={24} /></button>
          <div className="max-w-4xl w-full flex flex-col items-center gap-4" onClick={event => event.stopPropagation()}>
            <img src={zoomedImage.url} alt={zoomedImage.name} className="max-h-[72vh] max-w-full rounded-2xl object-contain bg-slate-900" onError={() => setZoomedImage(null)} />
            <h3 className="text-white text-xl font-black">{zoomedImage.name}</h3>
            <p dir="ltr" className="text-teal-300 font-mono text-xs break-all text-center">{zoomedImage.url}</p>
          </div>
        </div>
      )}

      <div className="p-6 md:p-7 border-b border-slate-100 bg-[#f8faf8]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl"><ImageIcon size={27} /></div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">بازبینی عکس غذاها</h2>
              <p className="text-sm text-slate-500 mt-1">همان عکس و مسیر جایگزینی که کارت‌های غذا در اپ استفاده می‌کنند.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={scanImages} disabled={isScanning || allDishes.length === 0} className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60">
              {isScanning ? <LoaderCircle size={17} className="animate-spin" /> : <Filter size={17} />}
              {isScanning ? `در حال بررسی ${scanProgress.complete} از ${scanProgress.total}` : 'بررسی در دسترس بودن عکس‌ها'}
            </button>
            <button type="button" onClick={() => { setRefreshKey(key => key + 1); setAuditResults({}); }} className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50" title="تازه‌سازی فهرست"><RefreshCw size={19} /></button>
            <button type="button" onClick={handleExportExcel} className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 bg-slate-800 text-white hover:bg-slate-900">
              <Download size={17} /> خروجی اکسل
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-5">
          {filterOptions.map(option => (
            <button key={option.id} type="button" onClick={() => setActiveFilter(option.id)} className={`rounded-xl px-3 py-2.5 text-right transition-colors ${activeFilter === option.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'}`}>
              <span className="block text-xs font-bold">{option.label}</span>
              <span className={`block text-lg font-black mt-0.5 ${activeFilter === option.id ? 'text-emerald-300' : 'text-slate-800'}`}>{counts[option.id]}</span>
            </button>
          ))}
        </div>

        <div className="relative mt-4">
          <input type="search" placeholder="جستجوی نام یا شناسهٔ غذا..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none bg-white" />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
        </div>
        {isScanning && <div className="h-1.5 bg-slate-100 mt-4 rounded-full overflow-hidden"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${scanProgress.total ? scanProgress.complete / scanProgress.total * 100 : 0}%` }} /></div>}
        {message && <p role="status" className="text-xs text-slate-600 mt-3">{message}</p>}
      </div>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-right text-sm min-w-[850px]">
          <thead className="bg-white text-slate-500 font-bold text-xs sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-4 w-12 text-center"><button type="button" aria-label="انتخاب همه" onClick={handleSelectAll}>{selectedIds.size === filteredDishes.length && filteredDishes.length ? <CheckSquare size={18} className="text-emerald-700" /> : <Square size={18} />}</button></th>
              <th className="p-4 w-24 text-center">پیش‌نمایش</th>
              <th className="p-4">غذا</th>
              <th className="p-4">دسته</th>
              <th className="p-4 text-center">نتیجهٔ بررسی</th>
              <th className="p-4 text-center">علامت بازبینی</th>
              <th className="p-4 w-16 text-center">شناسه</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDishes.map(dish => {
              const result = auditResults[dish.id];
              const isDuplicate = duplicateDishIds.has(dish.id);
              const isSelected = selectedIds.has(dish.id);
              const flagged = dish.imageReviewStatus === 'replace';
              const status = result?.status === 'available' ? 'عکس در دسترس' : result?.status === 'broken' ? 'همهٔ لینک‌ها خراب' : result?.status === 'missing' ? 'عکسی پیدا نشد' : explicitImage(dish) ? 'آمادهٔ بررسی' : 'فاقد لینک مستقیم';
              return (
                <tr key={dish.id} className={`transition-colors ${isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                  <td className="p-3 text-center"><button type="button" aria-label={`انتخاب ${dish.name}`} onClick={() => handleToggleSelect(dish.id)} className={isSelected ? 'text-emerald-700' : 'text-slate-300'}>{isSelected ? <CheckSquare size={19} /> : <Square size={19} />}</button></td>
                  <td className="p-3 text-center"><DishImagePreview dish={dish} onZoom={url => setZoomedImage({ url, name: dish.name })} /></td>
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{dish.name}</div>
                    <div dir="ltr" className="text-[10px] text-slate-400 font-mono mt-1 text-right">{dish.imageUrl || 'تصویر پیش‌فرض از مخزن غذاها'}</div>
                  </td>
                  <td className="p-3"><span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg">{CATEGORY_LABELS[dish.category] || 'سایر'}</span></td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${result?.status === 'available' ? 'bg-emerald-50 text-emerald-700' : result?.status === 'broken' || result?.status === 'missing' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                      {result?.status === 'available' ? <Check size={12} /> : result?.status === 'broken' || result?.status === 'missing' ? <AlertCircle size={12} /> : null}{status}
                    </span>
                    {isDuplicate && <span className="block mt-1 text-[10px] text-amber-700">آدرس عکس تکراری</span>}
                  </td>
                  <td className="p-3 text-center">
                    <button type="button" disabled={savingIds.has(dish.id)} onClick={() => toggleReviewFlag(dish)} className={`px-3 py-2 rounded-lg text-[11px] font-bold disabled:opacity-50 ${flagged ? 'bg-amber-100 text-amber-900' : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-300'}`}>
                      {savingIds.has(dish.id) ? 'در حال ذخیره...' : flagged ? 'در صف جایگزینی' : 'علامت برای جایگزینی'}
                    </button>
                  </td>
                  <td className="p-3 text-center"><button type="button" onClick={() => handleCopy(dish.id)} className={`p-2 rounded-lg ${copiedId === dish.id ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400 hover:bg-slate-100'}`} title="کپی شناسه">{copiedId === dish.id ? <Check size={16} /> : <Copy size={16} />}</button></td>
                </tr>
              );
            })}
            {!filteredDishes.length && <tr><td colSpan={7} className="p-12 text-center text-slate-500">غذایی با این فیلتر پیدا نشد. برای تشخیص عکس‌های خراب، بررسی تصاویر را اجرا کنید.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap justify-between gap-2 items-center shrink-0">
        <div className="text-xs text-white/75">{selectedIds.size} انتخاب‌شده · {filteredDishes.length} مورد در این فهرست · {allDishes.length} غذا در کل</div>
        <div className="text-[11px] text-white/70">تکراری یعنی آدرس تصویر یکسان؛ مرتبط‌بودن عکس را خودتان علامت بزنید.</div>
      </div>
    </div>
  );
};

export default ImageGuide;
