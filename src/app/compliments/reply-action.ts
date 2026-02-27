'use server';

import { getAdminDb } from '@/lib/admin-db';
import * as admin from 'firebase-admin';

export async function replyToComplimentAction(ownerId: string, complimentId: string, replyText: string): Promise<{ success: boolean; message: string }> {
    if (!ownerId || !complimentId || !replyText.trim()) {
        return { success: false, message: 'Мэдээлэл дутуу байна.' };
    }

    try {
        const db = getAdminDb();
        const complimentRef = db.collection('complimentOwners').doc(ownerId).collection('compliments').doc(complimentId);

        // We only allow one reply. So we can just update the doc directly.
        await complimentRef.update({
            replyText: replyText.trim(),
            replyRead: false,
            repliedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Хариуг амжилттай илгээлээ.' };
    } catch (error) {
        console.error('Хариу илгээхэд алдаа гарлаа:', error);
        return { success: false, message: 'Алдаа гарлаа, дахин оролдоно уу.' };
    }
}
