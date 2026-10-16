import { UserFeedback, FeedbackCategory } from '../types';

const KEY = 'noosh_local_feedback_v1';
const readAll = (): UserFeedback[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
const saveAll = (items: UserFeedback[]) => localStorage.setItem(KEY, JSON.stringify(items));

export const FeedbackService = {
  submitFeedback: async (userId: string, userName: string, mobile: string, category: FeedbackCategory, message: string) => {
    const feedback: UserFeedback = {
      id: `local-${Date.now()}`,
      user_id: userId,
      user_name: userName,
      user_mobile: mobile,
      category,
      message,
      status: 'new',
      created_at: Date.now(),
      device: navigator.userAgent,
    };
    saveAll([feedback, ...readAll()]);
    return feedback;
  },
  getAllFeedback: async (): Promise<UserFeedback[]> => readAll(),
  updateFeedbackStatus: async (feedbackId: string, status: UserFeedback['status'], extraFields: Partial<UserFeedback> = {}) => {
    saveAll(readAll().map(item => item.id === feedbackId ? { ...item, ...extraFields, status } : item));
  },
};
