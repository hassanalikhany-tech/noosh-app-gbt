import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChefHat, Clock3, Heart, Leaf, Loader2, Printer, ShoppingBag, Sparkles, Undo2, Zap, ReceiptText } from 'lucide-react';
import { DayPlan, UserProfile } from '../types';
import MealCard from './MealCard';
import { estimateRecipeCost } from '../utils/recipeCosts';

type Period = 'daily' | 'weekly' | 'monthly';
type Filter = 'meatlessMode' | 'onlyFavoritesMode' | 'quickMealsMode';
interface Props {
  user: UserProfile; plan: DayPlan[]; loading: Period | null; error: string; canUndo: boolean;
  onGenerate: (period: Period) => void; onToggleFilter: (filter: Filter) => void;
  onRefresh: (index: number) => Promise<void>; onUpdateUser: (user: UserProfile) => void;
  onShopping: () => void; shoppingLoading: boolean; onUndo: () => Promise<void>;
  onNavigate: (view: 'pantry' | 'search' | 'settings') => void; onSearch: (term: string) => void;
  onOpenInventory: () => void;
}
const fa = (n: number) => n.toLocaleString('fa-IR');
const filters = [
  { key: 'meatlessMode' as const, label: 'گیاهی', icon: Leaf },
  { key: 'quickMealsMode' as const, label: 'پخت سریع', icon: Zap },
  { key: 'onlyFavoritesMode' as const, label: 'علاقه‌مندی‌ها', icon: Heart },
];
export default function PlanDashboard(props: Props) {
  const { user, plan, loading } = props;
  const [period, setPeriod] = useState<Period>('weekly');
  const [query, setQuery] = useState('');
  const [undoing, setUndoing] = useState(false);
  const [undoError, setUndoError] = useState('');
  const [foodPhotoSrc, setFoodPhotoSrc] = useState('/hero-chelo-kabab-barg.png');
  const times = plan.map(p => p.dish.cookTime).filter((time): time is number => typeof time === 'number' && time > 0);
  const planCost = plan.flatMap(item => [item.dish, ...(item.sideDish ? [item.sideDish] : [])])
    .map(dish => estimateRecipeCost(dish, user.familySize || 4, user.inventory || []))
    .reduce((total, estimate) => ({
      pricedSubtotal: total.pricedSubtotal + estimate.pricedSubtotal,
      pricedRows: total.pricedRows + estimate.pricedRows,
      eligibleRows: total.eligibleRows + estimate.eligibleRows,
      missingIngredients: [...total.missingIngredients, ...estimate.missingIngredients],
      approximate: total.approximate || estimate.approximate,
    }), { pricedSubtotal: 0, pricedRows: 0, eligibleRows: 0, missingIngredients: [] as string[], approximate: false });
  return <div className={`plan-dashboard${plan.length ? ' has-plan' : ''}`}>
    <div className="dashboard-inner">
      <section className="planner-hero planner-hero-with-controls" aria-labelledby="planner-title">
        <div className="planner-hero-title-row"><div><span className="planner-hero-eyebrow">کمتر فکر کن، متنوع‌تر بپز</span><h2 id="planner-title">برنامهٔ غذایی من</h2></div>
          {plan.length > 0 && <button className="planner-hero-print" onClick={() => window.print()}><Printer size={16} /><span>چاپ</span></button>}
        </div>
        <div className="planner-hero-main"><div className="planner-hero-copy"><span className="planner-hero-kicker"><CalendarDays size={16} /> برنامه‌ریز سفرهٔ تو</span>
          <p>{user.kitchenMode === 'without-inventory' ? 'غذاها را مستقل از انبار، با فیلتر گیاهی، علاقه‌مندی‌ها و مواد کنارگذاشته‌شده در تنظیماتت برنامه‌ریزی کن.' : user.inventory?.length ? 'در برنامهٔ غذایی، اولویت با غذاهایی است که موادشان در خانه موجود باشد؛ سلیقه، علاقه‌مندی‌ها و حساسیت‌ها به مواد هم مطابق شخصی‌سازی‌ها در نظر گرفته می‌شوند.' : 'برای پیشنهاد دقیق با مواد خانه، چند قلم به انبار اضافه کن؛ تا آن زمان هم می‌توانی آزادانه برنامه غذایی بچینی.'} {user.kitchenMode === 'without-inventory' ? 'لیست خرید مقدار کامل دستورها را می‌آورد و چیزی از انبار کم نمی‌کند.' : 'فهرست خرید هم فقط مقدار موردنیازِ مواد را پس از کسر موجودی انبار نشان می‌دهد.'}</p>
          <div className="planner-hero-steps"><span><i>۱</i> انتخاب بازه</span><b /><span><i>۲</i> چیدن غذاها</span><b /><span><i>۳</i> فهرست خرید</span></div>
        </div>
        <figure className="planner-hero-food-photo">
          {foodPhotoSrc ? <img src={foodPhotoSrc} alt="چلوکباب برگ ایرانی با برنج زعفرانی و گوجه کبابی" loading="eager" fetchPriority="high" onError={() => setFoodPhotoSrc(current => current === '/hero-chelo-kabab-barg.png' ? '/hero-zereshk-polo.png' : '')} /> : <div className="planner-hero-image-fallback" role="img" aria-label="تصویر غذا در دسترس نیست"><ChefHat size={36} aria-hidden="true" /></div>}
        </figure>
        </div>
        <div className="planner-controls planner-hero-controls"><div className="period-switch" aria-label="بازه برنامه">
          {([{ id: 'daily', label: 'امروز' }, { id: 'weekly', label: 'یک هفته' }, { id: 'monthly', label: '۳۰ روز' }] as const).map(item => <button key={item.id} aria-pressed={period === item.id} onClick={() => setPeriod(item.id)} className={period === item.id ? 'selected noosh-cta-3d' : ''}>{item.label}</button>)}
        </div><div className="diet-filters">{filters.map(({ key, label, icon: Icon }) => <button key={key} aria-pressed={!!user[key]} className={user[key] ? 'active noosh-cta-3d' : ''} onClick={() => props.onToggleFilter(key)}><Icon size={16} />{label}</button>)}</div>
          <button className="generate-button noosh-cta-3d" disabled={!!loading} onClick={() => props.onGenerate(period)}>{loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}{loading ? 'در حال چیدن برنامه…' : plan.length ? 'برنامهٔ تازه بچین' : 'برنامه‌ام را بچین'}</button>
        </div>
      </section>
      <section className="planner-panel" aria-label="نتایج برنامه غذایی">
        {props.canUndo && <div className="plan-tools planner-panel-tools">
          <button disabled={undoing || !!loading} onClick={async () => { setUndoing(true); setUndoError(''); try { await props.onUndo(); } catch { setUndoError('بازگرداندن برنامه انجام نشد. دوباره تلاش کنید.'); } finally { setUndoing(false); } }}><Undo2 size={17} /> برنامهٔ قبلی</button>
        </div>}
        {(props.error || undoError) && <div className="plan-error" role="alert">{props.error || undoError} فیلترها را تغییر دهید یا دوباره تلاش کنید.</div>}
        {loading && plan.length > 0 && <div role="status" aria-live="polite" className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-[#f3f8f3] px-4 py-3 text-right text-[#276556]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#d7b45a] shadow-sm"><Loader2 size={20} className="animate-spin" /></span><span><strong className="block text-sm font-black">داریم برنامهٔ تازه‌ات را آماده می‌کنیم</strong><small className="mt-1 block text-xs leading-5 text-slate-600">غذاها را با بازه و شخصی‌سازی‌هایت بررسی می‌کنیم؛ ممکن است چند لحظه طول بکشد.</small></span></div>}
        {plan.length > 0 ? <>
          <div className="plan-summary" aria-live="polite"><span><CalendarDays size={16} />{fa(plan.length)} پیشنهاد برای سفرهٔ تو</span>{times.length > 0 && <span><Clock3 size={16} />میانگین زمان پخت: {fa(Math.round(times.reduce((sum, time) => sum + time, 0) / times.length))} دقیقه</span>}</div>
          {(planCost.pricedRows > 0 || planCost.eligibleRows > 0) && <section className="my-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="برآورد هزینهٔ برنامه">
            <div className="min-w-0">{planCost.pricedRows > 0 ? <><p className="flex items-center gap-2 font-black text-amber-950"><ReceiptText size={17} />برآورد هزینهٔ مواد قیمت‌گذاری‌شده: حدود {fa(Math.round(planCost.pricedSubtotal))} تومان</p><p className="mt-1 text-xs font-bold leading-5 text-amber-900">{fa(planCost.pricedRows)} از {fa(planCost.eligibleRows)} قلم محاسبه شده{planCost.approximate ? '؛ بخشی از تبدیل‌ها تقریبی است.' : '.'} این مبلغ هزینهٔ کامل برنامه را تضمین نمی‌کند.</p>{planCost.missingIngredients.length > 0 && <p className="mt-1 text-xs text-amber-900">بدون قیمت یا تبدیل مطمئن: {[...new Set(planCost.missingIngredients)].slice(0, 5).join('، ')}{planCost.missingIngredients.length > 5 ? ' و موارد دیگر' : ''}</p>}</> : <p className="font-black text-amber-950">هنوز قیمت قابل محاسبه‌ای برای مواد این برنامه ثبت نشده است.</p>}
              <p className="mt-2 text-xs font-bold leading-6 text-amber-950">برای برآورد درست و دقیقِ هزینهٔ تمام‌شدهٔ غذا، لازم است قیمت اقلام غذایی را به‌روز کنی.</p>
            </div>
            <button type="button" className="price-update-cta noosh-cta-3d inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black" onClick={props.onOpenInventory}><ReceiptText size={16}/>به‌روزرسانی قیمت‌ها</button>
          </section>}
          <div className="meal-grid">{plan.map((item, index) => <MealCard key={`${index}-${item.dish.id}`} plan={item} user={user} onUpdateUser={props.onUpdateUser} onRefresh={() => props.onRefresh(index)} onOpenInventory={props.onOpenInventory} />)}</div>
        </> : loading ? <div role="status" aria-live="polite" aria-busy="true" className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#f8fbf7] via-white to-[#f8f4e9] p-5 text-right sm:p-7">
          <div className="flex items-center gap-3 sm:gap-4"><span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#276556] text-white shadow-md shadow-emerald-900/15 sm:h-14 sm:w-14"><ChefHat size={24} /><Loader2 size={16} className="absolute -bottom-1 -left-1 rounded-full bg-[#d7b45a] p-0.5 text-[#173c2b] animate-spin" /></span><div><h3 className="text-base font-black text-[#173c2b] sm:text-lg">داریم برنامهٔ غذایی‌ات را آماده می‌کنیم</h3><p className="mt-1 text-xs leading-6 text-slate-600 sm:text-sm">غذاها را بر اساس بازه، سلیقه و موجودی خانه بررسی می‌کنیم. ممکن است بسته به سرعت اتصال چند لحظه زمان ببرد؛ لطفاً کمی صبر کن.</p></div></div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">{[0, 1, 2].map(item => <div key={item} className="rounded-xl border border-emerald-900/5 bg-white/80 p-2.5 shadow-sm sm:p-3"><div className="h-20 animate-pulse rounded-lg bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-50 sm:h-28" /><div className="mt-3 h-3 w-2/3 animate-pulse rounded-full bg-emerald-100" /><div className="mt-2 h-2 w-1/2 animate-pulse rounded-full bg-amber-100" /></div>)}</div>
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-[#276556]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#d7b45a]" /><span>در حال چیدن سفرهٔ خوشمزهٔ تو…</span><Sparkles size={14} className="text-[#c69c38]" /></div>
        </div> : <div className="plan-empty"><div><CalendarDays size={34} /></div><h3>این‌جا جای برنامهٔ خوشمزهٔ توست</h3><p>بازه و سلیقه‌ات را انتخاب کن و «برنامه‌ام را بچین» را بزن.<br />هر غذایی را هم نپسندیدی، با یک لمس عوضش کن.</p></div>}
      </section>
      {plan.length > 0 && createPortal(<button type="button" className="shopping-banner noosh-cta-3d" onClick={props.onShopping} disabled={props.shoppingLoading}>{props.shoppingLoading ? <Loader2 className="animate-spin" /> : <ShoppingBag />}<span><strong>{user.kitchenMode === 'without-inventory' ? 'مواد لازم را به سبد خرید اضافه کن' : 'کسری مواد را به سبد خرید اضافه کن'}</strong><small>{user.kitchenMode === 'without-inventory' ? 'مقدار کامل مواد لازم برای دستورهای برنامه' : 'پس از کسر موجودی ثبت‌شده'}</small></span></button>, document.body)}
      <p className="dashboard-signoff">با حوصله انتخاب کن. با عشق بپز. نوش جان ♡</p>
    </div>
  </div>;
}
