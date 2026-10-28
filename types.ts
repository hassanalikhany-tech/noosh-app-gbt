
export interface Ingredient {
  item: string;
  amount: number;
  unit: string;
  ingredientId?: string;
  state?: 'raw' | 'prepared';
}

export type DishCategory =
  | 'ash' 
  | 'polo' 
  | 'khorak' 
  | 'stew' 
  | 'soup' 
  | 'fastfood' 
  | 'kabab' 
  | 'international' 
  | 'dessert';

export type NatureType = 'hot' | 'cold' | 'balanced';
export type KitchenMode = 'with-inventory' | 'without-inventory';

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  description: string;
  ingredients: Ingredient[];
  recipeSteps: string[];
  imageUrl?: string;
  hasRealData?: boolean;
  nationality?: string;
  nature?: NatureType;
  mosleh?: string;
  calories?: number;
  cookTime?: number;
  difficulty?: string;
  natureLabel?: string;
  servings?: number;
  imageReviewStatus?: 'approved' | 'replace' | 'create' | 'removed' | 'completed';
  isPersonal?: boolean;
  creatorName?: string;
  creatorTitle?: 'lady' | 'gentleman' | 'none';
  isCommunityRecipe?: boolean;
  communitySubmissionId?: string;
  communityShareStatus?: 'pending' | 'approved' | 'rejected';
  communityShareFeedback?: string;
}

export interface DayPlan {
  dayName: string;
  dish: Dish;
  sideDish?: Dish;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bannedCategories?: DishCategory[];
  bannedKeywords?: string[];
  requiredKeywords?: string[];
}

export const DAYS_OF_WEEK = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const CATEGORY_LABELS: Record<DishCategory, string> = {
  ash: 'آش',
  polo: 'پلو',
  khorak: 'خوراک',
  stew: 'خورش',
  soup: 'سوپ',
  fastfood: 'فست فود',
  kabab: 'کباب',
  international: 'بین المللی',
  dessert: 'پیش‌غذا و دسر'
};

export interface ShoppingItem {
  sourceKey?: string;
  estimated?: boolean;
  unresolved?: boolean;
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  checked: boolean;
  fromRecipe?: string;
  category?: string;
}

export interface AuthUser {
  uid: string;
  mobileNumber: string;
  firstName?: string;
  lastName?: string;
  createdAt: number;
  lastLogin: number;
  sessionId: string;
  deviceId: string;
  deviceType?: string;
  osVersion?: string;
  appVersion?: string;
  isActive: boolean;
  isBlocked: boolean;
  role: 'user' | 'admin' | 'visitor' | 'normal';
  referredBy?: string;
}

export interface VisitorProfile {
  user_id: string;
  referral_code: string;
  total_commission: number;
  kyc_status: 'none' | 'pending' | 'verified' | 'rejected';
  payment_info_status: 'none' | 'completed';
  referrals_count: number;
  created_at: number;
  is_active: boolean;
  total_paid?: number;
  last_settlement_at?: number;
}

export interface VisitorFinancialInfo {
  visitor_id: string;
  fullName: string;
  iban: string;
  card_number?: string;
  national_id: string;
  birth_date: string;
  id_card_image_url?: string;
  verified: boolean;
  status: 'pending' | 'verified' | 'rejected';
}

export type CommissionStatus = 'pending' | 'ready' | 'paid' | 'rejected';

export interface CommissionLog {
  id: string;
  visitor_id: string;
  user_id: string;
  amount: number;
  base_amount?: number;
  type: 'first_purchase' | 'renewal';
  status: CommissionStatus;
  date: number;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  user_full_name: string;
  amount: number;
  plan_type: 'monthly' | 'yearly';
  authority: string;
  ref_id: string;
  status: 'pending' | 'success' | 'failed';
  created_at: number;
}

export interface VisitorSettlement {
  id: string;
  visitor_id: string;
  visitor_name: string;
  visitor_mobile: string;
  visitor_iban: string;
  total_amount: number;
  settlement_month: string;
  status: 'ready' | 'paid';
  commission_ids: string[];
  created_at: number;
  paid_at?: number;
}

export interface AppConfig {
  monthly_price: number;
  yearly_price: number;
  last_updated: number;
}

// New Security & Alert Types
export type AlertStatus = 'new' | 'seen' | 'acknowledged';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface SecurityAlert {
  id: string;
  user_id: string;
  user_name?: string;
  visitor_id?: string;
  event_type: 'multi_device' | 'referral_fraud' | 'payment_anomaly' | 'login_brute_force' | 'location_jump';
  risk_score: number;
  risk_level: RiskLevel;
  device_id: string;
  ip: string;
  status: AlertStatus;
  timestamp: number;
  metadata?: any;
}

export interface AnalyticsData {
  totalUsers: number;
  activeSubscribers: number;
  expiredUsers: number;
  conversionRate: number;
  churnRate: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  planDistribution: { monthly: number; yearly: number };
  visitorStats: {
    totalVisitors: number;
    activeReferrals: number;
    pendingCommissions: number;
  };
}

