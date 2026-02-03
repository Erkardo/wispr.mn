'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function NotificationManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        // 1. Request Browser Notification Permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }, []);

    useEffect(() => {
        if (!user || !firestore) return;

        // 2. Listen for new UNREAD wisprs
        const complimentsRef = collection(firestore, 'complimentOwners', user.uid, 'compliments');
        const unreadQuery = query(complimentsRef, where('isRead', '==', false));

        // We use a manual onSnapshot to detect "changes" (newly added docs)
        // and avoid firing on initial load if we want.
        let isInitial = true;
        const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
            if (isInitial) {
                isInitial = false;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();

                    // Show Browser Notification
                    if (Notification.permission === 'granted') {
                        new Notification('Wispr - Шинэ зурвас!', {
                            body: 'Танд шинэ нэргүй wispr ирлээ. Одоо нээж үзээрэй.',
                            icon: '/logo-icon.svg',
                        });
                    }

                    // Show Toast
                    toast({
                        title: '🔥 Шинэ Wispr ирлээ!',
                        description: 'Таны сэтгэлийг дулаацуулах нэргүй wispr ирлээ.',
                    });
                }
            });
        });

        return () => unsubscribe();
    }, [user, firestore, toast]);

    return null;
}
