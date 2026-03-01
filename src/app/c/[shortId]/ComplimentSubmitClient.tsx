'use client';

import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Frown, Loader2 } from 'lucide-react';
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
            <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4">
                <Card className="w-full max-w-sm border-0 shadow-none bg-transparent">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto mt-4 mb-4">
                            <Skeleton className="h-20 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-6 w-3/4 mx-auto rounded-full" />
                        <Skeleton className="h-4 w-5/6 mx-auto rounded-full mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4 pb-8 items-center justify-center">
                        <Skeleton className="h-32 w-full rounded-3xl" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isNotFound = error || !ownerId;
    const isOwner = user?.uid === ownerId;

    if (isNotFound) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
                <Card className="w-full max-w-sm text-center p-8 border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-zinc-900 rounded-[2rem]">
                    <Frown className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">Хуудас олдсонгүй</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Энэ холбоос буруу эсвэл устгагдсан байна.</p>
                </Card>
            </div>
        );
    }

    if (isOwner) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
                <Card className="w-full max-w-sm text-center p-8 border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 bg-white dark:bg-zinc-900 rounded-[2rem]">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-5">
                        <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">Өөрийн линк байна</h2>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">Та энэ линкийг найзууддаа хуваалцаж сэтгэлийн үгсийг нь сонсоорой.</p>
                    <div className="mt-8 flex flex-col gap-3">
                        <Button asChild className="w-full rounded-2xl h-14 bg-black dark:bg-white text-white dark:text-black font-semibold shadow-md active:scale-[0.98] transition-all">
                            <Link href="/create">Линкээ хуваалцах</Link>
                        </Button>
                        <Button variant="ghost" asChild className="w-full rounded-2xl h-14 font-semibold hover:bg-black/5 dark:hover:bg-white/5">
                            <Link href="/">Хүлээн авсан зурвасууд</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-[calc(100vh-56px)] justify-center px-4 pt-10 pb-20 relative overflow-hidden bg-white dark:bg-zinc-950">
            {/* Elegant Ambient Glow Backgrounds */}
            <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px] pointer-events-none opacity-50 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen" />
            <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none opacity-50 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen" />

            <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out relative z-10">

                {/* Poll Card (if exists) */}
                {activePoll && (
                    <div className="w-full mb-8">
                        <PollCard poll={activePoll} publicView={true} />
                    </div>
                )}

                <div className="mb-10 flex flex-col items-center relative">
                    <div className="relative">
                        <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-primary/30 to-blue-500/30 blur-2xl opacity-50 dark:opacity-30"></div>
                        {ownerData?.photoURL ? (
                            <Avatar className="h-[104px] w-[104px] shadow-2xl shadow-black/10 dark:shadow-white/5 ring-4 ring-white dark:ring-zinc-900 mb-6 relative z-10">
                                <Image
                                    src={ownerData.photoURL}
                                    alt={ownerData.displayName || 'Profile'}
                                    width={104}
                                    height={104}
                                    priority
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-muted text-muted-foreground text-2xl font-bold">{ownerData.displayName?.charAt(0).toUpperCase() || 'W'}</AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="mx-auto bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-full w-fit shadow-2xl shadow-primary/10 ring-4 ring-white dark:ring-zinc-900 mb-6 relative z-10">
                                <Heart className="h-10 w-10 text-primary drop-shadow-sm" />
                            </div>
                        )}
                    </div>

                    <div className="text-center px-2">
                        <h1 className="font-extrabold text-[24px] text-zinc-900 dark:text-zinc-50 tracking-tight">
                            @{ownerData?.displayName || 'Хэрэглэгч'}
                        </h1>
                        <p className="text-[15px] font-medium text-zinc-500 dark:text-zinc-400 mt-2.5 max-w-[280px] mx-auto leading-relaxed">
                            {ownerData?.bio || "Надад хэлмээр байсан тэр үгээ энд зоригтойгоор үлдээгээрэй..."}
                        </p>
                    </div>
                </div>

                {/* Minimal Form Wrapper */}
                <div className="w-full">
                    {ownerId && <ComplimentForm ownerId={ownerId} />}
                </div>
            </div>

            <div className="mt-14 opacity-40 hover:opacity-100 transition-opacity">
                <Link href="/" className="flex items-center gap-1.5 bg-transparent px-3 py-1.5 rounded-full">
                    <span className="font-bold text-[11px] tracking-tight text-foreground uppercase">wispr</span>
                    <span className="text-[11px] font-medium text-muted-foreground">— get your own link</span>
                </Link>
            </div>
        </div>
    );
}
