
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { AnalyticsData, UserProfile, PaymentRecord, CommissionLog } from "../types";
import * as XLSX from 'xlsx';

export const AnalyticsService = {
  /**
   * استخراج داده‌های آماری کل سیستم
   */
  getDashboardMetrics: async (): Promise<AnalyticsData> => {
    const now = Date.now();
    
    // ۱. دریافت کاربران
    const uSnap = await getDocs(collection(db, "users"));
    const allUsers = uSnap.docs.map(d => d.data() as UserProfile);
    
    const activeSubscribers = allUsers.filter(u => u.subscriptionExpiry > now).length;
    const totalUsers = allUsers.length;
    const expiredUsers = totalUsers - activeSubscribers;

    // ۲. دریافت پرداخت‌ها
    const pSnap = await getDocs(query(collection(db, "payments"), where("status", "==", "success")));
    const allPayments = pSnap.docs.map(d => d.data() as PaymentRecord);
    
    const totalRevenue = allPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const monthlyCount = allPayments.filter(p => p.plan_type === 'monthly').length;
    const yearlyCount = allPayments.filter(p => p.plan_type === 'yearly').length;

    // ۳. دریافت ویزیتورها
    const vSnap = await getDocs(collection(db, "visitor_profiles"));
    const cSnap = await getDocs(query(collection(db, "commission_logs"), where("status", "==", "pending")));
    
    const pendingCommissions = cSnap.docs.reduce((acc, curr) => acc + (curr.data() as CommissionLog).amount, 0);

    return {
      totalUsers,
      activeSubscribers,
      expiredUsers,
      conversionRate: totalUsers > 0 ? (activeSubscribers / totalUsers) * 100 : 0,
      churnRate: totalUsers > 0 ? (expiredUsers / totalUsers) * 100 : 0,
      totalRevenue,
      monthlyRevenue: allPayments.filter(p => p.plan_type === 'monthly').reduce((acc, curr) => acc + curr.amount, 0),
      yearlyRevenue: allPayments.filter(p => p.plan_type === 'yearly').reduce((acc, curr) => acc + curr.amount, 0),
      planDistribution: { monthly: monthlyCount, yearly: yearlyCount },
      visitorStats: {
        totalVisitors: vSnap.size,
        activeReferrals: allUsers.filter(u => u.referredBy).length,
        pendingCommissions
      }
    };
  },

  /**
   * تولید خروجی اکسل جامع کاربران برای ادمین
   */
  exportUserReport: async () => {
    const uSnap = await getDocs(collection(db, "users"));
    const now = Date.now();
    
    const reportData = uSnap.docs.map(d => {
      const u = d.data() as UserProfile;
      return {
        'نام کامل': u.fullName,
        'شماره موبایل': u.uid,
        'وضعیت اشتراک': u.subscriptionExpiry > now ? 'فعال' : 'منقضی شده',
        'تاریخ انقضا': new Intl.DateTimeFormat('fa-IR').format(new Date(u.subscriptionExpiry)),
        'تعداد نفرات': u.familySize,
        'نقش کاربری': u.role || 'user',
        'کد معرف استفاده شده': u.referredBy || 'ندارد'
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User_Intelligence_Report");
    XLSX.writeFile(wb, `Noosh_Users_Analytics_${Date.now()}.xlsx`);
  }
};
