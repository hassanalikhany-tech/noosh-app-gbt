
import React, { useRef } from 'react';
import { Download, Upload, Save, RefreshCw, AlertTriangle } from 'lucide-react';

const BACKUP_KEYS = [
  'global_hidden_dish_ids_v1',
  'renamed_dishes_map_v1',
  'pmp_users_db_v2',
  'pmp_current_username_v2'
];

const BackupManager: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const backupData: Record<string, any> = {};
    BACKUP_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) {
        try {
            backupData[key] = JSON.parse(val);
        } catch {
            backupData[key] = val;
        }
      }
    });
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noosh_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        if (!jsonContent) throw new Error("File is empty");

        const data = JSON.parse(jsonContent);
        
        Object.keys(data).forEach(key => {
           if (BACKUP_KEYS.includes(key)) {
             const val = data[key];
             // Crucial Fix: Don't stringify if it's already a primitive string (like username)
             // unless it was stored as a JSON string.
             if (typeof val === 'object') {
               localStorage.setItem(key, JSON.stringify(val));
             } else {
               localStorage.setItem(key, String(val));
             }
           }
        });
        
        // Brief delay to ensure storage commit before reload
        setTimeout(() => {
            alert('بازنشانی اطلاعات با موفقیت انجام شد. صفحه رفرش می‌شود.');
            window.location.reload();
        }, 100);

      } catch (err) {
        console.error(err);
        alert('خطا در خواندن فایل پشتیبان. مطمئن شوید فایل JSON صحیح را انتخاب کرده‌اید.');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-enter">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Save size={24} className="text-blue-600" />
        پشتیبان‌گیری و بازنشانی
      </h2>
      <p className="text-slate-500 mb-6 leading-relaxed">
        از آنجایی که تغییرات شما در حافظه مرورگر ذخیره می‌شود، ممکن است با پاک شدن کش مرورگر از بین برود.
        <br/>
        با استفاده از دکمه‌های زیر، می‌توانید یک فایل پشتیبان تهیه کنید و هر زمان که اطلاعات پرید، آن را بازیابی کنید.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-blue-100 bg-blue-50 rounded-2xl p-6 flex flex-col items-center text-center hover:bg-blue-100 transition-colors">
           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-blue-500">
             <Download size={32} />
           </div>
           <h3 className="font-bold text-lg mb-2 text-blue-900">دانلود فایل پشتیبان</h3>
           <p className="text-sm text-blue-700 mb-6 opacity-80">
             یک فایل حاوی تمام تغییرات، لیست‌های حذف شده و کاربران را دانلود و در دستگاه خود ذخیره کنید.
           </p>
           <button onClick={handleBackup} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors w-full shadow-lg shadow-blue-200 active:scale-95">
             دریافت فایل Backup
           </button>
        </div>

        <div className="border-2 border-emerald-100 bg-emerald-50 rounded-2xl p-6 flex flex-col items-center text-center hover:bg-emerald-100 transition-colors">
           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-emerald-500">
             <Upload size={32} />
           </div>
           <h3 className="font-bold text-lg mb-2 text-emerald-900">بازگرداندن اطلاعات</h3>
           <p className="text-sm text-emerald-700 mb-6 opacity-80">
             اگر اطلاعاتتان پاک شده است، فایل پشتیبان را انتخاب کنید تا همه چیز به حالت قبل برگردد.
           </p>
           <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors w-full shadow-lg shadow-emerald-200 active:scale-95">
             انتخاب فایل Backup و بازنشانی
           </button>
           <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertTriangle className="text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800 leading-relaxed">
          <strong>نکته مهم:</strong> اگر بعد از بازگرداندن فایل، برنامه دچار مشکل شد (صفحه سفید)، احتمالا فایل پشتیبان قدیمی یا ناقص بوده است. در این صورت کش مرورگر را پاک کنید تا به حالت اولیه برگردد.
        </p>
      </div>
    </div>
  );
};

export default BackupManager;
