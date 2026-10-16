import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { RecaptchaVerifier, signInAnonymously, signInWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { auth, authPersistenceReady, db } from './firebase';
import { AuthUser } from '../types';
import { DB } from '../utils/db';
import { getPhoneUserDocumentIds, normalizePhoneNumber } from '../utils/phoneNumbers';
import { getFirebaseAuthErrorCode, getFirebaseAuthErrorMessage } from '../utils/firebaseAuthErrors';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let pendingConfirmation: ConfirmationResult | null = null;
let pendingPhoneNumber: string | null = null;

const generateSessionId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const findUserRecord = async (phoneNumber: string) => {
  for (const id of getPhoneUserDocumentIds(phoneNumber)) {
    const reference = doc(db, 'users', id);
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) return { reference, snapshot };
  }
  return null;
};

const completePhoneLogin = async (
  phoneNumber: string,
  registerData?: { firstName: string; lastName: string; referralCode?: string }
): Promise<{ success: boolean; user?: AuthUser; message?: string; needsRegistration?: boolean }> => {
  try {
    const existing = await findUserRecord(phoneNumber);
    if (!existing && !registerData) return { success: true, needsRegistration: true };

    const now = Date.now();
    const deviceId = navigator.userAgent;
    let userData: AuthUser;
    let userId: string;

    if (existing) {
      const data = existing.snapshot.data();
      if (data.isBlocked) return { success: false, message: 'حساب کاربری شما مسدود شده است.' };
      userId = existing.reference.id;
      userData = {
        ...data,
        uid: userId,
        mobileNumber: data.mobileNumber || phoneNumber,
        sessionId: generateSessionId(),
        lastLogin: now,
        deviceId
      } as AuthUser;
      await updateDoc(existing.reference, {
        sessionId: userData.sessionId,
        lastLogin: now,
        deviceId,
        phoneE164: phoneNumber,
        mobileNumber: data.mobileNumber || phoneNumber
      });
    } else {
      if (!registerData) return { success: true, needsRegistration: true };

      let referredBy = '';
      if (registerData.referralCode) {
        const visitorQuery = query(collection(db, 'visitor_profiles'), where('referral_code', '==', registerData.referralCode.toUpperCase()));
        const visitorSnapshot = await getDocs(visitorQuery);
        if (!visitorSnapshot.empty) {
          const visitorId = visitorSnapshot.docs[0].data().user_id;
          if (visitorId !== phoneNumber) referredBy = visitorId;
        }
      }

      userId = getPhoneUserDocumentIds(phoneNumber)[0];
      userData = {
        uid: userId,
        mobileNumber: userId,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        createdAt: now,
        lastLogin: now,
        sessionId: generateSessionId(),
        deviceId,
        isActive: true,
        isBlocked: false,
        role: 'user',
        referredBy
      };
      await setDoc(doc(db, 'users', userId), {
        ...userData,
        phoneE164: phoneNumber,
        fullName: `${registerData.firstName} ${registerData.lastName}`,
        username: userId,
        subscriptionExpiry: now + 365 * 24 * 60 * 60 * 1000,
        isApproved: true,
        familySize: 4,
        kitchenMode: 'with-inventory'
      });
    }

    await DB.put('users', userData).catch(() => {});
    localStorage.setItem('noosh_auth_session', userData.sessionId);
    localStorage.setItem('noosh_auth_mobile', userId);
    pendingConfirmation = null;
    pendingPhoneNumber = null;
    return { success: true, user: userData };
  } catch (error) {
    console.error('Phone authentication profile error:', error);
    return { success: false, message: 'کد تأیید شد، اما بارگذاری حساب کامل نشد. اتصال Firebase و دسترسی دیتابیس را بررسی کنید.' };
  }
};

