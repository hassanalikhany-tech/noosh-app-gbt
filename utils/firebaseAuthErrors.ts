const messages: Record<string, string> = {
  'auth/invalid-phone-number': 'شماره معتبر نیست؛ کد کشور را هم وارد کنید، مثل ‎+1، ‎+44 یا شمارهٔ ایران با 09.',
  'auth/operation-not-allowed': 'ورود پیامکی در Firebase فعال نشده است. ارائه‌دهندهٔ Phone را در تنظیمات Authentication فعال کنید.',
  'auth/unauthorized-domain': 'دامنهٔ فعلی برای ورود پیامکی مجاز نیست. دامنهٔ Netlify یا دامنهٔ اصلی اپ را در Firebase → Authentication → Settings → Authorized domains اضافه کنید.',
  'auth/billing-not-enabled': 'برای ارسال پیامک واقعی، پروژهٔ Firebase باید به حساب صورتحساب Google Cloud متصل باشد.',
  'auth/too-many-requests': 'درخواست‌های این شماره یا دستگاه زیاد بوده است. کمی بعد دوباره تلاش کنید.',
  'auth/region-not-allowed': 'ارسال پیامک برای کشور این شماره در تنظیمات Firebase مجاز نشده است.',
  'auth/quota-exceeded': 'سهمیهٔ ارسال پیامک Firebase تمام شده است. وضعیت سهمیه و صورتحساب پروژه را بررسی کنید.',
  'auth/captcha-check-failed': 'تأیید امنیتی reCAPTCHA انجام نشد. صفحه را تازه کنید و دوباره درخواست کد بدهید.',
  'auth/invalid-app-credential': 'اعتبار reCAPTCHA تأیید نشد. دامنهٔ سایت را در Firebase بررسی کنید و صفحه را تازه کنید.',
  'auth/missing-app-credential': 'پاسخ امنیتی reCAPTCHA دریافت نشد. صفحه را تازه کنید و دوباره تلاش کنید.',
  'auth/network-request-failed': 'ارتباط با Firebase برقرار نشد. اینترنت، فیلترشکن و دسترسی مرورگر به سرویس‌های Google را بررسی کنید.',
  'auth/app-not-authorized': 'تنظیمات اپ وب برای Firebase مجاز نیست. شناسهٔ اپ و دامنه‌های مجاز را در تنظیمات پروژه بررسی کنید.',
  'auth/invalid-api-key': 'کلید Firebase این اپ معتبر نیست. تنظیمات اتصال Firebase باید بررسی شود.',
  'auth/invalid-verification-code': 'کد واردشده درست نیست. کد پیامک را دوباره بررسی کنید.',
  'auth/code-expired': 'کد منقضی شده است؛ یک کد تازه درخواست کنید.',
  'auth/session-expired': 'مهلت تأیید تمام شد؛ کد تازه درخواست کنید.',
  'auth/invalid-verification-id': 'درخواست تأیید معتبر نیست؛ کد تازه درخواست کنید.',
  'auth/argument-error': 'راه‌اندازی بررسی امنیتی ورود کامل نشد. صفحه را تازه کنید؛ اگر مشکل ماند، تنظیمات reCAPTCHA و دامنهٔ سایت باید بررسی شود.',
  'auth/internal-error': 'Firebase هنگام ورود خطای داخلی داد. چند دقیقه بعد دوباره تلاش کنید.',
};

const getCode = (error: unknown): string => {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  const code = String(error.code);
  return /^auth\/[a-z0-9-]+$/i.test(code) ? code : '';
};

export const getFirebaseAuthErrorMessage = (error: unknown): string => {
  const code = getCode(error);
  if (code && messages[code]) {
    if (code === 'auth/unauthorized-domain' && typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      return 'Firebase برای ورود پیامکی واقعی، localhost و 127.0.0.1 را به‌عنوان دامنهٔ میزبانی نمی‌پذیرد. نسخهٔ اپ را روی دامنهٔ مجاز Netlify یا دامنهٔ اصلی باز کنید؛ برای تست محلی فقط از شماره‌های آزمایشی Firebase استفاده کنید.';
    }
    return messages[code];
  }
  return code
    ? `Firebase درخواست ورود را نپذیرفت (کد: ${code}). دامنهٔ مجاز، reCAPTCHA، فعال بودن Phone و مجاز بودن کشور شماره را بررسی کنید.`
    : 'ارسال یا تأیید کد انجام نشد. اتصال اینترنت و تنظیمات ورود پیامکی Firebase را بررسی کنید.';
};

export const getFirebaseAuthErrorCode = (error: unknown): string => getCode(error) || 'unknown';
