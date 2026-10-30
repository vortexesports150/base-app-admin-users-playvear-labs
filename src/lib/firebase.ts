import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with database ID and stability settings for proxied environments
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Info:', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Safely fetches a document, trying server first and falling back to cache if offline
 */
export async function safeGetDoc(docRef: any) {
  try {
    return await getDocFromServer(docRef);
  } catch (serverErr) {
    try {
      return await getDoc(docRef);
    } catch {
      throw serverErr;
    }
  }
}

// Custom connection validation as specified in SKILL.md
export async function testFirestoreConnection() {
  try {
    await safeGetDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.info('Firestore initial offline check notice: client is operating in offline mode.');
    }
  }
}

testFirestoreConnection();

/**
 * Perform Google Authentication with Firebase Auth
 */
export async function signInWithGoogleFirebase(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    if (user) {
      // Create or update user profile document in Firestore
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || '',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      // Check if credits exists, if not, initialize with 0.00
      const userDoc = await safeGetDoc(doc(db, 'users', user.uid));
      const userData = (userDoc.data() as any) || {};
      if (!userDoc.exists() || userData.credits === undefined) {
        await setDoc(doc(db, 'users', user.uid), { credits: 0.00 }, { merge: true });
      }
    }
    return user;
  } catch (error: any) {
    // Handle popup closed or cancelled gracefully without throwing
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      console.info('Google Sign-In popup closed by user.');
      return null;
    }
    console.warn('Firebase Google Sign In Error:', error);
    return null;
  }
}

/**
 * Sign out from Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  return await firebaseSignOut(auth);
}

export interface UserVoiceCloneRecord {
  id: string;
  name: string;
  description?: string;
  category?: string;
  userId: string;
  userEmail?: string;
  createdAt: string;
  isPaidCloned: boolean;
  isV4: boolean;
}

/**
 * Save user cloned voice to Firestore (Strictly user-scoped)
 */
export async function saveUserClonedVoice(
  userId: string,
  userEmail: string,
  voice: { id: string; name: string; description?: string; category?: string }
): Promise<void> {
  if (!userId || !voice.id) return;
  const cloneRef = doc(db, 'voice_clones', voice.id);
  await setDoc(cloneRef, {
    id: voice.id,
    name: voice.name,
    description: voice.description || 'Cartesia V4 Paid Cloned Character',
    category: voice.category || 'news_anchor',
    userId,
    userEmail: userEmail || '',
    createdAt: new Date().toISOString(),
    isPaidCloned: true,
    isV4: true,
  });
}

/**
 * Delete user cloned voice from Firestore
 */
export async function deleteUserClonedVoice(voiceId: string): Promise<void> {
  if (!voiceId) return;
  const cloneRef = doc(db, 'voice_clones', voiceId);
  await deleteDoc(cloneRef);
}

/**
 * Real-time listener for user's personal cloned voices
 */
export function subscribeUserClonedVoices(
  userId: string,
  onUpdate: (voices: UserVoiceCloneRecord[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'voice_clones'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const voices: UserVoiceCloneRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        voices.push({
          id: data.id || d.id,
          name: data.name || 'Cloned Voice',
          description: data.description || '',
          category: data.category || 'news_anchor',
          userId: data.userId,
          userEmail: data.userEmail,
          createdAt: data.createdAt || new Date().toISOString(),
          isPaidCloned: true,
          isV4: true,
        });
      });
      // Sort newest first
      voices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(voices);
    },
    (err) => {
      console.warn('Error subscribing to user cloned voices:', err);
    }
  );
}
// Note: Daily usage limits are currently based on request counts, not duration.
// The duration limits are managed in the client UI for voice generation.
// V2 limit: 5 requests per day, max 60 seconds each.
// V3 limit: 1 request per day, max 30 seconds each.

export async function checkUserV2Limit(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await safeGetDoc(userDocRef);
    if (userSnap.exists()) {
      const data = (userSnap.data() as any) || {};
      const v2Usage = data.v2Usage || {};
      const todayCount = v2Usage[todayStr] || 0;
      return todayCount >= 5; // Keeping count limit at 5 per day
    }
  } catch (e) {
    console.warn('Firestore user V2 limit check warning:', e);
  }
  return false;
}

