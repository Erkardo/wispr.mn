'use client';

import { ComplimentForm } from '@/components/compliments/ComplimentForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heart, Loader2, Frown } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function ComplimentSubmitClient({ shortId }: { shortId: string }) {
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(true);
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const { user } = useUser();

    useEffect(() => {
        if (!firestore || !shortId) {
            setIsLoading(false);
            return;
        }

        const fetchOwnerId = async () => {
            const shortLinkRef = doc(firestore, 'shortLinks', shortId);
            try {
                const docSnap = await getDoc(shortLinkRef);
                if (docSnap.exists()) {
                    setOwnerId(docSnap.data().ownerId);
                }
            } catch (e: any) {
                console.error("Failed to fetch short link:", e);
                setError(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOwnerId();
    }, [firestore, shortId]);

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Хэрэглэгчийг хайж байна...</p>
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
        <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background dark:from-background dark:via-accent/10 dark:to-background p-4">
            <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-lg border-primary/20">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4 ring-8 ring-primary/5">
                        <Heart className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-bold text-2xl">Wispr илгээгээрэй</CardTitle>
                    <CardDescription>Хэн болохыг тань хэн ч мэдэхгүй. Сэтгэлийнхээ дулаан үгсийг wispr болгон үлдээгээрэй.</CardDescription>
                </CardHeader>
                <CardContent>
                    {ownerId && <ComplimentForm ownerId={ownerId} />}
                </CardContent>
            </Card>
        </div>
    );
}
