'use server';

import { filterCompliment } from '@/ai/flows/filter-compliments-for-positive-language';
import { generateComplimentHint } from '@/ai/flows/generate-compliment-hint';
import { createComplimentStory } from '@/ai/flows/create-compliment-story';
import type { Compliment } from '@/types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';


export async function submitComplimentAction(text: string, audioUrl?: string, duration?: number): Promise<{ success: boolean; message: string; filteredText?: string }> {
    if (!text.trim() && !audioUrl) {
        return { success: false, message: 'Wispr-ээ бичнэ үү эсвэл дуут зурвас үлдээнэ үү.' };
    }

    try {
        let isSafe = true;
        let filteredText = text;

        if (text.trim()) {
            const result = await filterCompliment({ text });
            isSafe = result.isSafe;
            filteredText = result.filteredText;
        }

        if (!isSafe) {
            return { success: false, message: 'Зохисгүй агуулга илэрлээ.' };
        }

        return { success: true, message: 'Амжилттай шүүгдлээ', filteredText };
    } catch (error) {
        console.error('Wispr шүүхэд алдаа гарлаа:', error);
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
        const complimentRef = doc(db, 'complimentOwners', ownerId, 'compliments', complimentId);
        const fieldToIncrement = `reactions.${reaction}`;
        await updateDoc(complimentRef, {
            [fieldToIncrement]: increment(1),
        });
        revalidatePath('/');
    } catch (error) {
        console.error('Wispr-т реакц нэмэхэд алдаа гарлаа:', error);
    }
}
