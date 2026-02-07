'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { CreatePollDialog } from './CreatePollDialog';
import { PollCard } from './PollCard';
import type { Poll } from '@/types';
import { Loader2, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function PollManager() {
    const { user } = useUser();
    const firestore = useFirestore();



    // Construct query
    const pollsQuery = useMemoFirebase(() => user && firestore ? query(
        collection(firestore, 'complimentOwners', user.uid, 'polls'),
        orderBy('createdAt', 'desc')
    ) : null, [user, firestore]);

    const { data: pollsData, isLoading } = useCollection<Poll>(pollsQuery);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold">Таны Санал Асуулгууд</h3>
                    <p className="text-sm text-muted-foreground">Одоогоор идэвхтэй байгаа болон дууссан санал асуулгууд.</p>
                </div>
                <CreatePollDialog onPollCreated={() => { }} />
                {/* useCollection updates automatically, so no need for manual refresh usually, but callback is good for toast etc */}
            </div>

            <div className="grid gap-4">
                {pollsData && pollsData.length > 0 ? (
                    pollsData.map(poll => (
                        <PollCard key={poll.id} poll={poll} isOwner={true} />
                    ))
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/30">
                        <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <h4 className="font-semibold text-muted-foreground">Санал асуулга алга</h4>
                        <p className="text-sm text-muted-foreground/80 mt-1">Та шинэ санал асуулга үүсгэж хүмүүсийн бодлыг мэдээрэй.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
