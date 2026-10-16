
import { Dish } from '../types';
import { BACKUP_DISHES } from './backupDishes';
import { ASHES } from './dishes_ashes';
import { POLOS } from './dishes_polos';
import { KHORAKS } from './dishes_khoraks';
import { STEWS } from './dishes_stews';
import { SOUPS } from './dishes_soups';
import { FASTFOOD_DISHES } from './dishes_fastfood';
import { KABABS } from './dishes_kababs';
import { KUKUS } from './dishes_kukus';
import { DOLMAS } from './dishes_dolmas';
import { MIX_DISHES } from './dishes_mix';
import { USER_PROVIDED_DISHES_PART_1 } from './dishes_user_provided';
import { USER_PROVIDED_DISHES_PART_2 } from './dishes_user_provided_2';
import { USER_PROVIDED_DISHES_PART_3 } from './dishes_user_provided_3';
import { USER_PROVIDED_DISHES_PART_4 } from './dishes_user_provided_4';
import { USER_PROVIDED_DISHES_PART_5 } from './dishes_user_provided_5';
import { INDIAN_DISHES } from './dishes_indian';
import { ITALIAN_DISHES } from './dishes_italian';
import { MEXICAN_DISHES } from './dishes_mexican';
import { FRENCH_DISHES } from './dishes_french';
import { UK_DISHES } from './dishes_uk';
import { TURKISH_DISHES } from './dishes_turkish';
import { ARAB_DISHES } from './dishes_arab';
import { PAKISTANI_DISHES } from './dishes_pakistani';
import { RUSSIAN_DISHES } from './dishes_russian';
import { UZBEK_DISHES } from './dishes_uzbek';
import { CAUCASUS_DISHES } from './dishes_caucasus';
import { CENTRAL_ASIA_DISHES } from './dishes_central_asia';
import { FAR_EAST_DISHES } from './dishes_chinese_thai';
import { VARIED_DISHES } from './dishes_varied';
import { IRANIAN_DESSERTS } from './dishes_desserts';
import { INTERNATIONAL_DESSERTS } from './dishes_international_desserts';

/**
 * دیتابیس جامع محلی (اکنون کاملاً تخلیه شده اما پیوندهای ساختاری برای حفظ فیلترها برقرار است)
 */
export const DEFAULT_DISHES: Dish[] = [
  ...BACKUP_DISHES,
  ...ASHES,
  ...POLOS,
  ...KHORAKS,
  ...STEWS,
  ...SOUPS,
  ...FASTFOOD_DISHES,
  ...KABABS,
  ...KUKUS,
  ...DOLMAS,
  ...MIX_DISHES,
  ...USER_PROVIDED_DISHES_PART_1,
  ...USER_PROVIDED_DISHES_PART_2,
  ...USER_PROVIDED_DISHES_PART_3,
  ...USER_PROVIDED_DISHES_PART_4,
  ...USER_PROVIDED_DISHES_PART_5,
  ...INDIAN_DISHES,
  ...ITALIAN_DISHES,
  ...MEXICAN_DISHES,
  ...FRENCH_DISHES,
  ...UK_DISHES,
  ...TURKISH_DISHES,
  ...ARAB_DISHES,
  ...PAKISTANI_DISHES,
  ...RUSSIAN_DISHES,
  ...UZBEK_DISHES,
  ...CAUCASUS_DISHES,
  ...CENTRAL_ASIA_DISHES,
  ...FAR_EAST_DISHES,
  ...VARIED_DISHES,
  ...IRANIAN_DESSERTS,
  ...INTERNATIONAL_DESSERTS
];
