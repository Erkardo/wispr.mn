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
            className="flex min-h-[calc(100vh-56px)] flex-col items-center p-4 pt-12 transition-colors duration-500 relative overflow-hidden"
        >
            {/* Immersive mesh background */}
            <div className="absolute inset-0 bg-background z-0">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 blur-[100px] rounded-full mix-blend-multiply opacity-50 animate-blob" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/20 blur-[100px] rounded-full mix-blend-multiply opacity-50 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-32 left-20 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full mix-blend-multiply opacity-50 animate-blob animation-delay-4000" />
            </div>

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

                {/* Poll Card (if exists) */}
                {activePoll && (
                    <div className="w-full mb-6 animate-in slide-in-from-top-10 fade-in duration-500">
                        <PollCard poll={activePoll} publicView={true} />
                    </div>
                )}

                {/* Profile Avatar / Heart */}
                <div className="mb-6 relative animate-in fade-in zoom-in duration-700 delay-100 flex flex-col items-center">
                    {ownerData?.photoURL ? (
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
                            <Avatar className="h-28 w-28 border-[3px] border-background shadow-2xl overflow-hidden relative z-10">
                                <Image
                                    src={ownerData.photoURL}
                                    alt={ownerData.displayName || 'Profile'}
                                    width={112}
                                    height={112}
                                    priority
                                    className="rounded-full object-cover"
                                />
                                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">{ownerData.displayName?.charAt(0).toUpperCase() || 'W'}</AvatarFallback>
                            </Avatar>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
                            <div className="mx-auto bg-primary/10 p-5 rounded-full w-fit border-[3px] border-background shadow-2xl relative z-10">
                                <Heart className="h-10 w-10 text-primary fill-primary/20" />
                            </div>
                        </div>
                    )}

                    {ownerData?.displayName ? (
                        <div className="text-center mt-4">
                            <h1 className="font-extrabold text-2xl tracking-tight text-foreground drop-shadow-sm">
                                @{ownerData.displayName}
                            </h1>
                            <p className="text-sm font-medium text-muted-foreground mt-1 max-w-[280px] leading-relaxed mx-auto text-balance">
                                {ownerData.bio || "Надад хэлмээр байсан тэр үгээ энд зоригтойгоор үлдээгээрэй..."}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center mt-4">
                            <h1 className="font-extrabold text-2xl tracking-tight text-foreground drop-shadow-sm">
                                Wispr илгээгээрэй
                            </h1>
                            <p className="text-sm font-medium text-muted-foreground mt-1 text-balance">
                                Надад хэлмээр байсан тэр үгээ энд зоригтойгоор үлдээгээрэй...
                            </p>
                        </div>
                    )}
                </div>

                {/* Form Card */}
                <div className="w-full animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                    <Card className="w-full shadow-2xl bg-white/70 dark:bg-black/40 backdrop-blur-2xl border-white/40 dark:border-white/10 rounded-[2rem] overflow-hidden">
                        <CardContent className="p-1 pt-1">
                            {ownerId && <ComplimentForm ownerId={ownerId} />}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer Badge */}
            <div className="mt-auto pt-12 pb-6 relative z-10 opacity-70 hover:opacity-100 transition-opacity">
                <Link href="/" className="flex items-center gap-2 bg-white/50 dark:bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                    <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Wispr</span>
                    <span className="text-xs font-semibold text-muted-foreground border-l border-muted pl-2">Get your own link</span>
                </Link>
            </div>
        </div>
    );
}
