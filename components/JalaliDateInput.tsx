import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatGregorianDateAsPersian, getPersianDateParts, getPersianMonthDays, getPersianMonthTitle, getTodayIsoDate, parsePersianDate } from '../utils/persianDate';

interface JalaliDateInputProps {
  value?: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const toPersianDigits = (value: number) => value.toLocaleString('fa-IR');

const JalaliDateInput: React.FC<JalaliDateInputProps> = ({ value = '', onChange, disabled = false, className = '', ariaLabel = 'تاریخ شمسی' }) => {
  const todayIso = getTodayIsoDate();
  const [draft, setDraft] = useState(() => formatGregorianDateAsPersian(value));
  const [dateError, setDateError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const selected = value ? parsePersianDate(formatGregorianDateAsPersian(value)) : undefined;
    const parts = getPersianDateParts(new Date(`${selected || getTodayIsoDate()}T00:00:00Z`));
    return { year: parts.year, month: parts.month };
  });
  const [rect, setRect] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const monthDays = useMemo(() => getPersianMonthDays(monthCursor.year, monthCursor.month), [monthCursor.year, monthCursor.month]);
  const monthTitle = useMemo(() => getPersianMonthTitle(monthCursor.year, monthCursor.month), [monthCursor.year, monthCursor.month]);
  const leadingBlanks = monthDays[0] ? (new Date(`${monthDays[0].isoDate}T00:00:00Z`).getUTCDay() + 1) % 7 : 0;
  const calendarCells = [...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `blank-${index}`, blank: true as const })), ...monthDays.map(entry => ({ key: entry.isoDate, blank: false as const, ...entry }))];

  useEffect(() => { setDraft(formatGregorianDateAsPersian(value)); }, [value]);

  const refreshPosition = () => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = 304;
    const left = Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12));
    const top = bounds.bottom + 8 + 310 < window.innerHeight ? bounds.bottom + 8 : Math.max(12, bounds.top - 318);
    setRect({ left, top });
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshPosition();
    const onOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node) || popupRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    window.addEventListener('resize', refreshPosition);
    window.addEventListener('scroll', refreshPosition, true);
    document.addEventListener('pointerdown', onOutsidePointer);
    return () => {
      window.removeEventListener('resize', refreshPosition);
      window.removeEventListener('scroll', refreshPosition, true);
      document.removeEventListener('pointerdown', onOutsidePointer);
    };
  }, [isOpen]);

  const openCalendar = () => {
    if (value) {
      const parts = getPersianDateParts(new Date(`${value}T00:00:00Z`));
      setMonthCursor({ year: parts.year, month: parts.month });
    }
    setIsOpen(true);
    requestAnimationFrame(refreshPosition);
  };

  const moveMonth = (delta: number) => setMonthCursor(current => {
    const total = current.year * 12 + current.month - 1 + delta;
    return { year: Math.floor(total / 12), month: total % 12 + 1 };
  });

  const selectDate = (isoDate: string) => {
    if (isoDate && isoDate < todayIso) {
      setDateError('تاریخ انقضا نمی‌تواند قبل از امروز باشد.');
      return;
    }
    setDateError('');
    onChange(isoDate);
    setDraft(formatGregorianDateAsPersian(isoDate));
    setIsOpen(false);
  };

  return <div ref={rootRef} className="flex min-w-0 flex-col gap-1">
    <div className="flex min-w-0 items-center gap-1.5">
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={draft}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder="۱۴۰۵/۰۸/۱۱"
      onChange={event => {
        const next = event.target.value;
        setDraft(next);
        if (!next.trim()) { setDateError(''); onChange(''); }
        else {
          const parsed = parsePersianDate(next);
          if (parsed && parsed < todayIso) setDateError('تاریخ انقضا نمی‌تواند قبل از امروز باشد.');
          else if (parsed) { setDateError(''); onChange(parsed); }
        }
      }}
      onKeyDown={event => { if (event.key === 'Escape') setIsOpen(false); if (event.key === 'ArrowDown') openCalendar(); }}
      className={`min-w-0 flex-1 ${className}`}
    />
    <button type="button" disabled={disabled} onClick={openCalendar} aria-label="بازکردن تقویم شمسی" title="انتخاب از تقویم شمسی" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#276556] transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><CalendarDays size={17}/></button>
    </div>
    {dateError && <small role="alert" className="text-right text-[10px] font-bold text-rose-700">{dateError}</small>}
    {isOpen && rect && createPortal(<div ref={popupRef} dir="rtl" className="fixed z-[13000] w-[304px] rounded-2xl border border-emerald-100 bg-white p-3 shadow-2xl" style={{ left: rect.left, top: rect.top }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => moveMonth(1)} aria-label="ماه بعد" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-[#276556]"><ChevronRight size={18}/></button>
        <strong className="text-sm font-black text-slate-800">{monthTitle}</strong>
        <button type="button" onClick={() => moveMonth(-1)} aria-label="ماه قبل" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-[#276556]"><ChevronLeft size={18}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-500">{weekDays.map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-1 text-center">{calendarCells.map(cell => cell.blank ? <span key={cell.key} /> : <button key={cell.key} type="button" disabled={cell.isoDate < todayIso} onClick={() => selectDate(cell.isoDate)} aria-pressed={value === cell.isoDate} aria-current={cell.isoDate === todayIso ? 'date' : undefined} title={cell.isoDate === todayIso ? 'امروز' : cell.isoDate < todayIso ? 'تاریخ گذشته قابل انتخاب نیست' : undefined} className={`h-9 rounded-lg text-xs font-bold transition disabled:cursor-not-allowed disabled:text-slate-300 disabled:line-through ${value === cell.isoDate ? 'bg-[#276556] text-white shadow-sm' : cell.isoDate === todayIso ? 'bg-amber-50 text-amber-900 ring-2 ring-amber-400' : 'text-slate-700 hover:bg-emerald-50 hover:text-[#276556]'}`}>{toPersianDigits(cell.day)}</button>)}</div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-[10px] font-bold text-amber-800">امروز: {formatGregorianDateAsPersian(todayIso)}</span>
        <button type="button" onClick={() => selectDate('')} className="rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50">پاک‌کردن</button>
      </div>
    </div>, document.body)}
  </div>;
};

export default JalaliDateInput;
