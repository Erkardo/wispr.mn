'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareIcon, Send, SearchX } from 'lucide-react';
import type { Compliment } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

type SentWisprData = Compliment & { receiverId: string };

export function SentList() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [sentWisprs, setSentWisprs] = useState<SentWisprData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchSentWisprs() {
            if (!user || user.isAnonymous || !firestore) {
                if (isMounted) setIsLoading(false);
                return;
            }

            try {
                // Fetch references from the user's sentWisprs collection
                const sentRefQuery = query(
                    collection(firestore, 'complimentOwners', user.uid, 'sentWisprs'),
                    orderBy('sentAt', 'desc'),
                    limit(50)
                );

                const sentSnapshot = await getDocs(sentRefQuery);
                const fetches = sentSnapshot.docs.map(async (sentDoc) => {
                    const data = sentDoc.data();
                    if (!data.receiverId || !data.complimentId) return null;

                    const compDocRef = doc(firestore, 'complimentOwners', data.receiverId, 'compliments', data.complimentId);
                    const compSnap = await getDoc(compDocRef);

                    if (compSnap.exists()) {
                        return { id: compSnap.id, receiverId: data.receiverId, ...compSnap.data() } as SentWisprData;
                    }
                    return null;
                });

                const results = (await Promise.all(fetches)).filter(Boolean) as SentWisprData[];
                if (isMounted) setSentWisprs(results);
            } catch (error) {
                console.error("Error fetching sent wisprs:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchSentWisprs();
        return () => { isMounted = false; };
    }, [user, firestore]);

    if (userLoading || isLoading) {
        return (
            <div className="space-y-4 pt-4">
                <Skeleton className="w-full h-32 rounded-2xl" />
                <Skeleton className="w-full h-32 rounded-2xl" />
            </div>
        );
    }

    if (!user || user.isAnonymous) {
        return (
            <div className="text-center py-16 px-4">
                <p className="text-muted-foreground">Та бүртгэлгүй байгаа тул илгээсэн Wispr-үүдээ харах боломжгүй.</p>
            </div>
        );
    }

    if (sentWisprs.length === 0) {
        return (
            <div className="text-center py-20 px-4 border-2 border-dashed rounded-2xl mt-8 bg-card/50">
                <Send className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">Та одоогоор Wispr илгээгээгүй байна</h3>
                <p className="mt-2 text-sm text-muted-foreground">Бусад руу урмын үг илгээснээр энд харагдана.</p>
            </div>
        );
    }

    const getDateBadge = (timestamp: any) => {
        if (!timestamp) return null;
        const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date();
        const formatted = isToday(date) ? 'Өнөөдөр' : isYesterday(date) ? 'Өчигдөр' : format(date, 'MMM d');
        return <Badge variant="outline" className="text-xs text-muted-foreground mr-2">{formatted}</Badge>;
    };

    return (
        <div className="space-y-4 pt-4">
            {sentWisprs.map((comp, index) => (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={comp.id}
                >
                    <Card className="overflow-hidden border-primary/10 hover:border-primary/30 transition-colors shadow-sm bg-card hover:shadow-md">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center">
                                    {getDateBadge(comp.createdAt)}
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Send className="w-3 h-3" />
                                        Таны бичсэн
                                    </div>
                                </div>
                            </div>

                            <p className="text-foreground/90 font-medium leading-relaxed italic text-sm md:text-base border-l-2 border-primary/40 pl-3">
                                "{comp.text}"
                            </p>

                            {comp.replyText ? (
                                <div className="mt-4 bg-primary/10 border border-primary/20 rounded-xl p-3 shadow-inner">
                                    <span className="text-xs font-bold text-primary mb-1 uppercase tracking-wider flex items-center gap-1.5">
                                        <MessageSquareIcon className="w-3.5 h-3.5" />
                                        Ирсэн хариу
                                    </span>
                                    <p className="text-sm text-foreground leading-relaxed font-medium mt-1">
                                        "{comp.replyText}"
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 border-t border-dashed pt-3">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 opacity-70">
                                        <SearchX className="w-3.5 h-3.5" />
                                        Одоогоор хариу ирээгүй байна
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
