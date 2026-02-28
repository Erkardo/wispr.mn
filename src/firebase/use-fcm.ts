'use client';

import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { useUser, useFirestore, initializeFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export function useFCM() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupportedBrowser, setIsSupportedBrowser] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
            isSupported().then((supported) => {
                setIsSupportedBrowser(supported);
            });
        }
    }, []);

    const requestPermission = async () => {
        if (!isSupportedBrowser) {
            console.warn("Firebase Messaging is not supported in this browser.");
            return false;
        }

        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm === 'granted') {
                const { firebaseApp } = initializeFirebase();
                const messaging = getMessaging(firebaseApp);
                // VAPID key is necessary for FCM Web. We will use the default mechanism or project settings
                // But usually, it's safer to provide the built-in vapidKey from Firebase console.
                // For Wispr, let's try getting token without explicit vapid if it works, otherwise need it.
                const token = await getToken(messaging, {
                    // vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Add this to env later if needed
                    // For now, let's just attempt 
                });

                if (token) {
                    setFcmToken(token);
                    // Save to Firestore if user is logged in
                    if (user && firestore) {
                        const userRef = doc(firestore, 'complimentOwners', user.uid);
                        await updateDoc(userRef, {
                            fcmTokens: arrayUnion(token)
                        }).catch(console.error); // Ignore error if doc doesn't exist yet
                    }
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error("An error occurred while retrieving token. ", error);
            return false;
        }
    };

    useEffect(() => {
        if (isSupportedBrowser && permission === 'granted' && typeof window !== 'undefined') {
            const { firebaseApp } = initializeFirebase();
            const messaging = getMessaging(firebaseApp);

            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Message received. ', payload);
                // Normally you can show a local toast here
                // If the app is open, you can show a toast.
                // If the app is in the background, the service worker handles it.
                // Since we already have the UI updates coming from Firestore listeners,
                // we might not EVEN need to show a native notification when the app is focused,
                // but it's helpful.
            });

            return () => {
                if (unsubscribe) unsubscribe();
            };
        }
    }, [isSupportedBrowser, permission]);

    return { fcmToken, permission, requestPermission, isSupportedBrowser };
}
