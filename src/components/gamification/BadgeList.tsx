'use client';

import { useEffect, useState } from 'react';
import { Badge as BadgeIcon, Lock } from 'lucide-react';
import { BADGES, type Badge } from '@/lib/gamification';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface BadgeListProps {
    ownerId: string;
    earnedBadges: string[];
    stats: { totalCompliments: number; xp: number };
}

export function BadgeList({ ownerId, earnedBadges, stats }: BadgeListProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newlyEarned, setNewlyEarned] = useState<string[]>([]);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!firestore || !ownerId || checked) return;

        // Check for new badges
        const newBadges: string[] = [];
        BADGES.forEach(badge => {
            // Check if ALREADY earned (in earnedBadges or newlyEarned)
            const alreadyEarned = earnedBadges.includes(badge.id) || newlyEarned.includes(badge.id);
            if (!alreadyEarned && badge.condition(stats)) {
                newBadges.push(badge.id);
            }
        });

        if (newBadges.length > 0) {
            // Award badges
            const awardBadges = async () => {
                try {
                    // Update Firestore
                    const ownerRef = doc(firestore, 'complimentOwners', ownerId);
                    // We use arrayUnion to add multiple badges atomically
                    await updateDoc(ownerRef, {
                        badges: arrayUnion(...newBadges)
                    });

                    // Celebration (Toast)
                    newBadges.forEach(id => {
                        const badge = BADGES.find(b => b.id === id);
                        toast({
                            title: "Шинэ тэмдэг!",
                            description: `Та "${badge?.name}" тэмдэг авлаа!`,
                        });
                    });

                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });

                    setNewlyEarned(prev => [...prev, ...newBadges]);

                } catch (e) {
                    console.error("Failed to award badges", e);
                }
            };
            awardBadges();
        }
        setChecked(true); // Prevent repeated checks in same session unless stats change
    }, [stats]); // Re-run when stats change

    const allBadges = BADGES;

    return (
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
            <TooltipProvider>
                {allBadges.map(badge => {
                    const isEarned = earnedBadges.includes(badge.id) || newlyEarned.includes(badge.id);
                    return (
                        <Tooltip key={badge.id}>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "group relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 border-2",
                                    isEarned ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-sm scale-100" : "bg-muted/50 border-transparent grayscale opacity-60 scale-90"
                                )}>
                                    <div className="text-2xl drop-shadow-sm group-hover:scale-110 transition-transform">{badge.icon}</div>
                                    {/* <span className="text-[10px] font-bold text-center leading-tight">{badge.name}</span> */}
                                    {!isEarned && <Lock className="absolute top-1 right-1 h-3 w-3 text-muted-foreground" />}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[200px] text-center p-3">
                                <div className="space-y-1">
                                    <p className="font-bold flex items-center justify-center gap-2">
                                        {badge.icon} {badge.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                                    {!isEarned && <p className="text-[10px] font-medium text-destructive mt-1 uppercase tracking-wider">Түгжээтэй</p>}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </TooltipProvider>
        </div>
    );
}
