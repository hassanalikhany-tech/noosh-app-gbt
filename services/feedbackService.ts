
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { UserFeedback, FeedbackCategory } from "../types";

export const FeedbackService = {
  /**
   * Submit feedback using the exact same simple logic as NotificationService
   */
  submitFeedback: async (userId: string, userName: string, mobile: string, category: FeedbackCategory, message: string) => {
    const feedback = {
      user_id: userId,
      user_name: userName,
      user_mobile: mobile,
      category: category,
      message: message,
      status: 'new',
      created_at: Date.now(),
      device: navigator.userAgent
    };
    
    // Using simple addDoc just like notifications
    const docRef = await addDoc(collection(db, "user_feedback"), feedback);
    return { id: docRef.id, ...feedback };
  },

  /**
   * Get all feedback for admin
   */
  getAllFeedback: async (): Promise<UserFeedback[]> => {
    const q = query(collection(db, "user_feedback"), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserFeedback));
  },

  /**
   * Update feedback status and optional fields
   */
  updateFeedbackStatus: async (feedbackId: string, status: UserFeedback['status'], extraFields: Partial<UserFeedback> = {}) => {
    const ref = doc(db, "user_feedback", feedbackId);
    await updateDoc(ref, { status, ...extraFields });
  }
};
