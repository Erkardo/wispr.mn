'use server';

import { getAdminDb } from '@/lib/admin-db';
import * as admin from 'firebase-admin';
import { sendPushNotification } from '@/lib/fcm';

export async function replyToComplimentAction(ownerId: string, complimentId: string, replyText: string): Promise<{ success: boolean; message: string }> {
    if (!ownerId || !complimentId || !replyText.trim()) {
        return { success: false, message: 'Мэдээлэл дутуу байна.' };
    }

    try {
        const db = getAdminDb();
        const complimentRef = db.collection('complimentOwners').doc(ownerId).collection('compliments').doc(complimentId);

        const complimentDoc = await complimentRef.get();
        if (!complimentDoc.exists) {
            return { success: false, message: 'Олдсонгүй.' };
        }

        const data = complimentDoc.data();
        const repliedAt = admin.firestore.FieldValue.serverTimestamp();

        // We only allow one reply. So we can just update the doc directly.
        await complimentRef.update({
            replyText: replyText.trim(),
            replyRead: false,
            repliedAt: repliedAt
        });

        // If the sender was logged in, notify them that a reply arrived
        if (data?.senderId) {
            const sentWisprRef = db.collection('complimentOwners').doc(data.senderId).collection('sentWisprs').doc(complimentId);
            await sentWisprRef.set({
                hasUnreadReply: true,
                repliedAt: repliedAt,
                // Make sure to preserve complimentId and receiverId if creating for some reason
                complimentId: complimentId,
                receiverId: ownerId
            }, { merge: true });

            const MYSTERIOUS_TEXTS = [
                "Хэн нэгэн таны үгийг уншаад хариу бичжээ 👀",
                "Таны хуудсанд зочилсон хүн үг үлдээжээ ✨",
                "Таны илгээсэн wispr-д хэн нэгэн хариу барьсан байна 💌",
                "Таны сэтгэлийн үг эзэндээ хүрч, хариугаа ирүүллээ 🕊️",
                "Хэн нэгэн тантай санал нийлж байх шиг байна шүү 🤔",
                "Таны үгэнд маш их баярласан хүн хариу бичжээ 💛",
                "Нууцхан харилцаа эхэлж байх шиг байна... Орж уншаарай 😉"
            ];
            const randomText = MYSTERIOUS_TEXTS[Math.floor(Math.random() * MYSTERIOUS_TEXTS.length)];
            await sendPushNotification(data.senderId, 'Шинэ хариу 💬', randomText, '/');
        }

        return { success: true, message: 'Хариуг амжилттай илгээлээ.' };
    } catch (error) {
        console.error('Хариу илгээхэд алдаа гарлаа:', error);
        return { success: false, message: 'Алдаа гарлаа, дахин оролдоно уу.' };
    }
}
