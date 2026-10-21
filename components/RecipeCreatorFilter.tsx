import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Users, X } from 'lucide-react';
import { creatorKey } from '../utils/recipeCreators';

interface Props {
  creators: { key: string; name: string; count: number }[];
  value: string;
  onChange: (key: string) => void;
}

export default function RecipeCreatorFilter({ creators, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const selected = creators.find(creator => creator.key === value);
  const choices = creators.filter(creator => creatorKey(creator.name).includes(creatorKey(query)));
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const choose = (key: string) => { onChange(key); setOpen(false); setQuery(''); trigger.current?.focus(); };
  return <div ref={root} className="relative min-w-0 sm:w-72" onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <div className="flex items-center gap-2"><button ref={trigger} type="button" aria-expanded={open} aria-controls="recipe-creator-menu" onClick={() => { setOpen(!open); setQuery(''); }} className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-right text-sm font-bold ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#276556] ${selected ? 'bg-[#276556] text-white ring-[#276556]' : 'bg-white text-[#276556] ring-[#276556]/20 hover:bg-[#edf4f0]'}`}>
      <Users size={18} className="shrink-0"/><span className="min-w-0 flex-1 truncate">{selected ? `رسپی‌های ${selected.name}` : 'سازندهٔ رسپی: همه'}</span><ChevronDown size={16} className={`shrink-0 transition ${open ? 'rotate-180' : ''}`}/>
    </button>{selected && <button type="button" onClick={() => choose('all')} aria-label="برداشتن فیلتر سازنده" title="برداشتن فیلتر سازنده" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#edf4f0] text-[#276556] hover:bg-[#dcebe3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#276556]"><X size={17}/></button>}</div>
    {open && <div id="recipe-creator-menu" role="region" aria-label="انتخاب سازندهٔ رسپی" className="absolute inset-x-0 top-full z-[950] mt-2 overflow-hidden rounded-2xl bg-white text-slate-800 shadow-xl ring-1 ring-[#276556]/15">
      <div className="relative m-3"><Search size={16} className="pointer-events-none absolute right-3 top-3 text-[#276556]"/><input ref={input} aria-label="جستجوی نام سازنده" value={query} onChange={event => setQuery(event.target.value)} placeholder="نام سازنده را پیدا کن…" className="min-h-11 w-full rounded-xl border-0 bg-[#edf4f0] pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-[#276556]/40"/></div>
      <div className="max-h-60 overflow-y-auto overscroll-contain px-2 pb-2">
        <button type="button" onClick={() => choose('all')} className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-bold hover:bg-[#edf4f0] focus-visible:bg-[#edf4f0]">همهٔ سازندگان{value === 'all' && <Check size={16}/>}</button>
        {choices.map(creator => <button type="button" key={creator.key} aria-pressed={value === creator.key} onClick={() => choose(creator.key)} className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-right text-sm hover:bg-[#edf4f0] focus-visible:bg-[#edf4f0] ${value === creator.key ? 'bg-[#edf4f0] font-black text-[#276556]' : ''}`}><span className="min-w-0 flex-1 break-words">{creator.name}</span><span className="shrink-0 text-xs text-slate-500">{creator.count.toLocaleString('fa-IR')} رسپی</span>{value === creator.key && <Check size={16} className="shrink-0"/>}</button>)}
        {!choices.length && <p className="px-3 py-4 text-sm leading-6 text-slate-500">{creators.length ? 'سازنده‌ای با این نام پیدا نشد.' : 'پس از انتشار رسپی کاربران، نام سازنده اینجا دیده می‌شود.'}</p>}
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-[11px] leading-5 text-slate-500">نام‌ها را سازندگان ثبت کرده‌اند؛ نام یکسان در یک گروه نمایش داده می‌شود.</p>
    </div>}
  </div>;
}
