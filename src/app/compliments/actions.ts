'use server';

import { generateComplimentHint } from '@/ai/flows/generate-compliment-hint';
import { createComplimentStory } from '@/ai/flows/create-compliment-story';
import type { Compliment } from '@/types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getAdminDb } from '@/lib/admin-db';
import { FieldValue } from 'firebase-admin/firestore';
import { sendPushNotification } from '@/lib/fcm';


export async function submitComplimentAction(text: string, audioUrl?: string, duration?: number): Promise<{ success: boolean; message: string; filteredText?: string }> {
    const trimmed = text?.trim();

    if (!trimmed && !audioUrl) {
        return { success: false, message: 'Wispr-ээ бичнэ үү эсвэл дуут зурвас үлдээнэ үү.' };
    }

    if (trimmed && trimmed.length > 500) {
        return { success: false, message: 'Wispr хэт урт байна. 500 тэмдэгтэд багтааж бичнэ үү.' };
    }

    // Basic spam guard: reject if the message is just repeated characters
    if (trimmed && trimmed.length > 3) {
        const uniqueChars = new Set(trimmed.replace(/\s/g, '')).size;
        if (uniqueChars < 2) {
            return { success: false, message: 'Жинхэнэ сэтгэлийн үгээ бичнэ үү 💛' };
        }
    }

    try {
        return { success: true, message: 'Амжилттай', filteredText: trimmed };
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

export async function reportComplimentAction(ownerId: string, complimentId: string) {
    if (!ownerId || !complimentId) return { success: false, message: 'Шаардлагатай мэдээлэл дутуу байна.' };

    try {
        const db = getAdminDb();
        const complimentRef = db.collection('complimentOwners').doc(ownerId).collection('compliments').doc(complimentId);

        await complimentRef.update({
            reportsCount: FieldValue.increment(1),
            isFlagged: true,
            flaggedAt: FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Report амжилттай илгээгдлээ. Бид шалгах болно.' };
    } catch (error) {
        console.error('Report илгээхэд алдаа гарлаа:', error);
        return { success: false, message: 'Алдаа гарлаа. Дахин оролдоно уу.' };
    }
}

export async function notifyNewWisprAction(ownerId: string, senderOS?: string, complimentId?: string) {
    if (!ownerId) return;

    // Curiosity Gap messages
    let title = 'Шинэ Wispr 🎁';
    let body = 'Хэн байж болох вэ? Орж уншаарай 🕵️';

    const MYSTERIOUS_TEXTS = [
        "Хэн нэгэн чамд нууц үг үлдээлээ 👀",
        "Таны хуудсанд зочилсон хүн үг үлдээжээ ✨",
        "Чамд ирсэн шинэ wispr байна 🤫",
        "Чамайг бодож суугаа нэгэн байна даа...",
        "Хэн нэгний сэтгэлийг хөдөлгөсөн бололтой 💕",
        "Таны тухай нэгэн зүйл бичжээ 📝",
        "Нууцхан хүндэлдэг нэгэн байна шүү 🌟"
    ];

    if (senderOS) {
        if (senderOS.toLowerCase().includes('ios') || senderOS.toLowerCase().includes('iphone')) {
            body = 'Нэг iPhone-той хэрэглэгч танд сонирхолтой Wispr үлдээжээ 🤫';
        } else if (senderOS.toLowerCase().includes('android')) {
            body = 'Нэг Android-той хэрэглэгч танд нууц Wispr илгээлээ 🤖';
        } else {
            body = MYSTERIOUS_TEXTS[Math.floor(Math.random() * MYSTERIOUS_TEXTS.length)];
        }
    } else {
        body = MYSTERIOUS_TEXTS[Math.floor(Math.random() * MYSTERIOUS_TEXTS.length)];
    }

    const clickUrl = complimentId ? `/?tab=received&complimentId=${complimentId}` : '/?tab=received';

    await sendPushNotification(
        ownerId,
        title,
        body,
        clickUrl
    );
}
