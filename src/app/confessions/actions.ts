'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addConfession, reportConfession as reportConfessionDb } from '@/lib/db';
import type { ReactionEmoji } from '@/types';
import { getAdminDb } from '@/lib/admin-db';
import { FieldValue } from 'firebase-admin/firestore';

export async function submitConfessionAction(text: string): Promise<{ success: boolean; message: string }> {
  if (!text.trim()) {
    return { success: false, message: 'Сэтгэлийн үгээ бичнэ үү.' };
  }

  try {
    // AI checking removed to save tokens. Accept all raw text.
    // We pass `isProfane: false` (secondary argument) since we are not checking anymore.
    await addConfession(text.trim(), false);
    revalidatePath('/confessions');

  } catch (error) {
    console.error('Error submitting confession:', error);
    return { success: false, message: 'Алдаа гарлаа. Дараа дахин оролдоно уу.' };
  }

  redirect('/confessions');
}


export async function reactToConfessionAction(confessionId: string, reaction: ReactionEmoji) {
  if (!confessionId || !reaction) return;
  try {
    const db = getAdminDb();
    const confessionRef = db.collection('confessions').doc(confessionId);

    // Use Admin SDK/FieldValue to bypass rules and update the nested map
    await confessionRef.update({
      [`reactionsCount.${reaction}`]: FieldValue.increment(1)
    });

    revalidatePath(`/confessions`);
  } catch (error) {
    console.error('Error adding reaction:', error);
  }
}

export async function reportConfessionAction(confessionId: string) {
  if (!confessionId) return;
  try {
    await reportConfessionDb(confessionId);
    revalidatePath(`/confessions`);
  } catch (error) {
    console.error('Error reporting confession:', error);
  }
}
