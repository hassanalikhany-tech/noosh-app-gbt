import { Challenge } from '../types';
import { Leaf, Dumbbell, Heart } from 'lucide-react';

export const CHALLENGES: Challenge[] = [
  {
    id: 'vegan-week',
    title: 'هفته گیاه‌خواری',
    description: 'یک هفته بدون گوشت قرمز، مرغ و ماهی. تمرکز روی سبزیجات و حبوبات.',
    icon: Leaf,
    color: 'bg-emerald-500',
    bannedCategories: ['kabab', 'stew', 'polo', 'fastfood'], 
    bannedKeywords: ['گوشت', 'مرغ', 'ماهی', 'میگو', 'کالباس', 'سوسیس', 'کباب', 'فیله'] 
  },
  {
    id: 'protein-power',
    title: 'پروتئین پلاس',
    description: 'هفته عضله‌سازی! تمرکز روی غذاهای سرشار از پروتئین حیوانی و گیاهی.',
    icon: Dumbbell,
    color: 'bg-rose-500',
    requiredKeywords: ['گوشت', 'مرغ', 'ماهی', 'تخم مرغ', 'عدس', 'لوبیا', 'نخود']
  },
  {
    id: 'sugar-free',
    title: 'حذف قند و شکر',
    description: 'در این هفته از مصرف غذاهایی که در دستور پخت آن‌ها شکر یا قند وجود دارد پرهیز کنید.',
    icon: Heart,
    color: 'bg-purple-500',
    bannedKeywords: ['شکر', 'قند', 'نبات', 'پولکی']
  }
];