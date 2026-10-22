import React, { useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Heart, Leaf, Loader2, Printer, ShoppingBag, Sparkles, Undo2, Zap } from 'lucide-react';
import { DayPlan, UserProfile } from '../types';
import MealCard from './MealCard';

type Period = 'daily' | 'weekly' | 'monthly';
type Filter = 'meatlessMode' | 'onlyFavoritesMode' | 'quickMealsMode';
interface Props {
  user: UserProfile; plan: DayPlan[]; loading: Period | null; error: string; canUndo: boolean;
  onGenerate: (period: Period) => void; onToggleFilter: (filter: Filter) => void;
  onRefresh: (index: number) => Promise<void>; onUpdateUser: (user: UserProfile) => void;
  onShopping: () => void; shoppingLoading: boolean; onUndo: () => Promise<void>;
  onNavigate: (view: 'pantry' | 'search' | 'settings') => void; onSearch: (term: string) => void;
}
const fa = (n: number) => n.toLocaleString('fa-IR');
const filters = [
  { key: 'meatlessMode' as const, label: 'گیاهی', icon: Leaf },
  { key: 'quickMealsMode' as const, label: 'تا ۴۵ دقیقه', icon: Zap },
  { key: 'onlyFavoritesMode' as const, label: 'علاقه‌مندی‌ها', icon: Heart },
];
export default function PlanDashboard(props: Props) {
  const { user, plan, loading } = props;
  const [period, setPeriod] = useState<Period>('weekly');
  const [query, setQuery] = useState('');
  const [undoing, setUndoing] = useState(false);
  const [undoError, setUndoError] = useState('');
  const times = plan.map(p => p.dish.cookTime).filter((time): time is number => typeof time === 'number' && time > 0);
  return <div className="plan-dashboard">
    <div className="dashboard-inner">
      <section className="planner-hero planner-hero-with-controls" aria-labelledby="planner-title">
        <div className="planner-hero-title-row"><div><span className="planner-hero-eyebrow">کمتر فکر کن، متنوع‌تر بپز</span><h2 id="planner-title">برنامهٔ غذایی من</h2></div>
          {plan.length > 0 && <button className="planner-hero-print" onClick={() => window.print()}><Printer size={16} /><span>چاپ</span></button>}
        </div>
        <div className="planner-hero-main"><div className="planner-hero-copy"><span className="planner-hero-kicker"><CalendarDays size={16} /> برنامه‌ریز سفرهٔ تو</span>
          <p>{user.kitchenMode === 'without-inventory' ? 'غذاها را مستقل از انبار، با فیلتر گیاهی، علاقه‌مندی‌ها و مواد کنارگذاشته‌شده در تنظیماتت برنامه‌ریزی کن.' : user.inventory?.length ? 'برنامه از غذاهایی شروع می‌شود که با موجودی خانه‌ات جورند؛ فیلترهای ذائقه و مواد کنارگذاشته‌شده هم رعایت می‌شوند.' : 'برای پیشنهاد دقیق با مواد خانه، چند قلم به انبار اضافه کن؛ تا آن زمان هم می‌توانی آزادانه برنامه غذایی بچینی.'} {user.kitchenMode === 'without-inventory' ? 'لیست خرید مقدار کامل دستورها را می‌آورد و چیزی از انبار کم نمی‌کند.' : 'کسری خرید پس از کسر موجودی ثبت‌شده حساب می‌شود.'}</p>
          <div className="planner-hero-steps"><span><i>۱</i> انتخاب بازه</span><b /><span><i>۲</i> چیدن غذاها</span><b /><span><i>۳</i> فهرست خرید</span></div>
        </div>
        <figure className="planner-hero-food-photo">
          <img src="/hero-chelo-kabab-barg.png" alt="چلوکباب برگ ایرانی با برنج زعفرانی و گوجه کبابی" loading="eager" fetchPriority="high" />
        </figure>
        </div>
        <div className="planner-controls planner-hero-controls"><div className="period-switch" aria-label="بازه برنامه">
          {([{ id: 'daily', label: 'امروز' }, { id: 'weekly', label: 'یک هفته' }, { id: 'monthly', label: '۳۰ روز' }] as const).map(item => <button key={item.id} aria-pressed={period === item.id} onClick={() => setPeriod(item.id)} className={period === item.id ? 'selected' : ''}>{item.label}</button>)}
        </div><div className="diet-filters">{filters.map(({ key, label, icon: Icon }) => <button key={key} aria-pressed={!!user[key]} className={user[key] ? 'active' : ''} onClick={() => props.onToggleFilter(key)}><Icon size={16} />{label}</button>)}</div>
          <button className="generate-button" disabled={!!loading} onClick={() => props.onGenerate(period)}>{loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}{loading ? 'در حال چیدن برنامه…' : plan.length ? 'برنامهٔ تازه بچین' : 'برنامه‌ام را بچین'}</button>
        </div>
      </section>
      <section className="planner-panel" aria-label="نتایج برنامه غذایی">
        {props.canUndo && <div className="plan-tools planner-panel-tools">
          <button disabled={undoing || !!loading} onClick={async () => { setUndoing(true); setUndoError(''); try { await props.onUndo(); } catch { setUndoError('بازگرداندن برنامه انجام نشد. دوباره تلاش کنید.'); } finally { setUndoing(false); } }}><Undo2 size={17} /> برنامهٔ قبلی</button>
        </div>}
        {(props.error || undoError) && <div className="plan-error" role="alert">{props.error || undoError} فیلترها را تغییر دهید یا دوباره تلاش کنید.</div>}
        {plan.length > 0 ? <>
          <div className="plan-summary" aria-live="polite"><span><CalendarDays size={16} />{fa(plan.length)} پیشنهاد برای سفرهٔ تو</span>{times.length > 0 && <span><Clock3 size={16} />میانگین زمان پخت: {fa(Math.round(times.reduce((sum, time) => sum + time, 0) / times.length))} دقیقه</span>}</div>
          <div className="meal-grid">{plan.map((item, index) => <MealCard key={`${index}-${item.dish.id}`} plan={item} user={user} onUpdateUser={props.onUpdateUser} onRefresh={() => props.onRefresh(index)} />)}</div>
          <button className="shopping-banner" onClick={props.onShopping} disabled={props.shoppingLoading}>{props.shoppingLoading ? <Loader2 className="animate-spin" /> : <ShoppingBag />}<span><strong>مواد لازم را به لیست خرید اضافه کن</strong><small>{user.kitchenMode === 'without-inventory' ? 'مقدار کامل مواد لازم برای دستورهای برنامه' : 'مقدار کسری پس از کسر موجودی ثبت‌شده'}</small></span><ArrowLeft size={20} /></button>
        </> : <div className="plan-empty"><div><CalendarDays size={34} /></div><h3>این‌جا جای برنامهٔ خوشمزهٔ توست</h3><p>بازه و سلیقه‌ات را انتخاب کن و «برنامه‌ام را بچین» را بزن.<br />هر غذایی را هم نپسندیدی، با یک لمس عوضش کن.</p></div>}
      </section>
      <p className="dashboard-signoff">با حوصله انتخاب کن. با عشق بپز. نوش جان ♡</p>
    </div>
  </div>;
}
