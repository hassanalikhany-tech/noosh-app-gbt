
import { collection, addDoc, query, where, getDocs, doc, updateDoc, setDoc, getDoc, limit, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { SecurityLog, SecurityEventType, RiskLevel, UserDevice } from "../types";

export const SecurityService = {
  /**
   * ثبت یک رویداد امنیتی در دیتابیس
   */
  logEvent: async (userId: string, fullName: string, eventType: SecurityEventType, risk: RiskLevel, metadata: any = {}) => {
    try {
      const deviceId = navigator.userAgent; // ساده شده برای مرورگر
      // در محیط واقعی از سرویس‌های شخص ثالث برای IP استفاده می‌شود، اینجا فرضی است
      const ip = "Logged Connection"; 

      await addDoc(collection(db, "security_logs"), {
        user_id: userId,
        user_full_name: fullName,
        event_type: eventType,
        risk_level: risk,
        device_id: btoa(deviceId).substring(0, 16), // رمزنگاری ساده برای ذخیره
        ip: ip,
        timestamp: Date.now(),
        metadata
      });
    } catch (e) {
      console.error("Security Logging Failed", e);
    }
  },

  /**
   * بررسی دستگاه فعال کاربر
   */
  validateDevice: async (userId: string, currentDeviceId: string): Promise<{ isAllowed: boolean; activeDeviceInfo?: string }> => {
    const q = query(collection(db, "user_devices"), where("user_id", "==", userId), where("status", "==", "active"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // ثبت اولین دستگاه
      await addDoc(collection(db, "user_devices"), {
        user_id: userId,
        device_id: currentDeviceId,
        device_info: navigator.userAgent,
        last_login: Date.now(),
        status: 'active'
      });
      return { isAllowed: true };
    }

    const activeDevice = snapshot.docs[0].data() as UserDevice;
    if (activeDevice.device_id === currentDeviceId) {
      return { isAllowed: true };
    }

    return { isAllowed: false, activeDeviceInfo: activeDevice.device_info };
  },

  /**
   * جایگزینی دستگاه فعال
   */
  replaceActiveDevice: async (userId: string, newDeviceId: string) => {
    const q = query(collection(db, "user_devices"), where("user_id", "==", userId), where("status", "==", "active"));
    const snapshot = await getDocs(q);

    for (const d of snapshot.docs) {
      await updateDoc(doc(db, "user_devices", d.id), { status: 'inactive' });
    }

    await addDoc(collection(db, "user_devices"), {
      user_id: userId,
      device_id: newDeviceId,
      device_info: navigator.userAgent,
      last_login: Date.now(),
      status: 'active'
    });

    await SecurityService.logEvent(userId, "User", "device_change", "medium");
  },

  /**
   * محاسبه امتیاز ریسک بر اساس تاریخچه لاگ‌ها
   */
  calculateRiskLevel: async (userId: string): Promise<RiskLevel> => {
    const q = query(collection(db, "security_logs"), where("user_id", "==", userId), limit(20));
    const snapshot = await getDocs(q);
    
    if (snapshot.size < 3) return 'low';
    
    const logs = snapshot.docs.map(d => d.data() as SecurityLog);
    const highRiskEvents = logs.filter(l => l.risk_level === 'high' || l.event_type === 'suspicious_ip').length;
    
    if (highRiskEvents > 2) return 'high';
    if (snapshot.size > 10) return 'medium';
    
    return 'low';
  },

  /**
   * دریافت تمام لاگ‌ها برای ادمین
   */
  getSecurityLogs: async (): Promise<SecurityLog[]> => {
    const q = query(collection(db, "security_logs"), orderBy("timestamp", "desc"), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SecurityLog));
  }
};
