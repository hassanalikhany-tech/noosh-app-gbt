
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAja246w3aHwF3HtHbkEJv6FzkXiZQeQFM",
  authDomain: "nooshapp-97b0wj.firebaseapp.com",
  projectId: "nooshapp-97b0wj",
  storageBucket: "nooshapp-97b0wj.firebasestorage.app",
  messagingSenderId: "777764892284",
  appId: "1:777764892284:web:754b85880ecb6f4d13e3f9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// پس از یک بار تأیید پیامکی، ورود تا زمان خروج صریح کاربر حفظ می‌شود.
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence);

// فعال‌سازی کش آفلاین دائمی چندتبی برای حل خطای عدم اتصال به فایربیس و افزایش سرعت بالا
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
