
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit, addDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { SecurityAlert, AlertStatus, RiskLevel } from "../types";
import * as XLSX from 'xlsx';

export const AlertService = {
  /**
   * دریافت هشدارهای جدید و مهم
   */
  getSecurityAlerts: async (minRisk: RiskLevel = 'low') => {
    const q = query(
      collection(db, "alerts"), 
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SecurityAlert));
  },

  /**
   * تغییر وضعیت هشدار به بررسی شده
   */
  acknowledgeAlert: async (alertId: string, adminId: string) => {
    const alertRef = doc(db, "alerts", alertId);
    await updateDoc(alertRef, {
      status: 'acknowledged',
      acknowledged_at: Date.now(),
      acknowledged_by: adminId
    });
    
    // ثبت لاگ فعالیت ادمین
    await addDoc(collection(db, "alert_logs"), {
      alert_id: alertId,
      admin_id: adminId,
      action: 'acknowledged',
      timestamp: Date.now()
    });
  },

  /**
   * تولید خروجی اکسل از لیست تخلفات
   */
  exportAlertsToExcel: (alerts: SecurityAlert[]) => {
    const data = alerts.map(a => ({
      'شناسه کاربر': a.user_id,
      'نوع تخلف': a.event_type,
      'سطح ریسک': a.risk_level,
      'امتیاز': a.risk_score,
      'دستگاه': a.device_id,
      'آی‌پی': a.ip,
      'وضعیت': a.status,
      'تاریخ و زمان': new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(a.timestamp))
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Security_Alerts");
    XLSX.writeFile(wb, `Noosh_Fraud_Report_${Date.now()}.xlsx`);
  },

  /**
   * دریافت آمارهای سریع امنیتی
   */
  getSecurityDashboardStats: async () => {
    const alerts = await AlertService.getSecurityAlerts();
    return {
      total: alerts.length,
      highRisk: alerts.filter(a => a.risk_level === 'high').length,
      newAlerts: alerts.filter(a => a.status === 'new').length,
      fraudTypes: {
        multiDevice: alerts.filter(a => a.event_type === 'multi_device').length,
        referral: alerts.filter(a => a.event_type === 'referral_fraud').length
      }
    };
  }
};