export type SecurityEventType = 'device_change' | 'multiple_login' | 'suspicious_ip' | 'session_replace' | 'login_failed' | 'admin_analytics_view';

export interface SecurityLog {
  id: string;
  user_id: string;
  user_full_name: string;
  event_type: SecurityEventType;
  risk_level: RiskLevel;
  device_id: string;
  ip: string;
  timestamp: number;
  metadata?: any;
}

export interface UserDevice {
  id?: string;
  user_id: string;
  device_id: string;
  device_info: string;
  last_login: number;
  status: 'active' | 'inactive';
}

export interface InventoryItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  minThreshold: number;
  minThresholdUnit?: string;
  lastUpdated: number;
  ingredientId?: string;
  state?: 'raw' | 'prepared';
  previousIds?: string[];
  measurement?: { value: number; baseUnit: string; enteredAmount: number; enteredUnit: string };
  unitWeightGrams?: Record<string, number>;
  /** Optional purchase batches, in the same unit as amount. Existing rows migrate as one undated batch when first edited. */
  stockBatches?: InventoryBatch[];
}

export interface InventoryBatch {
  id: string;
  /** Current remaining amount in the inventory item's current unit. */
  amount: number;
  /** Original purchased amount and per-unit purchase price; retained after consumption. */
  purchaseAmount?: number;
  unitPrice?: number;
  expiresOn?: string;
  receivedAt: number;
}

export interface PurchaseRecord {
  id: string;
  inventoryId: string;
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  purchasedAt: number;
  expiresOn?: string;
  legacy?: boolean;
  approximate?: boolean;
}

export interface IngredientPrice {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  updatedAt: number;
}

export interface RecipePersonalReview {
  rating?: number;
  note?: string;
  updatedAt: number;
}

export interface CookingTransaction {
  id: string;
  dishId: string;
  dishName: string;
  servings: number;
  engineVersion?: number;
  referenceVersion?: string;
  createdAt: number;
  reversedAt?: number;
  notes?: string[];
  changes: Array<{ inventoryId: string; name: string; unit: string; consumed: number; before: number; after: number; estimated: boolean; reason: string; stockSnapshot?: InventoryItem; batchDeductions?: InventoryBatch[] }>;
}

export interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  passwordCode: string; 
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  subscriptionExpiry: number; 
  blacklistedDishIds: string[]; 
  favoriteDishIds: string[];
  dislikedIngredients: string[];
  excludedCategories: DishCategory[]; 
  excludedNationalities?: string[];
  preferredNatures: NatureType[];
  history: string[];
  familySize: number;
  isAdmin?: boolean;
  isApproved?: boolean; 
  isDeleted?: boolean; 
  dietMode?: boolean; 
  activeChallengeId?: string | null; 
  customShoppingList?: ShoppingItem[]; 
  inventory?: InventoryItem[];
  purchaseHistory?: PurchaseRecord[];
  /** @deprecated Migrated to purchaseHistory from earlier builds. */
  ingredientPrices?: Record<string, IngredientPrice>;
  recipeReviews?: Record<string, RecipePersonalReview>;
  cookingTransactions?: CookingTransaction[];
  inventorySchemaVersion?: number;
  inventoryNeedsReview?: boolean;
  kitchenMode?: KitchenMode;
  hasCompletedSetup?: boolean;
  onlyFavoritesMode?: boolean;
  meatlessMode?: boolean;
  quickMealsMode?: boolean;
  weeklyPlan?: DayPlan[]; 
  weeklyPlanMode?: KitchenMode;
  currentSessionId?: string;
  registeredDevices?: string[]; 
  isBiometricEnabled?: boolean;
  role?: 'user' | 'admin' | 'visitor' | 'normal';
  deviceId?: string;
  referredBy?: string;
  riskScore?: RiskLevel;
  lastActiveAt?: number;
  readNotificationIds?: string[];
  deletedNotificationIds?: string[];
  hiddenGuidanceKeys?: string[];
}

// --- Independent Add-on Modules: Notification & Feedback ---

export interface Notification {
  id: string;
  title: string;
  message: string;
  target_group: 'all' | 'active' | 'visitors' | 'specific';
  target_uids?: string[];
  send_time: number;
  status: 'pending' | 'sent';
  created_by: string;
  source_feedback_id?: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  notification_id: string;
  delivered: boolean;
  clicked: boolean;
  timestamp: number;
}

export type FeedbackCategory = 'suggestion' | 'issue' | 'criticism' | 'feature_request';

export interface UserFeedback {
  id: string;
  user_id: string;
  user_name: string;
  user_mobile: string;
  category: FeedbackCategory;
  message: string;
  image_url?: string;
  status: 'new' | 'reviewed' | 'to_be_reviewed' | 'to_be_followed_up' | 'handled' | 'informed' | 'referred';
  created_at: number;
  device: string;
  assigned_to_name?: string;
  assigned_at?: number;
}
