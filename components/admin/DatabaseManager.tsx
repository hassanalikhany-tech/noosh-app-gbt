
import { CloudLightning, Loader2, Database, RefreshCw, Trash2, Download, ShieldAlert, FileSpreadsheet, UploadCloud, Info, AlertTriangle, Play } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { RecipeService } from '../../services/recipeService';
import { estimateCalories, estimateCookTime, getDifficulty, getDishNature } from '../../utils/recipeHelpers';

const DatabaseManager: React.FC = () => {
  const [stats, setStats] = useState({ local: 0, cache: 0, cloud: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [manualJson, setManualJson] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    const local = RecipeService.getLocalCount();
    const cache = await RecipeService.getOfflineCacheCount();
    const cloud = await RecipeService.getRealCloudCount();
    setStats({ local, cache, cloud });
    setIsLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleManualSeed = async () => {
    if (!manualJson.trim()) {
      alert("لطفاً کد JSON استخراج شده از مبدل اکسل را اینجا وارد کنید.");
      return;
    }
    try {
      const dishes = JSON.parse(manualJson);
      if (!Array.isArray(dishes)) throw new Error("فرمت وارد شده صحیح نیست. باید یک آرایه [] باشد.");
      
      setIsSeeding(true);
      const res = await RecipeService.seedFromExternalData(dishes);
      setMessage({ type: res.success ? 'success' : 'error', text: res.message });
      setManualJson('');
      await loadStats();
      setIsSeeding(false);
    } catch (e: any) {
      alert("خطا در خواندن JSON: " + e.message);
    }
  };

  const handleExportCSV = () => {
    const dishes = RecipeService.getRawDishes();
    if (dishes.length === 0) {
      alert("دیتابیس در حال حاضر خالی است.");
      return;
    }
    
    const headers = ["ID", "Name", "Category", "Description", "Nature_Type", "Nature_Label", "Mosleh", "Calories", "CookTime", "Difficulty", "Nationality", "Ingredients_List", "Recipe_Steps"];
    const rows = dishes.map(d => {
      const natureInfo = d.nature ? { type: d.nature, label: d.natureLabel, mosleh: d.mosleh } : getDishNature(d);
      return [
        d.id, d.name, d.category, (d.description || "").replace(/"/g, '""'), natureInfo.type, natureInfo.label, (natureInfo.mosleh || "").replace(/"/g, '""'),
        d.calories || estimateCalories(d), d.cookTime || estimateCookTime(d), d.difficulty || getDifficulty(d), d.nationality || "ir",
        (d.ingredients || []).map(ing => `${ing.item}:${ing.amount}:${ing.unit}`).join(' | '),
        (d.recipeSteps || []).map(step => step.replace(/"/g, '""')).join(' | ')
      ];
    });

    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    rows.forEach(r => { csvContent += r.map(v => `"${v}"`).join(",") + "\n"; });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Noosh_DB_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handlePurgeCloud = async () => {
    if (!confirm("هشدار جدی: تمام اطلاعات فایربیس پاک خواهد شد. ادامه می‌دهید؟")) return;
    setIsPurging(true);
    const res = await RecipeService.purgeCloudDatabase();
    setMessage({ type: res.success ? 'warning' : 'error', text: res.message });
    await loadStats();
    setIsPurging(false);
  };

  const toPersian = (n: number) => n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

  return (
    <div className="space-y-6 animate-enter">
      {message && (
        <div className={`p-4 rounded-2xl text-sm font-black flex items-center gap-3 animate-bounce ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
          message.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          <ShieldAlert size={20} />
          {message.text}
          <button onClick={() => setMessage(null)} className="mr-auto opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8 border-b border-slate-50 pb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shadow-inner"><Database size={36} /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">وضعیت بانک اطلاعاتی ابری</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Cloud Database Live Sync</p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={handleExportCSV} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">
              <FileSpreadsheet size={20} /> استخراج CSV
            </button>
            <button onClick={handlePurgeCloud} disabled={isPurging} className="px-4 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs border border-rose-100 hover:bg-rose-100 transition-all">
              {isPurging ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />} پاکسازی کامل ابر
            </button>
            <button onClick={loadStats} className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all">
               <RefreshCw size={24} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-center relative overflow-hidden group">
            <span className="text-slate-400 font-black text-[10px] block mb-2 uppercase tracking-tighter">دیتابیس داخلی (کد)</span>
            <span className="text-5xl font-black text-emerald-500 relative z-10">{toPersian(stats.local)}</span>
          </div>
          <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 text-center relative overflow-hidden group">
            <span className="text-amber-500 font-black text-[10px] block mb-2 uppercase tracking-tighter">ذخیره شده در کش</span>
            <span className="text-5xl font-black text-amber-700 relative z-10">{toPersian(stats.cache)}</span>
          </div>
          <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 text-center relative overflow-hidden group">
            <span className="text-indigo-400 font-black text-[10px] block mb-2 uppercase tracking-tighter">دیتابیس فایربیس</span>
            <span className="text-5xl font-black text-indigo-700 relative z-10">{toPersian(stats.cloud)}</span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-teal-500 rounded-2xl text-slate-950"><UploadCloud size={24}/></div>
               <div>
                  <h3 className="text-lg font-black">بارگذاری/بازیابی داده‌های ابری</h3>
                  <p className="text-xs text-slate-400 font-bold">Paste JSON from Converter below</p>
               </div>
            </div>
            
            <textarea 
              value={manualJson}
              onChange={(e) => setManualJson(e.target.value)}
              placeholder="کد JSON خروجی از بخش مبدل اکسل را اینجا پیست کنید..."
              className="w-full h-40 bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 font-mono text-xs text-emerald-400 outline-none focus:border-teal-500 transition-all mb-6"
              style={{ direction: 'ltr' }}
            />
            
            <button 
              onClick={handleManualSeed}
              disabled={isSeeding || !manualJson.trim()}
              className="w-full py-5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-teal-500/20"
            >
              {isSeeding ? <Loader2 className="animate-spin" size={24} /> : <Play size={24} />}
              انتقال مستقیم به فایربیس (Cloud Seed)
            </button>

            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4">
               <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
               <p className="text-[10px] text-slate-300 leading-relaxed font-bold">
                 از آنجا که دیتابیس داخلی اپلیکیشن را برای سبک‌تر شدن برنامه تخلیه کرده‌ایم، در اولین اجرا باید داده‌های استخراج شده از اکسل را از طریق کادر بالا در فایربیس بارگذاری کنید. پس از یک بار موفقیت، تمامی کاربران در سراسر دنیا داده‌ها را دریافت خواهند کرد.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
