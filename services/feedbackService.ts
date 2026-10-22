import { UserFeedback, FeedbackCategory } from '../types';

const endpoint = '/.netlify/functions/feedback';

async function request<T>(method: 'GET' | 'POST' | 'PUT', body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(endpoint, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'ارسال یا دریافت بازخورد انجام نشد.');
  return data as T;
}

export const FeedbackService = {
  submitFeedback: async (userName: string, category: FeedbackCategory, message: string) => {
    return request<{ success: true; id: string }>('POST', { userName, category, message });
  },
  getAllFeedback: async (): Promise<UserFeedback[]> => {
    const data = await request<{ feedback: UserFeedback[] }>('GET');
    return data.feedback;
  },
  updateFeedbackStatus: async (feedbackId: string, status: UserFeedback['status'], extraFields: Partial<UserFeedback> = {}) => {
    await request<{ success: true }>('PUT', {
      id: feedbackId,
      status,
      ...(extraFields.assigned_to_name ? { assigned_to_name: extraFields.assigned_to_name } : {}),
      ...(extraFields.assigned_at ? { assigned_at: extraFields.assigned_at } : {}),
    });
  },
};
