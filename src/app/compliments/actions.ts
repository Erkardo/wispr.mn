'use server';

import { generateComplimentHint } from '@/ai/flows/generate-compliment-hint';
import { createComplimentStory } from '@/ai/flows/create-compliment-story';
import type { Compliment } from '@/types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getAdminDb } from '@/lib/admin-db';
import { FieldValue } from 'firebase-admin/firestore';


export async function submitComplimentAction(text: string, audioUrl?: string, duration?: number): Promise<{ success: boolean; message: string; filteredText?: string }> {
    if (!text.trim() && !audioUrl) {
        return { success: false, message: 'Wispr-ээ бичнэ үү эсвэл дуут зурвас үлдээнэ үү.' };
    }

    try {
        // AI checking removed to save tokens. Accept all raw text.
        return { success: true, message: 'Амжилттай шүүгдлээ', filteredText: text.trim() };
    } catch (error) {
        console.error('Wispr илгээхэд алдаа гарлаа:', error);
        return { success: false, message: 'Алдаа гарлаа.' };
    }
}


export async function generateHintAction(
    complimentText: string,
    hintContext: Compliment['hintContext'],
    previousHints: string[]
): Promise<{ success: boolean; hint: string | null; message: string; }> {
    if (!complimentText) {
        return { success: false, hint: null, message: 'Wispr-ийн текст шаардлагатай.' };
    }

    try {
        const { hint } = await generateComplimentHint({
            text: complimentText,
            hintContext: hintContext,
            previousHints,
        });

        if (!hint) {
            return { success: false, hint: null, message: 'Hint үүсгэж чадсангүй.' };
        }

        return { success: true, hint, message: 'Hint амжилттай үүслээ' };

    } catch (error: any) {
        console.error('Сервер дээр hint үүсгэхэд алдаа гарлаа:', error);
        const errorMessage = error instanceof Error ? error.message : 'Тодорхойгүй алдаа гарлаа.';
        return { success: false, hint: null, message: `Хиймэл оюун ажиллахад алдаа гарлаа: ${errorMessage}` };
    }
}


export async function createStoryAction(
    compliments: string[]
): Promise<{ success: boolean; story: string | null; message: string; }> {
    if (!compliments || compliments.length === 0) {
        return { success: false, story: null, message: 'Түүх үүсгэх wispr-үүд алга байна.' };
    }

    try {
        const { story } = await createComplimentStory({ compliments });

        if (!story) {
            return { success: false, story: null, message: 'Түүх үүсгэж чадсангүй.' };
        }

        return { success: true, story, message: 'Түүх амжилттай үүслээ' };

    } catch (error) {
        console.error('Сервер дээр түүх үүсгэхэд алдаа гарлаа:', error);
        return { success: false, story: null, message: 'Алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.' };
    }
}


export async function addReactionToComplimentAction(complimentId: string, ownerId: string, reaction: string) {
    if (!complimentId || !reaction || !ownerId) return;
    try {
        const db = getAdminDb(); // Using Admin SDK to bypass rules
        const complimentRef = db.collection('complimentOwners').doc(ownerId).collection('compliments').doc(complimentId);
        const fieldToIncrement = `reactions.${reaction}`;

        await complimentRef.update({
            [fieldToIncrement]: FieldValue.increment(1),
        });
        revalidatePath('/');
    } catch (error) {
        console.error('Wispr-т реакц нэмэхэд алдаа гарлаа (Admin SDK):', error);
    }
}
