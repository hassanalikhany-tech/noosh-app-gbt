
import { collection, query, where, getDocs, doc, updateDoc, addDoc, writeBatch, orderBy, limit, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { CommissionLog, VisitorSettlement, VisitorProfile, VisitorFinancialInfo } from "../types";
import * as XLSX from 'xlsx';

const MIN_SETTLEMENT_AMOUNT = 500000; // ۵۰۰ هزار ریال

export const SettlementService = {
  /**
   * دریافت ویزیتورهایی که پورسانت پرداخت نشده دارند
   */
  getVisitorsReadyForSettlement: async () => {
    const q = query(collection(db, "commission_logs"), where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CommissionLog));

    const visitorGroups: Record<string, { total: number; logs: CommissionLog[] }> = {};
    logs.forEach(log => {
      if (!visitorGroups[log.visitor_id]) visitorGroups[log.visitor_id] = { total: 0, logs: [] };
      visitorGroups[log.visitor_id].total += log.amount;
      visitorGroups[log.visitor_id].logs.push(log);
    });

    const readyList = [];
    for (const vid in visitorGroups) {
      if (visitorGroups[vid].total >= MIN_SETTLEMENT_AMOUNT) {
        const uSnap = await getDoc(doc(db, "users", vid));
        const vSnap = await getDoc(doc(db, "visitor_profiles", vid));
        const fSnap = await getDoc(doc(db, "visitor_financial_info", vid));
        
        if (vSnap.exists() && vSnap.data().kyc_status === 'verified') {
           readyList.push({
             visitor_id: vid,
             fullName: uSnap.data()?.fullName || "نامعلوم",
             mobile: uSnap.data()?.mobileNumber || vid,
             totalAmount: visitorGroups[vid].total,
             logs: visitorGroups[vid].logs,
             financial: fSnap.exists() ? fSnap.data() as VisitorFinancialInfo : null
           });
        }
      }
    }
    return readyList;
  },

  /**
   * ایجاد رکورد تسویه و خروجی اکسل
   */
  createSettlementExcel: (data: any[]) => {
    const exportData = data.map(item => ({
      'نام ویزیتور': item.fullName,
      'شماره موبایل': item.mobile,
      'شماره شبا (IBAN)': item.financial?.iban || 'ثبت نشده',
      'مبلغ قابل پرداخت (ریال)': item.totalAmount,
      'کد معرفی': item.visitor_id,
      'تاریخ درخواست': new Intl.DateTimeFormat('fa-IR').format(new Date())
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Settlement_List");
    XLSX.writeFile(wb, `Noosh_Settlement_${Date.now()}.xlsx`);
  },

  /**
   * تایید نهایی تسویه پس از پرداخت بانکی
   */
  finalizeSettlement: async (visitorId: string, totalAmount: number, commissionIds: string[]) => {
    const batch = writeBatch(db);
    
    // ۱. آپدیت وضعیت تک تک پورسانت‌ها به paid
    commissionIds.forEach(id => {
      batch.update(doc(db, "commission_logs", id), { status: 'paid' });
    });

    // ۲. ثبت در گزارش تسویه‌ها
    const settlementRef = doc(collection(db, "visitor_settlements"));
    batch.set(settlementRef, {
      visitor_id: visitorId,
      total_amount: totalAmount,
      status: 'paid',
      created_at: Date.now(),
      paid_at: Date.now()
    });

    // ۳. آپدیت کل مبلغ پرداختی در پروفایل ویزیتور
    const vRef = doc(db, "visitor_profiles", visitorId);
    const vSnap = await getDoc(vRef);
    const currentPaid = vSnap.data()?.total_paid || 0;
    batch.update(vRef, { 
        total_paid: currentPaid + totalAmount,
        last_settlement_at: Date.now()
    });

    await batch.commit();
  },

  /**
   * دریافت آمارهای مالی کل
   */
  getFinancialSummary: async () => {
    const logsSnap = await getDocs(collection(db, "commission_logs"));
    const logs = logsSnap.docs.map(d => d.data() as CommissionLog);
    
    const summary = {
      total_commissions: 0,
      paid_commissions: 0,
      pending_commissions: 0,
      visitor_count: 0
    };

    logs.forEach(l => {
      summary.total_commissions += l.amount;
      if (l.status === 'paid') summary.paid_commissions += l.amount;
      if (l.status === 'pending') summary.pending_commissions += l.amount;
    });

    const vSnap = await getDocs(collection(db, "visitor_profiles"));
    summary.visitor_count = vSnap.size;

    return summary;
  }
};
