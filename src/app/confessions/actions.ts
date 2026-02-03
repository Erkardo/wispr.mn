'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { filterConfession } from '@/ai/flows/filter-confessions-for-profanity-and-abuse';
import { addConfession, addReactionToConfession, reportConfession as reportConfessionDb } from '@/lib/db';
import type { ReactionEmoji } from '@/types';

export async function submitConfessionAction(text: string): Promise<{ success: boolean; message: string }> {
  if (!text.trim()) {
    return { success: false, message: 'Сэтгэлийн үгээ бичнэ үү.' };
  }

  try {
    const { isSafe, filteredText } = await filterConfession({ text });

    // Per user request, even if not safe, save the filtered version
    if (!filteredText) {
      return { success: false, message: 'Үгээ шалгаад дахин оролдоно уу.' };
    }

    await addConfession(filteredText, !isSafe);
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
        await addReactionToConfession(confessionId, reaction);
        revalidatePath(`/confessions`);
    } catch (error) {
        console.error('Error adding reaction:', error);
        // Handle error silently on the server
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
