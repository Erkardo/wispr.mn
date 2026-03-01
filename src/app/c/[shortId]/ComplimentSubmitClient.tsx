'use client';

import { ComplimentForm } from '@/components/compliments/ComplimentForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heart, Frown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getTheme } from '@/lib/themes';
import { PollCard } from '@/components/polls/PollCard';
import type { Poll, ComplimentOwner } from '@/types';

export function ComplimentSubmitClient({ shortId, ownerIdProp }: { shortId?: string; ownerIdProp?: string }) {
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(true);
    const [ownerId, setOwnerId] = useState<string | null>(ownerIdProp || null);
    const [error, setError] = useState<Error | null>(null);
    const [ownerData, setOwnerData] = useState<ComplimentOwner | null>(null);
    const { user } = useUser();
    const [activePoll, setActivePoll] = useState<Poll | null>(null);

    // Fetch active poll
    useEffect(() => {
        if (!firestore || !ownerId) return;

        const fetchPoll = async () => {
            try {
                const pollsRef = collection(firestore, 'complimentOwners', ownerId, 'polls');
                // Order by createdAt desc to get newest. limit 1.
                // Note: requires index if large, but dev env should be fine.
                // Using query without orderBy for now to avoid index error in dev if not set up.
                const q = query(pollsRef, where('isActive', '==', true));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    // Start with the first active one found (client side sort if needed)
                    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll));
                    // Sort by createdAt desc in JS
                    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setActivePoll(docs[0]);
                } else {
                    setActivePoll(null);
                }
            } catch (e) {
                console.error("Failed to fetch poll", e);
            }
        };

        fetchPoll();
    }, [firestore, ownerId]);

    useEffect(() => {
        if (!firestore) {
            setIsLoading(false);
            return;
        }

        if (ownerIdProp) {
            const fetchOwnerDataDirectly = async () => {
                try {
                    const ownerRef = doc(firestore, 'complimentOwners', ownerIdProp);
                    const ownerSnap = await getDoc(ownerRef);
                    if (ownerSnap.exists()) {
                        setOwnerData(ownerSnap.data() as ComplimentOwner);
                    } else {
                        throw new Error("User not found");
                    }
                } catch (e: any) {
                    console.error("Failed to fetch owner profile directly", e);
                    setError(e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchOwnerDataDirectly();
            return;
        }

        if (!shortId) {
            setIsLoading(false);
            return;
        }

        const fetchOwnerData = async () => {
            const shortLinkRef = doc(firestore, 'shortLinks', shortId);
            let currentStep = 'fetching-short-link';
            try {
                console.log("Attempting to fetch shortLink:", shortId);
                const docSnap = await getDoc(shortLinkRef);

                if (docSnap.exists()) {
                    const oId = docSnap.data().ownerId;
                    console.log("ShortLink found. Owner ID:", oId);
                    setOwnerId(oId);

                    // Fetch owner data for theme
                    currentStep = 'fetching-owner-profile';
                    const ownerRef = doc(firestore, 'complimentOwners', oId);
                    const ownerSnap = await getDoc(ownerRef);

                    if (ownerSnap.exists()) {
                        setOwnerData(ownerSnap.data() as ComplimentOwner);
                    } else {
                        console.error("Owner document does not exist for ID:", oId);
                    }
                } else {
                    console.error("ShortLink document does not exist:", shortId);
                }
            } catch (e: any) {
                console.error(`Failed at step: ${currentStep}`, e);
                // Log specific permission error if present
                if (e.code === 'permission-denied') {
                    console.error("PERMISSION DENIED for:", currentStep);
                }
                setError(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOwnerData();
    }, [firestore, shortId]);

    // Theme logic
    const theme = getTheme(ownerData?.theme);
    const themeStyles = {
        '--primary': theme.colors.primary,
        '--background': theme.colors.background,
        '--card': theme.colors.card,
        '--foreground': theme.colors.text,
        '--muted-foreground': theme.colors.muted,
        '--border': theme.colors.border,
    } as React.CSSProperties;

    // Helper for applying background style safely (since some are colors, some might be gradients in future?)
    // For now themes.ts has space-separated HSL channels.
    // We need to apply them to the root div.
    // The previous bg class was: bg-gradient-to-br from-background via-accent/5 to-background
    // We can keep it or override it.
    // If we change --background variable, 'bg-background' utility will use it.

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl bg-card border-border border">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto mt-4 mb-4">
                            <Skeleton className="h-24 w-24 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-3/4 mx-auto rounded-full" />
                        <Skeleton className="h-4 w-5/6 mx-auto rounded-full mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4 pb-8 items-center justify-center">
                        <Skeleton className="h-24 w-full rounded-2xl" />
                        <Skeleton className="h-12 w-[140px] mx-auto rounded-xl" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isNotFound = error || !ownerId;
    const isOwner = user?.uid === ownerId;

    if (isNotFound) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-8">
                    <Frown className="mx-auto h-12 w-12 text-destructive" />
                    <h2 className="mt-4 text-xl font-bold">Хэрэглэгч олдсонгүй</h2>
                    <p className="mt-2 text-muted-foreground">Таны хайсан линк буруу эсвэл устгагдсан байж магадгүй.</p>
                </Card>
            </div>
        );
    }

    if (isOwner) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-8 border-primary/20 bg-primary/5">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                        <Heart className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">Энэ таны өөрийн линк байна</h2>
                    <p className="mt-2 text-muted-foreground">Та энэ линкийг найзууддаа илгээж wispr хүлээн аваарай.</p>
                    <div className="mt-8 flex flex-col gap-3">
                        <Button asChild className="w-full font-bold">
                            <Link href="/create">Story үүсгэх / Линк хуваалцах</Link>
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <Link href="/">Хүлээн авсан wispr-үүдээ харах</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div
            style={themeStyles}
            className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center bg-background p-4 transition-colors duration-500"
        >
            {activePoll && (
                <div className="w-full max-w-md animate-in fade-in slide-in-from-top-4 mb-6">
                    <PollCard poll={activePoll} publicView={true} />
                </div>
            )}
            <Card className="w-full max-w-md shadow-2xl bg-card backdrop-blur-lg border-primary/20">
                <CardHeader className="text-center">
                    {ownerData?.photoURL || ownerData?.bio || ownerData?.displayName ? (
                        <div className="flex flex-col items-center gap-3 mb-4">
                            {ownerData?.photoURL ? (
                                <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-xl overflow-hidden">
                                    <Image
                                        src={ownerData.photoURL}
                                        alt={ownerData.displayName || 'Profile'}
                                        width={96}
                                        height={96}
                                        priority
                                        className="rounded-full object-cover"
                                    />
                                    <AvatarFallback>{ownerData.displayName?.charAt(0).toUpperCase() || 'W'}</AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit ring-8 ring-primary/5">
                                    <Heart className="h-8 w-8 text-primary" />
                                </div>
                            )}
                            {ownerData?.displayName && (
                                <CardTitle className="font-black text-2xl">{ownerData.displayName}-д Wispr бичих</CardTitle>
                            )}
                            {ownerData?.bio && (
                                <p className="text-sm font-medium text-muted-foreground whitespace-pre-wrap px-4">{ownerData.bio}</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4 ring-8 ring-primary/5">
                                <Heart className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="font-bold text-2xl">Wispr илгээгээрэй</CardTitle>
                        </>
                    )}
                    <CardDescription className="text-muted-foreground mt-2">Хэн болохыг тань хэн ч мэдэхгүй. Сэтгэлийнхээ дулаан үгсийг wispr болгон үлдээгээрэй.</CardDescription>
                </CardHeader>
                <CardContent>
                    {ownerId && <ComplimentForm ownerId={ownerId} />}
                </CardContent>
            </Card>
        </div>
    );
}
