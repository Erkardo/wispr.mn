
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  limit,
  startAfter,
  getDoc,
  orderBy,
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { Confession, HintContext } from '@/types';

// Initialize Firebase for server-side usage
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Compliments

export async function addCompliment(ownerId: string, text: string, hintContext: HintContext): Promise<void> {
  const userComplimentsRef = collection(db, 'complimentOwners', ownerId, 'compliments');
  await addDoc(userComplimentsRef, {
    ownerId,
    text,
    createdAt: serverTimestamp(),
    reactions: {},
    isRead: false,
    hintContext,
  });
}

// Confessions

export async function addConfession(text: string, isHidden: boolean = false): Promise<void> {
  await addDoc(collection(db, 'confessions'), {
    text,
    createdAt: serverTimestamp(),
    reactionsCount: { '❤️': 0, '👍': 0, '😢': 0, '🔥': 0 },
    reportsCount: 0,
    isHidden: isHidden,
  });
}

export async function getConfessions(
  pageLimit: number = 10,
  lastVisible: any = null
) {
  const confessionsRef = collection(db, 'confessions');
  
  const constraints: any[] = [
      where('isHidden', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
  ];

  if (lastVisible) {
    constraints.push(startAfter(lastVisible));
  }

  const q = query(confessionsRef, ...constraints);
  
  const documentSnapshots = await getDocs(q);

  const confessions = documentSnapshots.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Confession));

  const newLastVisible =
    documentSnapshots.docs[documentSnapshots.docs.length - 1];

  return { confessions, lastVisible: newLastVisible };
}

export async function addReactionToConfession(confessionId: string, reaction: '❤️' | '👍' | '😢' | '🔥') {
  const confessionRef = doc(db, 'confessions', confessionId);
  const fieldToIncrement = `reactionsCount.${reaction}`;
  await updateDoc(confessionRef, {
    [fieldToIncrement]: increment(1),
  });
}

export async function reportConfession(confessionId: string) {
  const confessionRef = doc(db, 'confessions', confessionId);
  const docSnap = await getDoc(confessionRef);

  if (docSnap.exists()) {
    const currentReports = docSnap.data().reportsCount || 0;
    const updates: { reportsCount: any; isHidden?: boolean } = {
      reportsCount: increment(1),
    };
    if (currentReports + 1 >= 3) { // Auto-hide after 3 reports
      updates.isHidden = true;
    }
    await updateDoc(confessionRef, updates);
  }
}
