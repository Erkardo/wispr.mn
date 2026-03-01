'use client';

import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Frown, Share2 } from 'lucide-react';
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
        if (!firestore) return;
        if (ownerIdProp) {
            getDoc(doc(firestore, 'complimentOwners', ownerIdProp)).then(profileDoc => {
                if (profileDoc.exists()) setOwnerData(profileDoc.data());
            });
            return;
        }
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
                } else { setError(true); }
            } catch (err) { console.error(err); setError(true); }
            finally { setLoading(false); }
        }
        resolveUser();
    }, [shortId, username, firestore, ownerIdProp]);

    /* ── Loading skeleton ── */
    if (userLoading || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-white px-4">
                <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                    <Skeleton className="h-32 w-32 rounded-full" />
                    <Skeleton className="h-8 w-48 rounded-xl" />
                    <Skeleton className="h-4 w-64 rounded-lg" />
                    <Skeleton className="h-56 w-full rounded-3xl mt-2" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    const isNotFound = error || !ownerId;
    const isOwner = user?.uid === ownerId;

    /* ── Not found ── */
    if (isNotFound) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-white px-4">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-3xl bg-violet-100 flex items-center justify-center mx-auto mb-5">
                        <Frown className="h-9 w-9 text-violet-400" />
                    </div>
                    <h2 className="text-2xl font-black text-zinc-900 mb-2">Хуудас олдсонгүй</h2>
                    <p className="text-zinc-500 mb-6">Энэ холбоос буруу эсвэл устгагдсан байна.</p>
                    <Button asChild className="rounded-2xl px-8 h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold">
                        <Link href="/">Нүүр хуудас</Link>
                    </Button>
                </div>
            </div>
        );
    }

    /* ── Owner sees own link ── */
    if (isOwner) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-white px-4">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-3xl bg-violet-100 flex items-center justify-center mx-auto mb-5">
                        <Heart className="h-9 w-9 text-violet-500" />
                    </div>
                    <h2 className="text-2xl font-black text-zinc-900 mb-2">Өөрийн линк байна</h2>
                    <p className="text-zinc-500 mb-6">Найзуудтаа хуваалцаж тэдний сэтгэлийн үгийг сонсоорой!</p>
                    <div className="flex flex-col gap-3">
                        <Button asChild className="rounded-2xl h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2">
                            <Link href="/create"><Share2 className="w-4 h-4" />Линкээ хуваалцах</Link>
                        </Button>
                        <Button variant="ghost" asChild className="rounded-2xl h-12 hover:bg-violet-50">
                            <Link href="/">Хүлээн авсан зурвасууд</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Main submission page ── */
    return (
        <div
            className="relative min-h-screen w-full overflow-x-hidden"
            style={{
                background: 'linear-gradient(160deg, #f0eeff 0%, #e8e4ff 30%, #f5f3ff 60%, #ffffff 100%)',
            }}
        >
            {/* Decorative background orbs */}
            <div
                className="pointer-events-none absolute"
                style={{
                    top: '-120px', left: '50%', transform: 'translateX(-50%)',
                    width: '700px', height: '700px',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(167,139,250,0.08) 50%, transparent 72%)',
                    filter: 'blur(1px)',
                }}
            />
            <div
                className="pointer-events-none absolute"
                style={{
                    bottom: '0', left: '-100px',
                    width: '400px', height: '400px',
                    background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                }}
            />
            <div
                className="pointer-events-none absolute"
                style={{
                    top: '40%', right: '-80px',
                    width: '300px', height: '300px',
                    background: 'radial-gradient(circle, rgba(196,181,253,0.2) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-start px-5 pt-12 pb-32 min-h-screen mx-auto" style={{ maxWidth: '440px' }}>

                {/* Poll */}
                {activePoll && (
                    <div className="w-full mb-8">
                        <PollCard poll={activePoll} publicView={true} />
                    </div>
                )}

                {/* ── Hero Section ── */}
                <div
                    className="flex flex-col items-center text-center w-full"
                    style={{ animation: 'fadeSlideUp 0.6s ease-out both' }}
                >
                    {/* Trust badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-white/80 border border-emerald-200 shadow-sm backdrop-blur-sm">
                        <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span className="text-[11px] font-black tracking-[0.15em] uppercase text-emerald-700">100% нэрээ нууцалсан</span>
                    </div>

                    {/* Avatar */}
                    <div className="relative mb-7" style={{ animation: 'fadeSlideUp 0.7s ease-out 0.1s both' }}>
                        {/* Outer glow */}
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.1) 60%, transparent 80%)',
                                transform: 'scale(1.6)',
                                filter: 'blur(12px)',
                            }}
                        />
                        {/* Inner ring */}
                        <div className="relative z-10 p-1 rounded-full" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa, #7c3aed)' }}>
                            <div className="p-0.5 rounded-full bg-white">
                                {ownerData?.photoURL ? (
                                    <Avatar className="h-32 w-32">
                                        <Image
                                            src={ownerData.photoURL}
                                            alt={ownerData.displayName || 'Profile'}
                                            width={128}
                                            height={128}
                                            priority
                                            className="object-cover rounded-full"
                                        />
                                        <AvatarFallback className="text-4xl font-black bg-violet-100 text-violet-600 rounded-full">
                                            {ownerData.displayName?.charAt(0).toUpperCase() || 'W'}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="h-32 w-32 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                                        <Heart className="h-12 w-12 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Name */}
                    <h1
                        className="font-black tracking-tight leading-none mb-3"
                        style={{ fontSize: '28px', color: '#18181b', animation: 'fadeSlideUp 0.7s ease-out 0.15s both' }}
                    >
                        @{ownerData?.displayName || 'Хэрэглэгч'}
                    </h1>
                    <p
                        className="leading-relaxed mb-10"
                        style={{ fontSize: '15px', color: '#71717a', maxWidth: '280px', animation: 'fadeSlideUp 0.7s ease-out 0.2s both' }}
                    >
                        {ownerData?.bio || 'Надад хэлмээр байсан ч хэлж чадаагүй тэр үгийг зоригтойгоор үлдээгээрэй'}
                    </p>
                </div>

                {/* ── Form ── */}
                <div
                    className="w-full"
                    style={{ animation: 'fadeSlideUp 0.7s ease-out 0.25s both' }}
                >
                    {ownerId && <ComplimentForm ownerId={ownerId} />}
                </div>
            </div>

            {/* Floating footer pill */}
            <div className="fixed bottom-5 inset-x-0 flex justify-center z-20 pointer-events-none">
                <Link
                    href="/"
                    className="pointer-events-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg transition-all hover:scale-[1.04] active:scale-[0.97]"
                    style={{
                        background: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(139,92,246,0.15)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 24px rgba(139,92,246,0.15)',
                    }}
                >
                    <span className="text-[13px] font-black text-violet-600 tracking-tight">wispr</span>
                    <span className="text-zinc-300 text-[12px]">·</span>
                    <span className="text-[12px] font-medium text-zinc-500">Өөрийн линкийг аваарай</span>
                </Link>
            </div>

            <style jsx>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
