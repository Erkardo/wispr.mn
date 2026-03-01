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
    ownerIdProp?: string;
}

export function ComplimentSubmitClient({ shortId, username, ownerIdProp }: ComplimentSubmitClientProps) {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const [ownerData, setOwnerData] = useState<any>(null);
    const [ownerId, setOwnerId] = useState<string | null>(ownerIdProp ?? null);
    const [loading, setLoading] = useState(ownerIdProp ? false : true);
    const [error, setError] = useState(false);
    const [activePoll, setActivePoll] = useState<any>(null);

    useEffect(() => {
        if (ownerIdProp) {
            // Already resolved via server side
            if (!firestore) return;
            getDoc(doc(firestore, 'complimentOwners', ownerIdProp)).then(profileDoc => {
                if (profileDoc.exists()) setOwnerData(profileDoc.data());
            });
            return;
        }
        if (!firestore) return;
        async function resolveUser() {
            setLoading(true);
            setError(false);
            try {
                let resolvedOwnerId = null;
                if (username) {
                    const lookupDoc = await getDoc(doc(firestore, 'usernames', username.toLowerCase()));
                    if (lookupDoc.exists()) resolvedOwnerId = lookupDoc.data().uid;
                } else if (shortId) {
                    const lookupDoc = await getDoc(doc(firestore, 'shortLinks', shortId));
                    if (lookupDoc.exists()) resolvedOwnerId = lookupDoc.data().ownerId;
                }

                if (!resolvedOwnerId) { setError(true); setLoading(false); return; }
                setOwnerId(resolvedOwnerId);

                const profileDoc = await getDoc(doc(firestore, 'complimentOwners', resolvedOwnerId));
                if (profileDoc.exists()) {
                    setOwnerData(profileDoc.data());
                    const pollDoc = await getDoc(doc(firestore, 'complimentOwners', resolvedOwnerId, 'polls', 'active'));
                    if (pollDoc.exists()) setActivePoll({ id: pollDoc.id, ...pollDoc.data() });
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

    /* ── Loading ── */
    if (userLoading || loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-start pt-16 px-5 bg-[#F2F0FF]">
                <div className="w-full max-w-md flex flex-col items-center gap-5">
                    <Skeleton className="h-28 w-28 rounded-full" />
                    <Skeleton className="h-7 w-44 rounded-full" />
                    <Skeleton className="h-4 w-64 rounded-full" />
                    <Skeleton className="h-52 w-full rounded-3xl mt-2" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    const isNotFound = error || !ownerId;
    const isOwner = user?.uid === ownerId;

    /* ── Not Found ── */
    if (isNotFound) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center px-5 bg-[#F2F0FF]">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg shadow-violet-100">
                    <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                        <Frown className="h-7 w-7 text-violet-400" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">Хуудас олдсонгүй</h2>
                    <p className="text-sm text-zinc-500 mb-6">Энэ холбоос буруу эсвэл устгагдсан байна.</p>
                    <Button asChild className="w-full rounded-2xl h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold">
                        <Link href="/">Нүүр хуудас</Link>
                    </Button>
                </div>
            </div>
        );
    }

    /* ── Owner viewing own link ── */
    if (isOwner) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center px-5 bg-[#F2F0FF]">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg shadow-violet-100">
                    <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                        <Heart className="h-7 w-7 text-violet-500" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">Өөрийн линк байна</h2>
                    <p className="text-sm text-zinc-500 mb-6">Найзууддаа хуваалцаж сэтгэлийн үгсийг нь сонсоорой.</p>
                    <Button asChild className="w-full rounded-2xl h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-2 mb-3">
                        <Link href="/create"><Share2 className="w-4 h-4" /> Линкээ хуваалцах</Link>
                    </Button>
                    <Button variant="ghost" asChild className="w-full rounded-2xl h-12 font-semibold hover:bg-violet-50 text-zinc-600">
                        <Link href="/">Хүлээн авсан зурвасууд</Link>
                    </Button>
                </div>
            </div>
        );
    }

    /* ── Main ── */
    return (
        <div className="relative min-h-screen bg-[#F2F0FF] overflow-hidden">
            {/* Decorative gradient blobs */}
            <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-300/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-purple-300/25 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-40 rounded-full bg-indigo-200/30 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center px-5 pt-10 pb-32 mx-auto max-w-md">

                {/* Poll */}
                {activePoll && (
                    <div className="w-full mb-8">
                        <PollCard poll={activePoll} publicView={true} />
                    </div>
                )}

                {/* ── Hero ── */}
                <div className="flex flex-col items-center text-center w-full mb-8 animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
                    {/* Trust badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-7 rounded-full bg-emerald-50 border border-emerald-200 shadow-sm shadow-emerald-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="text-[11px] font-black tracking-[0.12em] uppercase text-emerald-700">100% нэрээ нууцалсан</span>
                    </div>

                    {/* Avatar with glow ring */}
                    <div className="relative mb-6">
                        <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 opacity-25 blur-lg" />
                        <div className="relative w-28 h-28 rounded-full ring-4 ring-white shadow-2xl shadow-violet-200 overflow-hidden">
                            {ownerData?.photoURL ? (
                                <Image
                                    src={ownerData.photoURL}
                                    alt={ownerData.displayName || 'Profile'}
                                    fill
                                    priority
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                                    <Heart className="h-10 w-10 text-white" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Name */}
                    <h1 className="text-[26px] font-black text-zinc-900 tracking-tight leading-none mb-3">
                        @{ownerData?.displayName || 'Хэрэглэгч'}
                    </h1>
                    <p className="text-[15px] font-medium text-zinc-500 max-w-[75%] leading-relaxed">
                        {ownerData?.bio || 'Надад хэлмээр байсан ч хэлж чадаагүй тэр үгийг энд зоригтойгоор үлдээгээрэй'}
                    </p>
                </div>

                {/* ── Form ── */}
                <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 ease-out fill-mode-both">
                    {ownerId && <ComplimentForm ownerId={ownerId} />}
                </div>
            </div>

            {/* Floating brand footer pill */}
            <div className="fixed bottom-5 inset-x-0 flex justify-center z-20 pointer-events-none">
                <Link
                    href="/"
                    className="pointer-events-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-xl shadow-violet-100 hover:shadow-violet-200 border border-white/60 transition-all hover:scale-[1.03] active:scale-[0.97]"
                >
                    <span className="text-[13px] font-black text-violet-600 tracking-tight">wispr</span>
                    <span className="text-[12px] text-zinc-400">·</span>
                    <span className="text-[12px] font-medium text-zinc-500">Өөрийн линкийг аваарай</span>
                </Link>
            </div>
        </div>
    );
}
