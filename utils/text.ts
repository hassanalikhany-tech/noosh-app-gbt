export const normalizePersian = (value: string) => value
  .normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
  .replace(/[\u064B-\u065F\u0670]/g, '').replace(/[\s\u200c]+/g, ' ').trim().toLowerCase();

export const englishDigits = (value: string) => value.replace(/[۰-۹٠-٩]/g, digit =>
  String('۰۱۲۳۴۵۶۷۸۹'.includes(digit) ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
