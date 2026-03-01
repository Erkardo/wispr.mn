'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function NotificationManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
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
        const unreadCompsQuery = query(complimentsRef, where('isRead', '==', false));

        // 3. Listen for new UNREAD replies
        const sentRef = collection(firestore, 'complimentOwners', user.uid, 'sentWisprs');
        const unreadRepsQuery = query(sentRef, where('hasUnreadReply', '==', true));

        let isInitial = true;

        const handleNotification = (type: 'wispr' | 'reply', id: string) => {
            const title = type === 'wispr' ? '🔥 Шинэ Wispr ирлээ!' : '💬 Хариу ирлээ!';
            const body = type === 'wispr' ? 'Танд нэргүй wispr ирлээ. Одоо нээж үзээрэй.' : 'Таны илгээсэн wispr-д хариу бичжээ.';
            const href = type === 'wispr' ? `/?complimentId=${id}` : `/?tab=sent&complimentId=${id}`;

            // Browser Notification
            if (Notification.permission === 'granted') {
                const n = new Notification(type === 'wispr' ? 'Wispr - Шинэ зурвас!' : 'Wispr - Хариу ирлээ!', {
                    body,
                    icon: '/logo-icon.svg',
                });
                n.onclick = () => {
                    window.focus();
                    router.push(href);
                };
            }

            // Toast
            toast({
                title,
                description: body,
                action: (
                    <ToastAction altText="Open" onClick={() => router.push(href)}>
                        Нээж үзэх
                    </ToastAction>
                ),
            });
        };

        const unsubComps = onSnapshot(unreadCompsQuery, (snapshot) => {
            if (isInitial) return;
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') handleNotification('wispr', change.doc.id);
            });
        });

        const unsubReps = onSnapshot(unreadRepsQuery, (snapshot) => {
            if (isInitial) {
                isInitial = false;
                return;
            }
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') handleNotification('reply', change.doc.data().complimentId || change.doc.id);
            });
        });

        return () => {
            unsubComps();
            unsubReps();
        };
    }, [user, firestore, toast, router]);

    return null;
}
