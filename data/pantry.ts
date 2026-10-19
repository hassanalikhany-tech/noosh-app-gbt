
export interface PantryCategory {
  id: string;
  title: string;
  items: string[];
  priority: number;
  subcategories: { id: string; title: string; items: string[] }[];
}

export const PANTRY_ITEMS: PantryCategory[] = [
  {
    id: 'proteins',
    priority: 1,
    title: 'گوشت، مرغ، ماهی و مواد پروتئینی',
    subcategories: [
      { id: 'proteins-meat', title: 'گوشت و ماکیان', items: ['اردک', 'بلدرچین', 'بوقلمون', 'پاچه گوساله', 'جگر', 'سیرابی', 'کله و پاچه', 'گوشت بز', 'گوشت چرخ‌کرده', 'گوشت سینه مرغ', 'گوشت شتر', 'گوشت غاز', 'گوشت گاو و گوساله', 'گوشت گوسفندی', 'مرغ'] },
      { id: 'proteins-seafood', title: 'ماهی و آبزیان', items: ['تن ماهی', 'ماهی', 'میگو'] },
      { id: 'proteins-eggs', title: 'تخم‌مرغ و پروتئین گیاهی', items: ['تخم مرغ', 'توفو'] },
      { id: 'proteins-ready', title: 'فرآورده‌های آماده', items: ['سوسیس', 'کالباس'] },
    ],
    items: [
      'اردک', 'بلدرچین', 'بوقلمون', 'پاچه گوساله', 'تخم مرغ', 'توفو', 'تن ماهی', 'جگر', 'سوسیس',
      'سیرابی', 'کالباس', 'کله و پاچه', 'گوشت بز', 'گوشت چرخ‌کرده',
      'گوشت سینه مرغ', 'گوشت شتر', 'گوشت غاز', 'گوشت گاو و گوساله', 'گوشت گوسفندی', 
      'ماهی', 'مرغ', 'میگو'
    ].sort((a, b) => a.localeCompare(b, 'fa'))
  },
  {
    id: 'dairy',
    priority: 2,
    title: 'لبنیات',
    subcategories: [
      { id: 'dairy-milk', title: 'شیر و فرآورده‌های شیر', items: ['شیر', 'خامه', 'کره پاستوریزه', 'کره محلی'] },
      { id: 'dairy-cheese', title: 'پنیرها', items: ['پنیر', 'پنیر فتا', 'پنیر پیتزا'] },
      { id: 'dairy-fermented', title: 'ماست، دوغ و کشک', items: ['ماست', 'دوغ', 'کشک'] },
    ],
    items: ['شیر', 'خامه', 'کره پاستوریزه', 'کره محلی', 'پنیر', 'پنیر فتا', 'پنیر پیتزا', 'ماست', 'دوغ', 'کشک'].sort((a, b) => a.localeCompare(b, 'fa'))
  },
  {
    id: 'grains',
    priority: 3,
    title: 'غلات، حبوبات و نان',
    subcategories: [
      { id: 'grains-legumes', title: 'حبوبات', items: ['باقالی', 'عدس', 'لوبیا چشم بلبلی', 'لوبیا چیتی', 'لوبیا سفید', 'لوبیا قرمز', 'لپه', 'ماش', 'نخود'] },
      { id: 'grains-rice', title: 'برنج، غلات و دانه‌ها', items: ['برنج', 'بلغور جو', 'بلغور گندم', 'جو', 'جو پرک', 'جو دوسر', 'جو پوست کنده', 'گندم', 'غلات صبحانه'] },
      { id: 'grains-flour', title: 'آرد و رشته', items: ['آرد ذرت', 'آرد سفید', 'آرد گندم', 'آرد نخودچی', 'ترخینه', 'رشته آشی', 'رشته پلویی'] },
      { id: 'grains-bread-pasta', title: 'نان و پاستا', items: ['پاستا', 'رشته / پاستا', 'ماکارونی و انواع پاستا', 'نان (لواش، بربری، سنگک، پیتا)'] },
    ],
    items: [
      'آرد ذرت', 'آرد سفید', 'آرد گندم', 'آرد نخودچی', 'باقالی', 'برنج', 'بلغور جو', 'بلغور گندم', 
      'پاستا', 'ترخینه', 'جو', 'جو پرک', 'جو دوسر', 'جو پوست کنده', 'رشته / پاستا', 'رشته آشی', 
      'رشته پلویی', 'عدس', 'غلات صبحانه', 'لوبیا چشم بلبلی', 'لوبیا چیتی', 'لوبیا سفید', 'لوبیا قرمز', 
      'لپه', 'ماکارونی و انواع پاستا', 'ماش', 'نان (لواش، بربری، سنگک، پیتا)', 'نخود', 'گندم'
    ].sort((a, b) => a.localeCompare(b, 'fa'))
  },
  {
    id: 'vegetables',
    priority: 4,
    title: 'سبزی، صیفی و میوه',
    subcategories: [
      { id: 'vegetables-leafy', title: 'سبزی‌های برگی و معطر', items: ['اسفناج', 'برگ چغندر', 'ترخون', 'تره', 'تره فرنگی', 'جعفری تازه', 'ریحان', 'سبزی آش', 'سبزی خوردن', 'شنبلیله تازه', 'شوید تازه', 'گشنیز تازه', 'مرزه', 'نعنا تازه'] },
      { id: 'vegetables-roots', title: 'ریشه‌ای و پیازی', items: ['تربچه', 'چغندر (لبو)', 'سیب زمینی', 'سیر', 'شلغم', 'هویج', 'پیاز'] },
      { id: 'vegetables-fruiting', title: 'صیفی‌جات و قارچ', items: ['بادمجان', 'بامیه', 'خیار', 'ذرت', 'فلفل تند', 'فلفل دلمه‌ای', 'قارچ', 'قارچ دکمه‌ای', 'کدو حلوایی', 'کدو سبز', 'گوجه فرنگی', 'لوبیا سبز', 'مارچوبه', 'نخود فرنگی'] },
      { id: 'vegetables-fruit', title: 'میوه‌ها و چاشنی‌های گیاهی', items: ['آواکادو', 'انار', 'انار خشک', 'به', 'ریواس', 'زیتون', 'شور', 'لیمو'] },
      { id: 'vegetables-cabbage', title: 'کلم‌ها و سبزیجات چلیپایی', items: ['کرفس', 'کلم بروکلی', 'کلم بروکسل (بروکسل)', 'کلم برگ (سفید)', 'کلم قرمز', 'کلم قمری', 'کنگر', 'گل کلم'] },
    ],
    items: [
      'آواکادو', 'اسفناج', 'انار', 'انار خشک', 'بادمجان', 'بامیه', 'برگ چغندر', 'به', 'تربچه', 
      'ترخون', 'تره', 'تره فرنگی', 'جعفری تازه', 'چغندر (لبو)', 'خیار', 'ذرت', 'ریحان', 'ریواس', 
      'زیتون', 'سبزی آش', 'سبزی خوردن', 'سیب زمینی', 'سیر', 'شلغم', 'شنبلیله تازه', 'شوید تازه', 
      'شور', 'فلفل تند', 'فلفل دلمه‌ای', 'قارچ', 'قارچ دکمه‌ای', 'کدو حلوایی', 'کدو سبز', 'کرفس', 
      'کلم بروکلی', 'کلم بروکسل (بروکسل)', 'کلم برگ (سفید)', 'کلم قرمز', 'کلم قمری', 'کنگر', 
      'گشنیز تازه', 'گل کلم', 'گوجه فرنگی', 'لوبیا سبز', 'لیمو', 'مارچوبه', 'مرزه', 'نعنا تازه', 
      'نخود فرنگی', 'هویج', 'پیاز'
    ].sort((a, b) => a.localeCompare(b, 'fa'))
  },
  {
    id: 'additives',
    priority: 5,
    title: 'ادویه، چاشنی و خشکبار',
    subcategories: [
      { id: 'additives-spices', title: 'ادویه و سبزی خشک', items: ['آویشن', 'ادویه کاری', 'ادویه پلویی', 'دارچین', 'زردچوبه', 'زیره', 'سماق', 'شنبلیله خشک', 'فلفل سیاه', 'فلفل قرمز', 'پاپریکا', 'زعفران', 'نعناع خشک', 'نمک', 'هل', 'پودر سیر'] },
      { id: 'additives-oils', title: 'روغن، سرکه و آب‌میوه‌ها', items: ['آبلیمو', 'آبغوره', 'آب نارنج', 'روغن حیوانی', 'روغن زیتون', 'روغن کنجد', 'روغن مایع', 'سرکه سفید'] },
      { id: 'additives-sauces', title: 'رب، سس و مواد پخت', items: ['بیکینگ پودر', 'تمر هندی', 'جوش شیرین', 'خلال پوست پرتقال', 'رب انار', 'رب گوجه‌فرنگی', 'ژلاتین', 'سس سویا', 'نشاسته'] },
      { id: 'additives-nuts', title: 'مغزها و خشکبار', items: ['آلو بخارا', 'بادام', 'پسته', 'زرشک', 'گردو', 'لیمو عمانی', 'غوره'] },
      { id: 'additives-sweet', title: 'شیرین‌کننده و عرقیات', items: ['شکر', 'شیره انگور', 'عسل', 'قند', 'گلاب'] },
    ],
    items: [
      'آبلیمو', 'آبغوره', 'آب نارنج', 'آلو بخارا', 'آویشن', 'ادویه کاری', 'ادویه پلویی', 'بادام', 
      'بیکینگ پودر', 'پاپریکا', 'پسته', 'تمر هندی', 'جوش شیرین',
      'خلال پوست پرتقال', 'دارچین', 'رب انار', 'رب گوجه‌فرنگی', 'روغن حیوانی', 'روغن زیتون', 
      'روغن کنجد', 'روغن مایع', 'زردچوبه', 'زرشک', 'زعفران', 'زیره', 'ژلاتین', 'سس سویا', 'سماق', 
      'سرکه سفید', 'شکر', 'شیره انگور', 'شنبلیله خشک', 'عسل', 'غوره', 'فلفل سیاه', 'فلفل قرمز', 
      'قند', 'لیمو عمانی', 'نشاسته', 'نعناع خشک', 'نمک', 'هل', 'پودر سیر', 'گردو', 'گلاب'
    ].sort((a, b) => a.localeCompare(b, 'fa'))
  }
];

