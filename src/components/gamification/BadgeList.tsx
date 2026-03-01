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
import { motion } from 'framer-motion';

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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 justify-items-center">
            <TooltipProvider>
                {allBadges.map((badge, idx) => {
                    const isEarned = earnedBadges.includes(badge.id) || newlyEarned.includes(badge.id);
                    const progress = badge.getProgress(stats);
                    const maxProgress = badge.maxProgress;
                    const progressPercentage = Math.min(100, Math.max(0, (progress / maxProgress) * 100));

                    return (
                        <Tooltip key={badge.id}>
                            <TooltipTrigger asChild>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, delay: idx * 0.05, ease: "easeOut" }}
                                    className={cn(
                                        "group relative flex flex-col items-center justify-center w-full aspect-square rounded-[1.5rem] transition-all duration-300 border",
                                        isEarned
                                            ? "bg-gradient-to-br from-yellow-50 via-white to-amber-50 border-yellow-200/50 shadow-md shadow-yellow-500/10 cursor-default"
                                            : "bg-muted/30 border-muted/50 grayscale-[0.8] opacity-80"
                                    )}
                                >
                                    {/* Inner Glow for earned badges */}
                                    {isEarned && <div className="absolute inset-0 bg-yellow-400/10 rounded-[1.5rem] blur-xl -z-10 group-hover:bg-yellow-400/20 transition-colors" />}

                                    <div className={cn(
                                        "text-3xl sm:text-4xl drop-shadow-sm transition-transform duration-300",
                                        isEarned ? "group-hover:scale-110 group-hover:-translate-y-1 group-hover:drop-shadow-md" : ""
                                    )}>
                                        {badge.icon}
                                    </div>

                                    {!isEarned && (
                                        <div className="absolute inset-x-3 bottom-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Progress Bar for Locked Badges */}
                                            <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                                <div className="h-full bg-foreground/40 rounded-full" style={{ width: `${progressPercentage}%` }} />
                                            </div>
                                            <span className="text-[9px] font-black text-center text-muted-foreground uppercase tracking-widest">{progress}/{maxProgress}</span>
                                        </div>
                                    )}

                                    {!isEarned && <Lock className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-muted-foreground/60 transition-opacity group-hover:opacity-0" />}
                                    {isEarned && (
                                        <div className="absolute top-2 right-2 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                        </div>
                                    )}
                                </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[200px] text-center p-3 rounded-2xl shadow-xl border-border/50">
                                <div className="space-y-1.5 hover:scale-105 transition-transform">
                                    <p className="font-black text-sm flex items-center justify-center gap-2 tracking-tight">
                                        {badge.icon} {badge.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-medium leading-snug">{badge.description}</p>
                                    {!isEarned && (
                                        <div className="mt-2 pt-2 border-t border-border/50">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Явц</p>
                                            <p className="text-xs font-black text-foreground">{progress} / {maxProgress}</p>
                                        </div>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </TooltipProvider>
        </div>
    );
}
