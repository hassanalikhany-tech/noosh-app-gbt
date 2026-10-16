import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckSquare, Copy, Download, Filter, Image as ImageIcon, LoaderCircle, RefreshCw, Search, Square, ZoomIn, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CATEGORY_LABELS, Dish } from '../../types';
import { RecipeService } from '../../services/recipeService';
import { getDishImageCandidates } from '../../utils/dishImageSources';
import DishVisual from '../DishVisual';

type ImageAuditStatus = 'available' | 'missing' | 'broken';
type AuditFilter = 'all' | 'unreviewed' | 'reviewed' | 'missing' | 'broken' | 'duplicate' | 'replace' | 'approved' | 'create' | 'removed' | 'completed';
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
  const [zoomedImage, setZoomedImage] = useState<{ dishId: string; url: string } | null>(null);
  const [zoomQueue, setZoomQueue] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<AuditFilter>('all');
  const [auditResults, setAuditResults] = useState<Record<string, AuditResult>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ complete: 0, total: 0 });
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);
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
      if (activeFilter === 'unreviewed') return !dish.imageReviewStatus;
      if (activeFilter === 'reviewed') return Boolean(dish.imageReviewStatus);
      if (activeFilter === 'missing') return result?.status === 'missing';
      if (activeFilter === 'broken') return result?.status === 'broken';
      if (activeFilter === 'duplicate') return duplicateDishIds.has(dish.id);
      if (['replace', 'approved', 'create', 'removed', 'completed'].includes(activeFilter)) return dish.imageReviewStatus === activeFilter;
      return true;
    });
  }, [allDishes, searchTerm, activeFilter, auditResults, duplicateDishIds]);

  const counts = useMemo(() => ({
    approved: allDishes.filter(d => d.imageReviewStatus === 'approved').length,
    reviewed: allDishes.filter(d => Boolean(d.imageReviewStatus)).length,
    unreviewed: allDishes.filter(d => !d.imageReviewStatus).length,
    create: allDishes.filter(d => d.imageReviewStatus === 'create').length,
    removed: allDishes.filter(d => d.imageReviewStatus === 'removed').length,
    completed: allDishes.filter(d => d.imageReviewStatus === 'completed').length,
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

  const visibleSelectedDishes = filteredDishes.filter(dish => selectedIds.has(dish.id));
  const allVisibleSelected = filteredDishes.length > 0 && visibleSelectedDishes.length === filteredDishes.length;

  const handleSelectAll = () => setSelectedIds(previous => {
    const next = new Set(previous);
    if (filteredDishes.length > 0 && filteredDishes.every(dish => next.has(dish.id))) {
      filteredDishes.forEach(dish => next.delete(dish.id));
    } else {
      filteredDishes.forEach(dish => next.add(dish.id));
    }
    return next;
  });

  const handleBulkCreate = async () => {
    const targets = visibleSelectedDishes;
    if (!targets.length || isBulkSaving) return;
    if (!confirm(`درخواست ساخت تصویر جدید برای ${targets.length} غذای انتخاب‌شده ثبت شود؟ این درخواست یکجا در کاتالوگ منتشر می‌شود؛ خود فایل تصویر پس از آماده‌شدن در انتشار بعدی اضافه خواهد شد.`)) return;

    const targetIds = new Set(targets.map(dish => dish.id));
    setIsBulkSaving(true);
    setSavingIds(previous => new Set([...previous, ...targetIds]));
    setMessage('در حال ثبت گروهی درخواست ساخت تصویر…');
    const saved = await RecipeService.updateDishesBatch(targets.map(dish => ({
      id: dish.id,
      data: { imageReviewStatus: 'create' },
    })));
    setSavingIds(previous => {
      const next = new Set(previous);
      targetIds.forEach(id => next.delete(id));
      return next;
    });
    setIsBulkSaving(false);

    if (saved) {
      setSelectedIds(previous => {
        const next = new Set(previous);
        targetIds.forEach(id => next.delete(id));
        return next;
      });
      setActiveFilter('create');
      setSearchTerm('');
      setMessage(`درخواست ساخت تصویر برای ${targets.length} غذا یکجا در GitHub ثبت شد؛ Netlify انتشار را شروع می‌کند.`);
      setRefreshKey(key => key + 1);
    } else {
      setMessage('ثبت گروهی در GitHub انجام نشد. اتصال امن مدیریت را بررسی کن؛ وضعیت محلی ممکن است ذخیره شده باشد.');
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setMessage('مرورگر اجازهٔ کپی نداد. شناسه را دستی کپی کنید.');
    }
  };

  const scanImages = async (selectMissingAfterScan = false) => {
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
    if (selectMissingAfterScan) {
      const missingIds = allDishes.filter(dish => results[dish.id]?.status === 'missing').map(dish => dish.id);
      setActiveFilter('missing');
      setSearchTerm('');
      setSelectedIds(new Set(missingIds));
      setMessage(`بررسی تمام شد؛ ${missingIds.length} غذای بدون تصویر انتخاب شد. می‌توانی موارد دلخواه را از حالت انتخاب خارج کنی.`);
    } else {
      setMessage(`بررسی ${allDishes.length} تصویر تمام شد.`);
    }
  };

  const handleSelectAllMissing = () => {
    if (isScanning) return;
    if (!allDishes.every(dish => auditResults[dish.id])) {
      void scanImages(true);
      return;
    }
    const missingIds = allDishes.filter(dish => auditResults[dish.id]?.status === 'missing').map(dish => dish.id);
    setActiveFilter('missing');
    setSearchTerm('');
    setSelectedIds(new Set(missingIds));
    setMessage(`${missingIds.length} غذای بدون تصویر انتخاب شد؛ موارد دلخواه را می‌توانی از حالت انتخاب خارج کنی.`);
  };

  const toggleReviewFlag = async (dish: Dish, nextStatus: Dish['imageReviewStatus']) => {
    if (nextStatus === 'removed' && !confirm('تصویر این غذا روی دستگاه شما حذف و با نماد غذا جایگزین شود؟')) return;
    setSavingIds(previous => new Set(previous).add(dish.id));
    const saved = await RecipeService.updateDish(dish.id, { imageReviewStatus: nextStatus, ...(nextStatus === 'removed' ? { imageUrl: 'none' } : nextStatus === 'approved' && auditResults[dish.id]?.url ? { imageUrl: auditResults[dish.id].url } : {}) });
    setSavingIds(previous => { const next = new Set(previous); next.delete(dish.id); return next; });
    if (saved) {
      setMessage(`وضعیت تصویر «${dish.name}» در GitHub ثبت شد؛ Netlify انتشار را شروع می‌کند.`);
      setRefreshKey(key => key + 1);
    } else {
      setMessage('وضعیت در این دستگاه ذخیره شد، اما انتشار سراسری در GitHub انجام نشد. اتصال امن مدیریت را بررسی کن.');
    }
  };

  const zoomIndex = zoomedImage ? zoomQueue.indexOf(zoomedImage.dishId) : -1;
  const zoomDish = zoomedImage ? allDishes.find(dish => dish.id === zoomedImage.dishId) : undefined;
  const moveZoom = (direction: -1 | 1) => {
    const nextId = zoomQueue[zoomIndex + direction];
    const nextDish = allDishes.find(dish => dish.id === nextId);
    if (!nextId || !nextDish) return;
    const sources = getDishImageCandidates(nextDish.id, nextDish.imageUrl);
    setZoomedImage({ dishId: nextId, url: sources[0] || '' });
  };

  useEffect(() => {
    if (!zoomedImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomedImage(null);
      if (event.key === 'ArrowRight') { event.preventDefault(); moveZoom(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveZoom(-1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomedImage, zoomQueue, zoomIndex, allDishes]);

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
      'وضعیت انتخاب‌شده': dish.imageReviewStatus || 'بررسی نشده',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'بازبینی عکس‌ها');
    XLSX.writeFile(workbook, `Noosh_Image_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filterOptions: { id: AuditFilter; label: string; icon?: React.ReactNode }[] = [
    { id: 'unreviewed', label: 'بررسی‌نشده' },
    { id: 'reviewed', label: 'بررسی‌شده' },
    { id: 'approved', label: 'تأیید و حفظ' },
    { id: 'create', label: 'ساخت تصویر جدید' },
    { id: 'removed', label: 'حذف‌شده' },
    { id: 'completed', label: 'جایگزین‌شده' },
    { id: 'all', label: 'همه' },
    { id: 'missing', label: 'بدون تصویر' },
    { id: 'broken', label: 'لینک خراب' },
    { id: 'duplicate', label: 'منبع تکراری' },
    { id: 'replace', label: 'نیازمند جایگزینی' },
  ];

  return (
    <div dir="rtl" className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[560px] animate-enter relative">
      {zoomedImage && zoomDish && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8" onClick={() => setZoomedImage(null)}>
          <button type="button" aria-label="بستن" className="absolute top-5 left-5 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full"><X size={24} /></button>
          <div className="w-full max-w-6xl grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-center" onClick={event => event.stopPropagation()}>
            <div className="min-h-[55vh] flex items-center justify-center relative rounded-3xl bg-black/25 p-3">
              <button type="button" onClick={() => moveZoom(-1)} disabled={zoomIndex <= 0} aria-label="عکس قبلی؛ کلید جهت‌نمای چپ" className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full p-3 bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"><ArrowRight size={22} /></button>
              <img src={zoomedImage.url} alt={zoomDish.name} className="max-h-[78vh] max-w-full rounded-2xl object-contain bg-slate-900" onError={() => setMessage(`تصویر «${zoomDish.name}» بارگذاری نشد؛ برای تصمیم از گزینه‌های کنار عکس استفاده کن.`)} />
              <button type="button" onClick={() => moveZoom(1)} disabled={zoomIndex < 0 || zoomIndex >= zoomQueue.length - 1} aria-label="عکس بعدی؛ کلید جهت‌نمای راست" className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full p-3 bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"><ArrowLeft size={22} /></button>
            </div>
            <aside className="rounded-3xl bg-white p-5 shadow-2xl text-right">
              <div className="text-xs font-bold text-emerald-700">بازبینی عکس {zoomIndex + 1} از {zoomQueue.length}</div>
              <h3 className="mt-2 text-xl font-black text-slate-900">{zoomDish.name}</h3>
              <p className="mt-1 text-xs text-slate-500">تصمیم اینجا ثبت می‌شود و پنجرهٔ عکس باز می‌ماند.</p>
              <label className="block mt-5 text-xs font-bold text-slate-700" htmlFor="zoom-image-review-status">تصمیم دربارهٔ تصویر</label>
              <select id="zoom-image-review-status" disabled={savingIds.has(zoomDish.id)} value={zoomDish.imageReviewStatus || ''} onChange={event => void toggleReviewFlag(zoomDish, (event.target.value || undefined) as Dish['imageReviewStatus'])} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800">
                <option value="">بررسی‌نشده</option><option value="approved">تأیید و حفظ تصویر</option><option value="replace">نیاز به جایگزینی</option><option value="create">ساخت تصویر جدید</option><option value="removed">حذف تصویر</option><option value="completed">تصویر جایگزین شد</option>
              </select>
              {zoomDish.imageReviewStatus && <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><Check size={14} /> تصمیم ثبت شده؛ از فیلتر «بررسی‌نشده» ادامه بده.</div>}
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => moveZoom(-1)} disabled={zoomIndex <= 0} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40"><ArrowRight size={16} className="inline ml-1" /> قبلی</button>
                <button type="button" onClick={() => moveZoom(1)} disabled={zoomIndex < 0 || zoomIndex >= zoomQueue.length - 1} className="flex-1 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40">بعدی <ArrowLeft size={16} className="inline mr-1" /></button>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">کلید ← عکس قبلی · کلید → عکس بعدی · Esc بستن</p>
              <p dir="ltr" className="mt-4 text-left font-mono text-[10px] text-slate-400 break-all">{zoomedImage.url}</p>
            </aside>
          </div>
        </div>
      )}

      <div className="p-6 md:p-7 border-b border-slate-100 bg-[#f8faf8]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl"><ImageIcon size={27} /></div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">بازبینی عکس غذاها</h2>
              <p className="text-sm text-slate-500 mt-1">تصویرها را بررسی و علامت‌گذاری کن؛ خروجی گزارش را برای اصلاح و انتشار ارسال کن. تأیید و حفظ یعنی این تصویر در بازبینی‌های بعدی تغییر نکند.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleSelectAllMissing} disabled={isScanning || allDishes.length === 0} className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 bg-amber-100 text-amber-950 hover:bg-amber-200 disabled:opacity-60">
              <CheckSquare size={17} /> انتخاب همهٔ غذاهای بدون عکس{counts.missing ? ` (${counts.missing})` : ''}
            </button>
            {visibleSelectedDishes.length > 0 && <button type="button" disabled={isBulkSaving || visibleSelectedDishes.some(dish => savingIds.has(dish.id))} onClick={() => void handleBulkCreate()} className="px-4 py-3 rounded-xl text-sm font-black flex items-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60">
              {isBulkSaving ? <LoaderCircle size={17} className="animate-spin" /> : <ImageIcon size={17} />}
              ساخت تصویر برای {visibleSelectedDishes.length} انتخاب
            </button>}
            <button type="button" onClick={scanImages} disabled={isScanning || allDishes.length === 0} className="px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60">
              {isScanning ? <LoaderCircle size={17} className="animate-spin" /> : <Filter size={17} />}
              {isScanning ? `در حال بررسی ${scanProgress.complete} از ${scanProgress.total}` : 'بررسی در دسترس بودن عکس‌ها'}
            </button>
            <button type="button" onClick={() => { setRefreshKey(key => key + 1); setAuditResults({}); }} className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50" title="تازه‌سازی فهرست"><RefreshCw size={19} /></button>
            <button type="button" onClick={() => {
              const rows = allDishes.filter(d => d.imageReviewStatus).map(d => ({ id: d.id, name: d.name, imageUrl: d.imageUrl, imageReviewStatus: d.imageReviewStatus }));
              const url = URL.createObjectURL(new Blob([JSON.stringify({version: 1, reviews: rows}, null, 2)], {type: 'application/json'}));
              const a = document.createElement('a'); a.href = url; a.download = 'noosh-image-reviews.json'; a.click(); URL.revokeObjectURL(url);
            }} className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold">دریافت گزارش برای اصلاح عکس‌ها</button>
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
              <th className="p-4 w-12 text-center"><button type="button" aria-label={allVisibleSelected ? 'لغو انتخاب همهٔ موارد این فهرست' : 'انتخاب همهٔ موارد این فهرست'} title={allVisibleSelected ? 'لغو انتخاب همهٔ موارد این فهرست' : 'انتخاب همهٔ موارد این فهرست'} disabled={!filteredDishes.length} onClick={handleSelectAll} className="disabled:opacity-30">{allVisibleSelected ? <CheckSquare size={18} className="text-emerald-700" /> : <Square size={18} />}</button></th>
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
                  <td className="p-3 text-center"><DishImagePreview dish={dish} onZoom={url => { setZoomQueue(filteredDishes.map(item => item.id)); setZoomedImage({ dishId: dish.id, url }); }} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 font-bold text-slate-800">{dish.name}{dish.imageReviewStatus && <span title={dish.imageReviewStatus === 'completed' ? 'تصویر تازه منتشر شده' : 'برای این عکس تصمیم بازبینی ثبت شده'} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800"><Check size={12} /> {dish.imageReviewStatus === 'completed' ? 'تصویر جایگزین شد' : 'بررسی شد'}</span>}</div>
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
                    <select aria-label={`وضعیت تصویر ${dish.name}`} disabled={savingIds.has(dish.id)} value={dish.imageReviewStatus || ''} onChange={event => void toggleReviewFlag(dish, (event.target.value || undefined) as Dish['imageReviewStatus'])} className="max-w-44 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                      <option value="">بررسی نشده</option><option value="approved">تأیید و حفظ تصویر</option><option value="replace">نیاز به جایگزینی</option><option value="create">ساخت تصویر جدید</option><option value="removed">حذف تصویر</option><option value="completed">تصویر جایگزین شد</option>
                    </select>
                  </td>
                  <td className="p-3 text-center"><button type="button" onClick={() => handleCopy(dish.id)} className={`p-2 rounded-lg ${copiedId === dish.id ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400 hover:bg-slate-100'}`} title="کپی شناسه">{copiedId === dish.id ? <Check size={16} /> : <Copy size={16} />}</button></td>
                </tr>
              );
            })}
            {!filteredDishes.length && <tr><td colSpan={7} className="p-12 text-center text-slate-500">غذایی با این فیلتر پیدا نشد. برای تشخیص عکس‌های خراب، بررسی تصاویر را اجرا کنید.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap justify-between gap-3 items-center shrink-0">
        <div className="text-xs text-white/75">{visibleSelectedDishes.length} انتخاب‌شده از این فهرست · {filteredDishes.length} مورد در فهرست · {allDishes.length} غذا در کل</div>
        <div className="text-[11px] text-white/70">تصمیم «ساخت تصویر» به‌صورت یک درخواست گروهی ثبت می‌شود؛ برای فایل واقعی عکس، مرحلهٔ تولید و انتشار لازم است.</div>
      </div>
    </div>
  );
};

export default ImageGuide;
