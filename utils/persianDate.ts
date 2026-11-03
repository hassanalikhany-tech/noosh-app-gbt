const partsFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
});

const toAsciiDigits = (value: string) => value
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export interface PersianDateParts { year: number; month: number; day: number }

export const getPersianDateParts = (date: Date): PersianDateParts => {
  const parts = partsFormatter.formatToParts(date);
  return {
    year: Number(parts.find(part => part.type === 'year')?.value),
    month: Number(parts.find(part => part.type === 'month')?.value),
    day: Number(parts.find(part => part.type === 'day')?.value),
  };
};

export const formatGregorianDateAsPersian = (isoDate?: string) => {
  if (!isoDate) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return '';
  const [, year, month, day] = match;
  const parts = getPersianDateParts(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
  if (![parts.year, parts.month, parts.day].every(Number.isFinite)) return '';
  return [parts.year, parts.month, parts.day].map(value => value.toLocaleString('fa-IR')).join('/');
};

const jalaliToIso = (year: number, month: number, day: number): string | undefined => {
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) return undefined;
  // Scan the corresponding Gregorian year. Intl's Persian calendar is the source
  // of truth, avoiding a second, hand-maintained leap-year implementation.
  const start = Date.UTC(year + 621, 0, 1);
  for (let offset = 0; offset <= 430; offset += 1) {
    const candidate = new Date(start + offset * 86_400_000);
    const parts = getPersianDateParts(candidate);
    if (parts.year === year && parts.month === month && parts.day === day) return candidate.toISOString().slice(0, 10);
  }
  return undefined;
};

export const parsePersianDate = (input: string): string | undefined => {
  const normalized = toAsciiDigits(input.trim());
  const match = /^(\d{1,4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})$/.exec(normalized);
  if (!match) return undefined;
  return jalaliToIso(Number(match[1]), Number(match[2]), Number(match[3]));
};

export const getPersianMonthDays = (year: number, month: number): Array<{ day: number; isoDate: string }> => {
  if (!Number.isInteger(year) || month < 1 || month > 12) return [];
  const start = Date.UTC(year + 621, 0, 1);
  let firstDay: Date | undefined;
  for (let offset = 0; offset <= 430; offset += 1) {
    const candidate = new Date(start + offset * 86_400_000);
    const parts = getPersianDateParts(candidate);
    if (parts.year === year && parts.month === month && parts.day === 1) { firstDay = candidate; break; }
  }
  if (!firstDay) return [];
  const days: Array<{ day: number; isoDate: string }> = [];
  for (let day = 1; day <= 31; day += 1) {
    const candidate = new Date(firstDay.getTime() + (day - 1) * 86_400_000);
    const parts = getPersianDateParts(candidate);
    if (parts.year !== year || parts.month !== month) break;
    days.push({ day, isoDate: candidate.toISOString().slice(0, 10) });
  }
  return days;
};

export const getPersianMonthTitle = (year: number, month: number) => {
  const first = getPersianMonthDays(year, month)[0];
  if (!first) return `${year}/${month}`;
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${first.isoDate}T00:00:00Z`));
};
