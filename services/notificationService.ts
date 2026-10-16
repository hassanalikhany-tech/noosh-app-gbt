
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, writeBatch, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { Notification, NotificationLog } from "../types";

export const NotificationService = {
  /**
   * Create a new notification for a target group or specific users
   */
  createNotification: async (title: string, message: string, targetGroup: 'all' | 'active' | 'visitors' | 'specific', adminId: string, targetUids?: string[]) => {
    const notification: Omit<Notification, 'id'> = {
      title,
      message,
      target_group: targetGroup,
      target_uids: targetGroup === 'specific' ? (targetUids || []) : [],
      send_time: Date.now(),
      status: 'sent',
      created_by: adminId
    };
    const docRef = await addDoc(collection(db, "notifications"), notification);
    return { id: docRef.id, ...notification };
  },

  /**
   * Get all notifications for admin
   */
  getAllNotifications: async (): Promise<Notification[]> => {
    const q = query(collection(db, "notifications"), orderBy("send_time", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
  },

  /**
   * Get notifications for a user based on their role, activity and UID list
   */
  getUserNotifications: async (userId: string, role: string, isActive: boolean): Promise<Notification[]> => {
    if (userId === "local-guest") return [];
    const q = query(collection(db, "notifications"), orderBy("send_time", "desc"));
    const snap = await getDocs(q);
    const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));

    // Filter by target group and target UIDs array
    return allNotifs.filter(n => {
      if (n.target_group === 'specific') {
        return n.target_uids && Array.isArray(n.target_uids) && n.target_uids.includes(userId);
      }
      if (n.target_group === 'all') return true;
      if (n.target_group === 'active' && isActive) return true;
      if (n.target_group === 'visitors' && role === 'visitor') return true;
      return false;
    });
  },

  /**
   * Log that a notification was delivered/seen
   */
  logDelivery: async (userId: string, notificationId: string) => {
    await addDoc(collection(db, "notification_logs"), {
      user_id: userId,
      notification_id: notificationId,
      delivered: true,
      clicked: true,
      timestamp: Date.now()
    });
  },

  /**
   * Mark a notification as read for a user
   */
  markAsRead: async (userId: string, notificationId: string) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      readNotificationIds: arrayUnion(notificationId)
    });
    window.dispatchEvent(new CustomEvent('user-data-updated'));
  },

  /**
   * Delete a notification for a user (hide it permanently)
   */
  deleteNotificationForUser: async (userId: string, notificationId: string) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      deletedNotificationIds: arrayUnion(notificationId)
    });
    window.dispatchEvent(new CustomEvent('user-data-updated'));
  }
};
