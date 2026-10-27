import React from 'react';

export default class ApplicationErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  declare props: React.PropsWithChildren;
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    console.error('Noosh screen could not be displayed:', error.name);
    document.getElementById('noosh-startup')?.remove();
    document.documentElement.classList.remove('noosh-starting');
    const root = document.getElementById('root');
    root?.removeAttribute('inert');
    root?.removeAttribute('aria-hidden');
    document.body.style.overflow = '';
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[#f1f6f3] p-6 text-right">
      <section role="alert" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-lg ring-1 ring-[#276556]/15">
        <img src="/brand/noosh-logo.png" alt="نوش‌اپ" className="mx-auto mb-6 h-20 w-20" />
        <h1 className="text-xl font-black text-[#276556]">نمایش این صفحه کامل نشد</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">دوباره تلاش کنید. بارگذاری مجدد، تنظیمات و رسپی‌های ذخیره‌شدهٔ شما را پاک نمی‌کند.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-12 w-full rounded-xl bg-[#276556] px-5 font-bold text-white">بارگذاری مجدد</button>
      </section>
    </main>;
  }
}
