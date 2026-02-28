import { getAdminDb } from './admin-db';
import * as admin from 'firebase-admin';

export async function sendPushNotification(
    userId: string,
    title: string,
    body: string,
    urlPath: string
) {
    try {
        const db = getAdminDb();
        const userDocRef = db.collection('complimentOwners').doc(userId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            return;
        }

        const userData = userDoc.data();
        const tokens = userData?.fcmTokens as string[] || [];

        if (tokens.length === 0) {
            return;
        }

        // Clean up invalid tokens later
        const invalidTokens: string[] = [];

        const messages = tokens.map((token) => ({
            token,
            notification: {
                title,
                body,
            },
            data: {
                url: urlPath,
            },
            webpush: {
                fcmOptions: {
                    link: urlPath,
                }
            }
        }));

        // Sendall max 500. We likely have < 5
        const messaging = admin.messaging();
        const responses = await Promise.allSettled(
            messages.map(msg => messaging.send(msg))
        );

        responses.forEach((res, idx) => {
            if (res.status === 'rejected') {
                const error = res.reason;
                if (
                    error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered'
                ) {
                    invalidTokens.push(tokens[idx]);
                }
            }
        });

        if (invalidTokens.length > 0) {
            await userDocRef.update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
            });
        }

    } catch (error) {
        console.error('Failed to send push notification:', error);
    }
}
