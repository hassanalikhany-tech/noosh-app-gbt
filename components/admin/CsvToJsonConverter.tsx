
import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Copy, Check, Upload, Clock, AlertCircle, FileType, Loader2, Database, Table } from 'lucide-react';
import { Dish, Ingredient } from '../../types';
import * as XLSX from 'xlsx';

const CsvToJsonConverter: React.FC = () => {
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [standardTime, setStandardTime] = useState<number>(60);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonOutput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  /**
   * تبدیل پیشرفته متن زمان به دقیقه
   */
  const parseDurationToMinutes = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    const str = String(val).toLowerCase().trim();
    if (!str) return null;
    
    // تبدیل اعداد فارسی/عربی به انگلیسی
    const normalized = str
      .replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString())
      .replace(/[۰-۹]/g, d => (d.charCodeAt(0) - 1776).toString())
      .replace(/یک/g, '1').replace(/دو/g, '2').replace(/سه/g, '3')
      .replace(/چهار/g, '4').replace(/پنج/g, '5').replace(/نیم/g, '0.5')
      .replace(/و/g, ' ');

    let totalMinutes = 0;
    let found = false;

    // استخراج ساعت (ساعت، hour, hr, h)
    const hrRegex = /(\d+(\.\d+)?)\s*(ساعت|hour|hr|h)/g;
    let hrMatch;
    while ((hrMatch = hrRegex.exec(normalized)) !== null) {
      totalMinutes += parseFloat(hrMatch[1]) * 60;
      found = true;
    }

    // استخراج دقیقه (دقیقهRegex)
    const minRegex = /(\d+)\s*(دقیقه|minute|min|m)/g;
    let minMatch;
    while ((minMatch = minRegex.exec(normalized)) !== null) {
      totalMinutes += parseInt(minMatch[1]);
      found = true;
    }

    // اگر فقط عدد بود بدون واحد
    if (!found) {
      const pureNumber = normalized.match(/^(\d+(\.\d+)?)$/);
      if (pureNumber) {
        const val = parseFloat(pureNumber[1]);
        // اگر عدد کوچک بود احتمالا ساعت است (مثلا 1.5) اگر بزرگ بود دقیقه (مثلا 45)
        return val < 5 ? val * 60 : val;
      }
      return null;
    }

    return Math.round(totalMinutes);
  };

  const processFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    setDetectedColumns([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) throw new Error("فایل اکسل خالی است.");

        const headers = Object.keys(jsonData[0] as object);
        setDetectedColumns(headers);

        const result = jsonData.map((row: any, idx: number) => {
          // استخراج تمام ستون‌ها به صورت پویا
          const entry: any = { ...row };

          // پیدا کردن فیلدهای اصلی با نگاشت منعطف
          const findKey = (keys: string[]) => 
            headers.find(h => keys.some(k => h.toLowerCase().includes(k.toLowerCase())));

          const nameKey = findKey(['name', 'نام', 'عنوان', 'title']);
          const catKey = findKey(['category', 'دسته', 'group', 'نوع']);
          const descKey = findKey(['description', 'توضیح', 'خلاصه']);
          const ingKey = findKey(['ingredient', 'مواد', 'ترکیبات']);
          const stepKey = findKey(['step', 'مرحله', 'دستور']);
          const timeKey = findKey(['time', 'زمان', 'cook', 'duration']);
          const calKey = findKey(['cal', 'کالری', 'energy']);
          const natureKey = findKey(['nature_type', 'طبع']);
          const moslehKey = findKey(['mosleh', 'مصلح']);

          // مقداردهی ساختار استاندارد در کنار سایر ستون‌ها
          entry.name = entry[nameKey || ''] || "بدون نام";
          entry.category = entry[catKey || ''] || "khorak";
          entry.description = entry[descKey || ''] || "";
          entry.id = entry.id || entry['شناسه'] || `dish-${idx}-${Date.now()}`;
          
          // پردازش مواد اولیه
          const rawIngs = entry[ingKey || ''];
          entry.ingredients = typeof rawIngs === 'string' ? rawIngs.split('|').map(i => {
            const [item, amount, unit] = i.split(':');
            return { item: item?.trim(), amount: parseFloat(amount) || 0, unit: unit?.trim() || 'واحد' };
          }).filter(i => i.item) : [];

          // پردازش مراحل
          const rawSteps = entry[stepKey || ''];
          entry.recipeSteps = typeof rawSteps === 'string' ? rawSteps.split('|').map(s => s.trim()).filter(s => s) : [];

          // پردازش هوشمند زمان
          const rawTime = entry[timeKey || ''];
          entry.cookTime = parseDurationToMinutes(rawTime) || standardTime;

          entry.calories = parseInt(entry[calKey || '']) || 400;
          entry.nature = entry[natureKey || ''] || "balanced";
          entry.mosleh = entry[moslehKey || ''] || "نیاز ندارد";
          entry.hasRealData = true;

          return entry;
        });

        setJsonOutput(JSON.stringify(result, null, 2));
        setIsProcessing(false);
      } catch (err: any) {
        setError("خطا در پردازش: " + err.message);
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-50 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shadow-inner"><FileSpreadsheet size={32} /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">مبدل اکسل همه‌جانبه</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Universal Excel to JSON Engine</p>
            </div>
          </div>
          <div className="flex gap-2">
             <div className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 flex items-center gap-2">
                <Database size={14} /> استخراج تمام ستون‌ها فعال است
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
             <label className="text-sm font-black text-slate-700 flex items-center gap-2">
               <Clock size={18} className="text-emerald-500" /> ۱. زمان پخت پیش‌فرض (اگر در فایل نبود)
             </label>
             <div className="flex items-center gap-3">
               <input 
                 type="number" 
                 value={standardTime} 
                 onChange={(e) => setStandardTime(parseInt(e.target.value) || 0)}
                 className="flex-grow px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-black text-slate-800 transition-all"
               />
               <span className="text-xs font-black text-slate-400">دقیقه</span>
             </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-black text-slate-700 flex items-center gap-2">
              <Upload size={18} className="text-emerald-500" /> ۲. بارگذاری فایل اکسل شما
            </label>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/50 text-emerald-700 font-black hover:bg-emerald-100/50 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <FileType size={20} />} 
              {isProcessing ? 'در حال تحلیل تمام ستون‌ها...' : 'انتخاب فایل (XLSX, XLS)'}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx, .xls" className="hidden" onChange={processFile} />
          </div>
        </div>

        {detectedColumns.length > 0 && (
          <div className="mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 animate-enter">
             <h4 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-tighter">
               <Table size={14} /> ستون‌های شناسایی شده در فایل شما:
             </h4>
             <div className="flex flex-wrap gap-2">
               {detectedColumns.map(col => (
                 <span key={col} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm">
                   {col}
                 </span>
               ))}
             </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-black flex items-center gap-2 animate-bounce">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {jsonOutput && (
          <div className="space-y-4 animate-enter">
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-t-3xl border-b border-white/10">
               <h3 className="font-black text-emerald-400 text-sm flex items-center gap-2">
                 <Check size={18} /> خروجی کامل JSON (تمامی ستون‌ها استخراج شد)
               </h3>
               <button 
                 onClick={handleCopy}
                 className={`px-5 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900 hover:bg-emerald-50'}`}
               >
                 {isCopied ? <Check size={16} /> : <Copy size={16} />}
                 {isCopied ? 'کپی شد' : 'کپی کل دیتابیس'}
               </button>
            </div>
            <div className="relative group">
               <textarea 
                 readOnly 
                 value={jsonOutput}
                 className="w-full h-[500px] p-6 bg-slate-950 text-emerald-500 font-mono text-[11px] rounded-b-3xl overflow-y-auto ltr shadow-2xl border border-slate-800 scrollbar-dark"
                 style={{ direction: 'ltr' }}
               />
               <div className="absolute bottom-4 right-6 text-[10px] font-black text-white/10 uppercase tracking-widest pointer-events-none">
                 Full Column Extraction Mode
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] space-y-3">
          <h4 className="font-black text-amber-800 flex items-center gap-2"><Clock size={18}/> هوش مصنوعی زمان پخت</h4>
          <p className="text-[11px] text-amber-700 leading-relaxed font-bold">
            سیستم عبارات پیچیده مانند «۱ ساعت و ۲۰ دقیقه»، «۹۰ دقیقه»، «1.5h» را می‌فهمد و به عدد خالص تبدیل می‌کند. اگر فقط عدد باشد، هوشمندانه ساعت یا دقیقه بودن آن را حدس می‌زند.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] space-y-3">
          <h4 className="font-black text-blue-800 flex items-center gap-2"><Database size={18}/> استخراج ستون‌های اضافی</h4>
          <p className="text-[11px] text-blue-700 leading-relaxed font-bold">
            اگر ستون‌های دیگری مانند «فصل»، «نام سرآشپز» یا هر داده دیگری در اکسل دارید، نگران نباشید! این مبدل تمام آن‌ها را حفظ کرده و در JSON خروجی قرار می‌دهد.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CsvToJsonConverter;