export const SPICES_AND_ADDITIVES = PANTRY_ITEMS.find(c => c.id === 'additives')?.items || [];

const normalizeForSearch = (str: string): string => 
  str.trim()
     .replace(/ی/g, 'ی')
     .replace(/ي/g, 'ی')
     .replace(/ک/g, 'ک')
     .replace(/ك/g, 'ک')
     .replace(/آ/g, 'ا')
     .replace(/غ/g, 'ق') // Common typo: پرتغال vs پرتقال
     .replace(/\s+/g, '')
     .replace(/[\u200B-\u200D\uFEFF]/g, '');

export const getBaseIngredientName = (itemName: string): string => {
  const normalizedSearch = normalizeForSearch(itemName);
  if (!normalizedSearch) return itemName;

  // 1. Try exact match first
  for (const cat of PANTRY_ITEMS) {
    for (const item of cat.items) {
      if (normalizeForSearch(item) === normalizedSearch) return item;
    }
  }

  // 2. Try to find if the input contains a base item (e.g., "پیاز بزرگ" contains "پیاز")
  let bestMatch: string | null = null;
  let maxMatchLength = 0;

  for (const cat of PANTRY_ITEMS) {
    for (const item of cat.items) {
      const ni = normalizeForSearch(item);
      // Ensure we match the base name within the input
      if (normalizedSearch.includes(ni)) {
        // We prefer the longest match to be more specific (e.g., "گوشت چرخ‌کرده" over "گوشت")
        if (ni.length > maxMatchLength) {
          maxMatchLength = ni.length;
          bestMatch = item;
        }
      }
    }
  }
  
  return bestMatch || itemName;
};

export const getIngredientCategoryId = (itemName: string): string | null => {
  const normalizedSearch = normalizeForSearch(itemName);
  if (!normalizedSearch) return null;

  // Try exact match on normalized names first
  let category = PANTRY_ITEMS.find(cat => cat.items.some(item => normalizeForSearch(item) === normalizedSearch));
  if (category) return category.id;

  // Try partial match but only if the pantry item is a significant part of the search or vice versa
  // To avoid "خلال" matching everything, we check if the match is more than just a few characters
  category = PANTRY_ITEMS.find(cat => cat.items.some(item => {
    const ni = normalizeForSearch(item);
    if (ni.length < 3 || normalizedSearch.length < 3) return ni === normalizedSearch;
    return normalizedSearch.includes(ni) || ni.includes(normalizedSearch);
  }));
  
  return category ? category.id : null;
};
