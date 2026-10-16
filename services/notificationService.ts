import { GuestService } from './guestService';
import { Notification } from '../types';

const KEY = 'noosh_local_notifications_v1';
const readAll = (): Notification[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
const saveAll = (items: Notification[]) => localStorage.setItem(KEY, JSON.stringify(items));

export const NotificationService = {
  createNotification: async (title: string, message: string, targetGroup: 'all' | 'active' | 'visitors' | 'specific', adminId: string, targetUids?: string[]) => {
    const notification: Notification = {
      id: `local-${Date.now()}`,
      title,
      message,
      target_group: targetGroup,
      target_uids: targetGroup === 'specific' ? (targetUids || []) : [],
      send_time: Date.now(),
      status: 'sent',
      created_by: adminId,
    };
    saveAll([notification, ...readAll()]);
    return notification;
  },
  getAllNotifications: async (): Promise<Notification[]> => readAll(),
  getUserNotifications: async (userId: string, role: string, isActive: boolean): Promise<Notification[]> => readAll().filter(item => {
    if (item.target_group === 'specific') return item.target_uids?.includes(userId) || false;
    if (item.target_group === 'all') return true;
    if (item.target_group === 'active') return isActive;
    return item.target_group === 'visitors' && role === 'visitor';
  }),
  logDelivery: async () => undefined,
  markAsRead: async (_userId: string, notificationId: string) => {
    const user = GuestService.get();
    GuestService.save({ readNotificationIds: [...new Set([...(user.readNotificationIds || []), notificationId])] });
  },
  deleteNotificationForUser: async (_userId: string, notificationId: string) => {
    const user = GuestService.get();
    GuestService.save({ deletedNotificationIds: [...new Set([...(user.deletedNotificationIds || []), notificationId])] });
  },
};
