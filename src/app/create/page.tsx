'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Header } from '@/components/Header';
import { Loader2 } from 'lucide-react';
import { ShareLink } from '@/components/compliments/ShareLink';
import { ComplimentStoryGenerator } from '@/components/compliments/ComplimentStoryGenerator';
import { StoryGenerator } from '@/components/compliments/StoryGenerator';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import type { ComplimentOwner } from '@/types';
import type { WithId } from '@/firebase';


export default function CreatePage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const searchParams = useSearchParams();

    useEffect(() => {
        const ref = searchParams.get('ref');
        if (ref) {
            localStorage.setItem('referralCode', ref);
        }
    }, [searchParams]);

    const ownerRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'complimentOwners', user.uid);
    }, [user, firestore]);

    const { data: ownerData, isLoading: ownerLoading } = useDoc<ComplimentOwner>(ownerRef);

    if (userLoading || ownerLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <>
            <Header title="Үүсгэх" showBackButton={true} />
            <div className="container mx-auto max-w-2xl p-4 py-8">
                <div className="space-y-6">
                    <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                        <ShareLink ownerData={ownerData} ownerLoading={ownerLoading} />
                    </div>

                    {/* Only show generators if user has a share link (meaning they are ready to receive) */}
                    {ownerData?.shareUrl && (
                        <>
                            <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                                <StoryGenerator ownerData={ownerData} />
                            </div>
                            <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                                <ComplimentStoryGenerator />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