/**
 * Increment user Model V2 daily usage count in Firestore
 */
export async function incrementUserV2Limit(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await safeGetDoc(userDocRef);
    let v2Usage: Record<string, number> = {};
    if (userSnap.exists()) {
      const data = (userSnap.data() as any) || {};
      v2Usage = data.v2Usage || {};
    }
    const currentCount = v2Usage[todayStr] || 0;
    v2Usage[todayStr] = currentCount + 1;

    await setDoc(userDocRef, { v2Usage }, { merge: true });
  } catch (e) {
    console.warn('Firestore user V2 limit increment warning:', e);
  }
}

/**
 * Check if user has exceeded Model V3 daily limit (1 per day) via Firestore
 */
export async function checkUserV3Limit(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await safeGetDoc(userDocRef);
    if (userSnap.exists()) {
      const data = (userSnap.data() as any) || {};
      const v3Usage = data.v3Usage || {};
      const todayCount = v3Usage[todayStr] || 0;
      return todayCount >= 1; // Keeping count limit at 1 per day
    }
  } catch (e) {
    console.warn('Firestore user V3 limit check warning:', e);
  }
  return false;
}

/**
 * Increment user Model V3 daily usage count in Firestore
 */
export async function incrementUserV3Limit(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await safeGetDoc(userDocRef);
    let v3Usage: Record<string, number> = {};
    if (userSnap.exists()) {
      const data = (userSnap.data() as any) || {};
      v3Usage = data.v3Usage || {};
    }
    const currentCount = v3Usage[todayStr] || 0;
    v3Usage[todayStr] = currentCount + 1;

    await setDoc(userDocRef, { v3Usage }, { merge: true });
  } catch (e) {
    console.warn('Firestore user V3 limit increment warning:', e);
  }
}

/**
 * Deduct credits from user account
 */
export async function deductUserCredits(userId: string, amount: number): Promise<boolean> {
  if (!userId || amount <= 0) return false;
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await safeGetDoc(userRef);
    if (userSnap.exists()) {
      const data = (userSnap.data() as any) || {};
      const currentCredits = data.credits || 0;
      if (currentCredits < amount) return false;
      await setDoc(userRef, { credits: Math.max(0, currentCredits - amount) }, { merge: true });
      return true;
    }
  } catch (e) {
    console.warn('Deduct credits error:', e);
  }
  return false;
}

/**
 * Fetch global pricing settings
 */
export async function getPricingSettings(): Promise<{ heygenRate: number; v4CharRate: number }> {
  try {
    const pricingRef = doc(db, 'settings', 'pricing');
    const snap = await safeGetDoc(pricingRef);
    if (snap.exists()) {
      const data = (snap.data() as any) || {};
      const hRate = typeof data.heygenRate === 'number' && data.heygenRate > 0 && data.heygenRate < 50 ? data.heygenRate : 2.64;
      const vRate = typeof data.v4CharRate === 'number' && data.v4CharRate > 0 && data.v4CharRate < 100 ? data.v4CharRate : 7.2;
      return {
        heygenRate: hRate,
        v4CharRate: vRate
      };
    }
  } catch (e) {
    console.warn('Get pricing error:', e);
  }
  return { heygenRate: 2.64, v4CharRate: 7.2 };
}

export interface GenerationHistoryRecord {
  id: string;
  type: 'voice' | 'video';
  model: string;
  userId: string;
  userEmail: string;
  chars?: number;
  duration?: number;
  cost: number;
  charge: number;
  profit: number;
  isPaid: boolean;
  createdAt: string;
  status: 'completed' | 'failed';
}

/**
 * Save generation history with cost/profit details
 */
export async function saveGenerationHistory(record: Omit<GenerationHistoryRecord, 'createdAt'>): Promise<void> {
  try {
    const historyRef = doc(collection(db, 'generation_history'));
    await setDoc(historyRef, {
      ...record,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Save generation history error:', e);
  }
}