export const AuthService = {
  normalizePhoneNumber,

  checkUserExists: async (mobile: string): Promise<{ exists: boolean; firstName?: string; lastName?: string }> => {
    const phoneNumber = normalizePhoneNumber(mobile);
    if (!phoneNumber) return { exists: false };
    try {
      const userRecord = await findUserRecord(phoneNumber);
      if (!userRecord) return { exists: false };
      const data = userRecord.snapshot.data();
      return { exists: true, firstName: data.firstName, lastName: data.lastName };
    } catch {
      return { exists: false };
    }
  },

  sendOtp: async (mobile: string): Promise<{ success: boolean; message: string }> => {
    const phoneNumber = normalizePhoneNumber(mobile);
    if (!phoneNumber) return { success: false, message: 'شماره را با کد کشور وارد کنید؛ مثلاً ‎+1، ‎+44، ‎+61 یا شمارهٔ ایران با 09.' };
    try {
      await authPersistenceReady;
      if (!document.getElementById('recaptcha-container')) {
        return { success: false, message: 'صفحهٔ تأیید امنیتی آماده نیست؛ صفحه را تازه کنید و دوباره تلاش کنید.' };
      }
      auth.languageCode = 'fa';
      recaptchaVerifier ??= new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      pendingConfirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      pendingPhoneNumber = phoneNumber;
      return { success: true, message: `کد ۶ رقمی برای ${phoneNumber} پیامک شد.` };
    } catch (error) {
      console.error('Firebase phone sign-in request failed', {
        code: getFirebaseAuthErrorCode(error),
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
      });
      recaptchaVerifier?.clear();
      recaptchaVerifier = null;
      pendingConfirmation = null;
      pendingPhoneNumber = null;
      return { success: false, message: getFirebaseAuthErrorMessage(error) };
    }
  },

  verifyOtp: async (mobile: string, code: string): Promise<{ success: boolean; user?: AuthUser; message?: string; needsRegistration?: boolean }> => {
    const phoneNumber = normalizePhoneNumber(mobile);
    if (!phoneNumber || !pendingConfirmation || pendingPhoneNumber !== phoneNumber) {
      return { success: false, message: 'درخواست کد منقضی شده است؛ کد تازه بگیرید.' };
    }
    try {
      await authPersistenceReady;
      await pendingConfirmation.confirm(code);
      pendingConfirmation = null;
      pendingPhoneNumber = null;
      return await completePhoneLogin(phoneNumber);
    } catch (error) {
      const codeValue = getFirebaseAuthErrorCode(error);
      console.error('Firebase phone sign-in verification failed', { code: codeValue });
      if (codeValue === 'auth/code-expired' || codeValue === 'auth/session-expired') {
        pendingConfirmation = null;
        pendingPhoneNumber = null;
      }
      return { success: false, message: getFirebaseAuthErrorMessage(error) };
    }
  },

  completeRegistration: async (mobile: string, registerData: { firstName: string; lastName: string; referralCode?: string }) => {
    const phoneNumber = normalizePhoneNumber(mobile);
    try {
      await authPersistenceReady;
      await auth.authStateReady();
      const signedInPhone = normalizePhoneNumber(auth.currentUser?.phoneNumber || '');
      if (!phoneNumber || signedInPhone !== phoneNumber) {
        return { success: false, message: 'نشست تأیید شماره معتبر نیست؛ شماره را دوباره تأیید کنید.' };
      }
      return await completePhoneLogin(phoneNumber, registerData);
    } catch (error) {
      console.error('Firebase phone account registration failed', { code: getFirebaseAuthErrorCode(error) });
      return { success: false, message: getFirebaseAuthErrorMessage(error) };
    }
  },

  clearPhoneVerification: () => {
    pendingConfirmation = null;
    pendingPhoneNumber = null;
    recaptchaVerifier?.clear();
    recaptchaVerifier = null;
  },

  checkSession: async (): Promise<{ isValid: boolean; user?: AuthUser }> => {
    const mobile = localStorage.getItem('noosh_auth_mobile');
    const localSession = localStorage.getItem('noosh_auth_session');
    if (!mobile || !localSession) return { isValid: false };

    try {
      await authPersistenceReady;
      await auth.authStateReady();
      const signedInPhone = normalizePhoneNumber(auth.currentUser?.phoneNumber || '');
      if (signedInPhone && !getPhoneUserDocumentIds(signedInPhone).includes(mobile)) return { isValid: false };

      const localUser = await DB.get('users', mobile).catch(() => null);
      if (localUser && localUser.sessionId === localSession) return { isValid: true, user: localUser };

      if (!auth.currentUser) await signInAnonymously(auth);

      const userRecord = await findUserRecordFromId(mobile);
      if (userRecord) {
        const userData = userRecord;
        await DB.put('users', userData).catch(() => {});
        return { isValid: userData.sessionId === localSession, user: userData.sessionId === localSession ? userData : undefined };
      }

      return { isValid: false };
    } catch {
      const localUser = await DB.get('users', mobile).catch(() => null);
      return localUser?.sessionId === localSession ? { isValid: true, user: localUser } : { isValid: false };
    }
  },

  logout: async () => {
    localStorage.removeItem('noosh_auth_session');
    localStorage.removeItem('noosh_auth_mobile');
    AuthService.clearPhoneVerification();
    await auth.signOut();
  }
};

async function findUserRecordFromId(userId: string): Promise<AuthUser | null> {
  const reference = doc(db, 'users', userId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) return null;
  return { ...snapshot.data(), uid: userId } as AuthUser;
}
