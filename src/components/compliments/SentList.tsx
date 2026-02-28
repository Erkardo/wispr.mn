'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareIcon, Send, SearchX } from 'lucide-react';
import type { Compliment } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type SentWisprData = Compliment & { receiverId: string };

const cardStyles = [
    { bg: 'linear-gradient(to bottom right, #f9a8d4, #f472b6)', emoji: '💖' },
    { bg: 'linear-gradient(to bottom right, #a78bfa, #8b5cf6)', emoji: '💜' },
    { bg: 'linear-gradient(to bottom right, #fde047, #facc15)', emoji: '🌟' },
    { bg: 'linear-gradient(to bottom right, #6ee7b7, #34d399)', emoji: '🌿' },
    { bg: 'linear-gradient(to bottom right, #fdba74, #fb923c)', emoji: '🔥' },
    { bg: 'linear-gradient(to bottom right, #7dd3fc, #38bdf8)', emoji: '💧' },
];

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
                // Note: orderBy requires a Firestore index — sort client-side instead
                const sentRefQuery = query(
                    collection(firestore, 'complimentOwners', user.uid, 'sentWisprs'),
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

                // Client-side sort by newest first
                results.sort((a, b) => {
                    const timeA = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate().getTime() : 0;
                    const timeB = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate().getTime() : 0;
                    return timeB - timeA;
                });

                if (isMounted) setSentWisprs(results);

                // Clear unread replies flags
                const unreadDocs = sentSnapshot.docs.filter(d => d.data().hasUnreadReply === true);
                if (unreadDocs.length > 0) {
                    const batch = writeBatch(firestore);
                    unreadDocs.forEach(d => {
                        batch.update(d.ref, { hasUnreadReply: false });
                    });
                    await batch.commit().catch(e => console.error("Error clearing unread flags:", e));
                }

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
            <div className="text-center py-24 px-6 rounded-[2rem] mt-8 bg-gradient-to-b from-secondary/50 to-transparent border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50"></div>

                <div className="relative z-10">
                    <div className="mx-auto w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center rotate-3 mb-6 shadow-inner">
                        <Send className="h-10 w-10 text-primary -rotate-3 drop-shadow-md ml-1" />
                    </div>

                    <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">Та одоогоор Wispr илгээгээгүй байна</h3>
                    <p className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed mb-8">
                        Хэн нэгэн рүү урам сэргээсэн, сайхан үгс илгээгээд үзээрэй. Тэдний өдрийг гэрэлтүүлэх үгс энд хадгалагдах болно.
                    </p>

                    <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20 h-14 px-8 font-bold text-base hover:scale-105 transition-transform">
                        <Link href="/explore">
                            🔍 Хүмүүсийг хайх
                        </Link>
                    </Button>
                </div>
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
        <div className="space-y-6 pt-4 pb-20">
            {sentWisprs.map((comp, index) => {
                const hash = (comp.id || '').split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                const style = cardStyles[Math.abs(hash) % cardStyles.length];

                return (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={comp.id}
                    >
                        <Card className="overflow-hidden border-none shadow-xl rounded-3xl group">
                            <div className="p-1" style={{ backgroundImage: style.bg }}>
                                <CardContent className="bg-background dark:bg-zinc-950 rounded-[calc(1.5rem-4px)] p-5 sm:p-6 transition-all group-hover:bg-transparent group-hover:text-white duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center">
                                            {getDateBadge(comp.createdAt)}
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-white/80 transition-colors flex items-center gap-1.5 mt-0.5">
                                                <Send className="w-3 h-3" />
                                                Илгээсэн
                                            </div>
                                        </div>
                                        <div className="text-2xl group-hover:hidden">{style.emoji}</div>
                                    </div>

                                    <div className="relative mb-2">
                                        <div className="flex flex-col items-start w-[90%] md:w-[85%]">
                                            <span className="text-[10px] font-black text-primary/70 group-hover:text-white/60 mb-1.5 uppercase tracking-widest pl-4">Таны бичсэн</span>
                                            <p className="text-foreground group-hover:text-white font-bold leading-relaxed text-lg md:text-xl pl-4 border-l-4 border-primary/30 group-hover:border-white/50 transition-colors">
                                                "{comp.text}"
                                            </p>
                                        </div>
                                    </div>

                                    {comp.replyText ? (
                                        <div className="mt-6 flex flex-col items-end pl-[10%] md:pl-[15%]">
                                            <span className="text-[10px] font-black text-primary group-hover:text-white mb-1.5 uppercase tracking-widest flex items-center gap-1.5 pr-4">
                                                Хариу ирсэн
                                                <MessageSquareIcon className="w-3.5 h-3.5 animate-pulse" />
                                            </span>
                                            <div className="relative w-full z-0 flex justify-end">
                                                <div className="absolute top-0 right-8 w-4 h-4 bg-muted/60 group-hover:bg-white/20 transform -translate-y-1/2 rotate-45 border-r border-t border-border/30 group-hover:border-white/30 z-10 transition-colors"></div>
                                                <div className="bg-muted/60 group-hover:bg-white/10 backdrop-blur-xl border border-border/30 group-hover:border-white/20 rounded-2xl p-4 shadow-sm transition-colors relative z-20 w-full text-right">
                                                    <p className="text-sm text-foreground/90 group-hover:text-white leading-relaxed font-semibold">
                                                        "{comp.replyText}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-8 flex items-center gap-2 opacity-40 group-hover:opacity-60 transition-opacity">
                                            <div className="h-[1px] flex-1 bg-muted-foreground/20" />
                                            <p className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 text-muted-foreground group-hover:text-white">
                                                <SearchX className="w-3 h-3" />
                                                Хариу хүлээгдэж байна
                                            </p>
                                            <div className="h-[1px] flex-1 bg-muted-foreground/20" />
                                        </div>
                                    )}
                                </CardContent>
                            </div>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}
