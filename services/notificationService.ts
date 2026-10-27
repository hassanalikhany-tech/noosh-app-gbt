import { Notification } from '../types';
import { GuestService } from './guestService';
import { publicFunctionUrl } from './publicFunctionUrl';

const endpoint = publicFunctionUrl('notifications');

async function request<T>(url: string, method = 'GET', body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'ارتباط با مرکز اعلان انجام نشد.');
  return data as T;
}

export const NotificationService = {
  createNotification: async (title: string, message: string, targetGroup: 'all' | 'active' | 'visitors' | 'specific', _adminId: string, _targetUids?: string[], sourceFeedbackId?: string) => {
    if (targetGroup !== 'all') throw new Error('در نسخهٔ فعلی فقط اعلان عمومی برای همهٔ کاربران قابل ارسال است.');
    const result = await request<{ notification: Notification }>(endpoint, 'POST', { title, message, targetGroup, sourceFeedbackId });
    return result.notification;
  },
  getAllNotifications: async (): Promise<Notification[]> => {
    const data = await request<{ notifications: Notification[] }>(publicFunctionUrl('notifications', '?scope=admin'));
    return data.notifications;
  },
  getUserNotifications: async (_userId: string, _role: string, _isActive: boolean): Promise<Notification[]> => {
    const data = await request<{ notifications: Notification[] }>(endpoint);
    return data.notifications;
  },
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
