'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Header } from '@/components/Header';
import { Gift, BellOff, Trophy, Award } from 'lucide-react';
import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Compliment } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/lib/format-time';
import Link from 'next/link';
import { cn } from '@/lib/utils';


// Define a unified activity type
type Activity = {
  id: string;
  type: 'compliment' | 'milestone';
  icon: React.ElementType;
  text: string;
  subtext?: string;
  time: Date;
  href?: string;
  isRead: boolean;
};

export default function ActivityPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  // Fetch all compliments to calculate milestones
  const allComplimentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'complimentOwners', user.uid, 'compliments'),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);
  const { data: compliments, isLoading: complimentsLoading } = useCollection<Compliment>(allComplimentsQuery);

  const sortedComplimentsByDateAsc = useMemo(() => {
    if (!compliments) return [];
    // Sort oldest first to find when a milestone was hit
    return [...compliments].sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
  }, [compliments]);


  // Combine data into a single sorted activity feed
  const activities = useMemo(() => {
    if (!compliments) return [];

    const complimentActivities: Activity[] = (compliments || []).map((comp): Activity => ({
        id: `compliment-${comp.id}`,
        type: 'compliment',
        icon: Gift,
        text: comp.isRead ? 'Wispr' : 'Шинэ Wispr!',
        subtext: `"${comp.text.substring(0, 30)}..."`,
        time: comp.createdAt.toDate(),
        href: `/?complimentId=${comp.id}`,
        isRead: comp.isRead ?? false,
    }));

    const milestoneActivities: Activity[] = [];
    const MILESTONES = [
        { count: 1, text: 'Анхны wispr-ээ хүлээж авлаа! 🎉', icon: Award },
        { count: 10, text: '10 wispr цуглууллаа! 🏆', icon: Trophy },
        { count: 25, text: '25 wispr! Та алдаршиж байна. 🔥', icon: Trophy },
        { count: 50, text: '50 wispr! Гайхалтай! ✨', icon: Trophy },
    ];

    MILESTONES.forEach(milestone => {
        if (sortedComplimentsByDateAsc.length >= milestone.count) {
            const complimentAtMilestone = sortedComplimentsByDateAsc[milestone.count - 1];
            milestoneActivities.push({
                id: `milestone-${milestone.count}`,
                type: 'milestone',
                icon: milestone.icon,
                text: milestone.text,
                time: complimentAtMilestone.createdAt.toDate(),
                isRead: true, // Milestones are always "read"
            });
        }
    });

    const allActivities = [...complimentActivities, ...milestoneActivities];
    
    // Sort all activities by time, most recent first
    return allActivities.sort((a, b) => b.time.getTime() - a.time.getTime());

  }, [compliments, sortedComplimentsByDateAsc]);

  const isLoading = userLoading || complimentsLoading;

  return (
    <>
      <Header title="Идэвх" showBackButton={false} />
      <div className="container mx-auto max-w-2xl p-4 py-8">
        {isLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
            </div>
        ) : activities.length === 0 ? (
            <div className="text-center py-20 px-4 border-2 border-dashed rounded-2xl mt-8 bg-card/50">
              <BellOff className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Одоогоор идэвх байхгүй байна</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Линкээ хуваалцаж, анхны wispr-ээ хүлээж аваарай.
              </p>
            </div>
        ) : (
            <div className="flow-root">
              <ul className="space-y-1">
                {activities.map((activity, index) => (
                  <li 
                    key={activity.id}
                    className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500"
                    style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
                  >
                    <Link href={activity.href || '#'} className={cn(
                      "flex items-center gap-4 p-4 rounded-lg transition-colors",
                      activity.href ? 'hover:bg-secondary' : 'pointer-events-none'
                    )}>
                       <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        !activity.isRead && activity.type === 'compliment' ? 'bg-primary/10' : 'bg-secondary',
                        activity.type === 'milestone' && 'bg-amber-400/10'
                      )}>
                        <activity.icon className={cn(
                            "h-5 w-5",
                            !activity.isRead && activity.type === 'compliment' ? 'text-primary' : 'text-muted-foreground',
                            activity.type === 'milestone' && 'text-amber-500'
                        )} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                            "truncate text-sm",
                           !activity.isRead && activity.type === 'compliment' ? 'font-bold text-foreground' : 'font-medium text-foreground'
                        )}>{activity.text}</p>
                        {activity.subtext && (
                          <p className="text-sm text-muted-foreground truncate">{activity.subtext}</p>
                        )}
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-muted-foreground">
                        <time>{formatTimeAgo(activity.time)}</time>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
        )}
      </div>
    </>
  );
}
