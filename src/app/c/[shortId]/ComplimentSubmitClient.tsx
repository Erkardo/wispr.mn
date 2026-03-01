'use client';

import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Frown, Share2, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { ComplimentForm } from '@/components/compliments/ComplimentForm';
import { Button } from '@/components/ui/button';
import { PollCard } from '@/components/polls/PollCard';

interface ComplimentSubmitClientProps {
    shortId?: string;
    username?: string;
}

export function ComplimentSubmitClient({ shortId, username }: ComplimentSubmitClientProps) {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const [ownerData, setOwnerData] = useState<any>(null);
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [activePoll, setActivePoll] = useState<any>(null);

    useEffect(() => {
        if (!firestore) return;

        async function resolveUser() {
            setLoading(true);
            setError(false);
            try {
                let resolvedOwnerId = null;

                if (username) {
                    const lookupDoc = await getDoc(doc(firestore, 'usernames', username.toLowerCase()));
                    if (lookupDoc.exists()) {
                        resolvedOwnerId = lookupDoc.data().uid;
                    }
                } else if (shortId) {
                    const lookupDoc = await getDoc(doc(firestore, 'shortLinks', shortId));
                    if (lookupDoc.exists()) {
                        resolvedOwnerId = lookupDoc.data().ownerId;
                    }
                }

                if (!resolvedOwnerId) {
                    setError(true);
                    setLoading(false);
                    return;
                }

                setOwnerId(resolvedOwnerId);

                const profileDoc = await getDoc(doc(firestore, 'complimentOwners', resolvedOwnerId));
                if (profileDoc.exists()) {
                    setOwnerData(profileDoc.data());

                    const pollsRef = doc(firestore, 'complimentOwners', resolvedOwnerId, 'polls', 'active');
                    const pollDoc = await getDoc(pollsRef);
                    if (pollDoc.exists()) {
                        setActivePoll({ id: pollDoc.id, ...pollDoc.data() });
                    }
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        resolveUser();
    }, [shortId, username, firestore]);


    if (userLoading || loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-white dark:bg-zinc-950">
                <div className="w-full max-w-md flex flex-col items-center gap-5">
                    <Skeleton className="h-28 w-28 rounded-full" />
                    <div className="space-y-2.5 w-full flex flex-col items-center">
                        <Skeleton className="h-7 w-44 rounded-full" />
                        <Skeleton className="h-4 w-64 rounded-full" />
                        <Skeleton className="h-4 w-56 rounded-full" />
                    </div>
                    <Skeleton className="h-44 w-full rounded-3xl mt-4" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    const isNotFound = error || !ownerId;
    const isOwner = user?.uid === ownerId;

    if (isNotFound) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
                <div className="w-full max-w-sm text-center flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-2">
                        <Frown className="h-9 w-9 text-zinc-400" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Хуудас олдсонгүй</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Энэ холбоос буруу эсвэл устгагдсан байна.</p>
                    <Button asChild variant="outline" className="mt-4 rounded-xl px-6">
                        <Link href="/">Нүүр хуудас руу буцах</Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (isOwner) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
                <div className="w-full max-w-sm text-center flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-2">
                        <Heart className="h-9 w-9 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Өөрийн линк байна</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Та энэ линкийг найзууддаа хуваалцаж сэтгэлийн үгсийг нь сонсоорой.</p>
                    <div className="flex flex-col gap-3 w-full mt-4">
                        <Button asChild className="w-full rounded-2xl h-14 bg-black dark:bg-white text-white dark:text-black font-bold shadow-lg active:scale-[0.98] transition-all flex items-center gap-2">
                            <Link href="/create"><Share2 className="w-4 h-4" /> Линкээ хуваалцах</Link>
                        </Button>
                        <Button variant="ghost" asChild className="w-full rounded-2xl h-14 font-semibold">
                            <Link href="/">Хүлээн авсан зурвасууд</Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-zinc-950 relative overflow-hidden">
            {/* Subtle top gradient wash */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/[0.07] to-transparent" />

            <div className="relative z-10 flex flex-col items-center px-5 pt-12 pb-32 mx-auto max-w-md">

                {/* Poll Card */}
                {activePoll && (
                    <div className="w-full mb-10">
                        <PollCard poll={activePoll} publicView={true} />
                    </div>
                )}

                {/* ─── Hero Section ─── */}
                <div className="flex flex-col items-center text-center w-full animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

                    {/* Trust pill */}
                    <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-700 dark:text-emerald-400">100% нэрээ нууцалсан</span>
                    </div>

                    {/* Avatar */}
                    <div className="relative mb-7">
                        {/* Glow ring — appears on mount with a delay */}
                        <div className="absolute -inset-3 rounded-full bg-primary/15 dark:bg-primary/20 blur-2xl animate-in fade-in duration-1000 delay-500 fill-mode-both" />
                        {ownerData?.photoURL ? (
                            <Avatar className="h-32 w-32 relative z-10 ring-4 ring-white dark:ring-zinc-950 shadow-2xl shadow-black/10 dark:shadow-black/40">
                                <Image
                                    src={ownerData.photoURL}
                                    alt={ownerData.displayName || 'Profile'}
                                    width={128}
                                    height={128}
                                    priority
                                    className="object-cover"
                                />
                                <AvatarFallback className="text-4xl font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100">
                                    {ownerData.displayName?.charAt(0).toUpperCase() || 'W'}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="relative z-10 w-32 h-32 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 ring-4 ring-white dark:ring-zinc-950 shadow-2xl flex items-center justify-center">
                                <Heart className="h-12 w-12 text-primary" />
                            </div>
                        )}
                    </div>

                    {/* Name & Bio */}
                    <h1 className="text-[30px] font-black text-zinc-950 dark:text-white tracking-tight leading-none">
                        @{ownerData?.displayName || 'Хэрэглэгч'}
                    </h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-[72%]">
                        {ownerData?.bio || 'Надад хэлмээр байсан ч хэлж чадаагүй тэр үгийг энд зоригтойгоор үлдээгээрэй'}
                    </p>
                </div>

                {/* ─── Form ─── */}
                <div className="w-full mt-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 ease-out fill-mode-both">
                    {ownerId && <ComplimentForm ownerId={ownerId} />}
                </div>
            </div>

            {/* Wispr footer brand */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
                <Link
                    href="/"
                    className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <span className="text-[12px] font-black tracking-tight text-zinc-900 dark:text-white">wispr</span>
                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500">· Өөрийн линкийг аваарай</span>
                </Link>
            </div>
        </div>
    );
}
