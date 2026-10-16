# راه‌اندازی انتشار خودکار پنل مدیریت

تغییرهای پنل با یک تابع امن Netlify به فایل `data/recipes_overrides.json` در شاخهٔ `main` مخزن `hassanalikhany-tech/noosh-app-gbt` ثبت می‌شوند. انتشار Netlify پس از هر commit آغاز می‌شود. توکن GitHub هرگز به مرورگر ارسال نمی‌شود.

در Netlify، پروژهٔ `noosh-app-gbt` را باز کن و به **Project configuration → Environment variables** برو. سه متغیر زیر را برای **Production** اضافه کن:

- `GITHUB_TOKEN`: یک Fine-grained personal access token از GitHub با دسترسی فقط به مخزن `noosh-app-gbt` و مجوز **Contents: Read and write**. این مقدار را فقط در Netlify وارد کن.
- `ADMIN_PASSWORD`: رمز تازه و یکتای مدیر، دست‌کم ۱۶ نویسه. آن را در پیام یا داخل سورس کد قرار نده.
- `ADMIN_SESSION_SECRET`: رشتهٔ تصادفی دست‌کم ۳۲ بایتی. در PowerShell می‌توانی بسازی‌اش: `[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))`

پس از ذخیرهٔ متغیرها، از Deploys یک بار **Trigger deploy** بزن. سپس `/admin` را باز کن، با `ADMIN_PASSWORD` وارد شو و یک ویرایش آزمایشی انجام بده. پنل پس از commit، شناسهٔ commit را نشان می‌دهد. پیش از تنظیم این سه متغیر، پنل عمداً اجازهٔ ورود و ادعای انتشار موفق نمی‌دهد.

اگر نام مالک، مخزن یا شاخه در آینده عوض شد، این متغیرهای اختیاری را هم تنظیم کن: `GITHUB_OWNER`، `GITHUB_REPO` و `GITHUB_BRANCH`.
