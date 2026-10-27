import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GuestService } from '../../services/guestService';
import { markApplicationReady } from '../../utils/startup';

interface AuthGateProps {
  children: React.ReactNode;
}

/** This release keeps all personal data in this browser on this device. */
const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let mounted = true;
    void GuestService.restoreExistingLocalData().catch(() => {}).finally(() => {
      try { GuestService.start(); }
      catch { if (mounted) setStorageError(true); }
      finally { if (mounted) setReady(true); }
    });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (ready && storageError) markApplicationReady(); }, [ready, storageError]);

  if (storageError) return <main dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#f1f6f3] p-6"><section role="alert" className="max-w-md rounded-3xl bg-white p-7 text-right shadow-lg"><h1 className="text-xl font-black text-[#276556]">حافظهٔ مرورگر در دسترس نیست</h1><p className="mt-3 text-sm leading-7 text-slate-600">نوش‌اپ اطلاعات شما را روی همین دستگاه ذخیره می‌کند. اجازهٔ ذخیره‌سازی داده‌های سایت را در مرورگر فعال کنید یا فضای خالی دستگاه را بررسی کنید؛ سپس دوباره تلاش کنید.</p><button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-12 w-full rounded-xl bg-[#276556] px-5 font-bold text-white">تلاش دوباره</button></section></main>;

  if (!ready) {
    return (
      <div className="auth-screen min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-700" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
