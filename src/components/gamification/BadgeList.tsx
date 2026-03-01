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

    const getBadgeStyles = (id: string) => {
        switch (id) {
            case 'first_wispr': return {
                cardBg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
                iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
                glow: 'bg-blue-400/30',
                shadow: 'shadow-blue-500/30',
                border: 'border-blue-200',
                ring: 'ring-blue-100/50'
            };
            case 'popular_5': return {
                cardBg: 'bg-gradient-to-br from-orange-50 to-red-50',
                iconBg: 'bg-gradient-to-br from-orange-400 to-red-500',
                glow: 'bg-orange-400/30',
                shadow: 'shadow-orange-500/30',
                border: 'border-orange-200',
                ring: 'ring-orange-100/50'
            };
            case 'club_20': return {
                cardBg: 'bg-gradient-to-br from-cyan-50 to-blue-50',
                iconBg: 'bg-gradient-to-br from-cyan-300 to-blue-500',
                glow: 'bg-cyan-400/30',
                shadow: 'shadow-cyan-500/30',
                border: 'border-cyan-200',
                ring: 'ring-cyan-100/50'
            };
            case 'club_50': return {
                cardBg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
                iconBg: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500',
                glow: 'bg-yellow-400/30',
                shadow: 'shadow-yellow-500/30',
                border: 'border-yellow-200',
                ring: 'ring-yellow-100/50'
            };
            case 'xp_500': return {
                cardBg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
                iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
                glow: 'bg-emerald-400/30',
                shadow: 'shadow-emerald-500/30',
                border: 'border-emerald-200',
                ring: 'ring-emerald-100/50'
            };
            case 'xp_1000': return {
                cardBg: 'bg-gradient-to-br from-purple-50 to-pink-50',
                iconBg: 'bg-gradient-to-br from-purple-400 via-fuchsia-500 to-pink-500',
                glow: 'bg-purple-400/30',
                shadow: 'shadow-purple-500/30',
                border: 'border-purple-200',
                ring: 'ring-purple-100/50'
            };
            default: return {
                cardBg: 'bg-gradient-to-br from-slate-50 to-gray-50',
                iconBg: 'bg-gradient-to-br from-slate-400 to-gray-500',
                glow: 'bg-slate-400/30',
                shadow: 'shadow-slate-500/30',
                border: 'border-slate-200',
                ring: 'ring-slate-100/50'
            };
        }
    };

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 justify-items-center">
            <TooltipProvider>
                {allBadges.map((badge, idx) => {
                    const isEarned = earnedBadges.includes(badge.id) || newlyEarned.includes(badge.id);
                    const progress = badge.getProgress(stats);
                    const maxProgress = badge.maxProgress;
                    const progressPercentage = Math.min(100, Math.max(0, (progress / maxProgress) * 100));
                    const styles = getBadgeStyles(badge.id);

                    return (
                        <Tooltip key={badge.id}>
                            <TooltipTrigger asChild>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: idx * 0.05, type: "spring", stiffness: 200, damping: 15 }}
                                    className={cn(
                                        "group relative flex flex-col items-center justify-center w-full aspect-square rounded-[1.75rem] transition-all duration-500 border overflow-hidden",
                                        isEarned
                                            ? cn(styles.cardBg, styles.border, `shadow-lg ${styles.shadow} cursor-default hover:shadow-xl hover:-translate-y-1`)
                                            : "bg-muted/30 border-muted/50 grayscale-[0.6] opacity-70"
                                    )}
                                >
                                    {/* Ambient background glow */}
                                    {isEarned && <div className={cn("absolute inset-0 blur-2xl -z-10 group-hover:opacity-100 transition-opacity opacity-40", styles.glow)} />}

                                    {/* The Premium Medallion */}
                                    <div className={cn(
                                        "relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-inner ring-4 transition-transform duration-500 ease-out z-10",
                                        isEarned ? cn(styles.iconBg, styles.ring, "group-hover:scale-110 group-hover:-translate-y-1 group-hover:rotate-6") : "bg-muted ring-white/10"
                                    )}>
                                        {/* Glossy 3D shine effect */}
                                        {isEarned && (
                                            <>
                                                <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent rounded-full opacity-60" />
                                                <div className="absolute top-1 right-2 w-3 h-2 bg-white/40 rounded-full blur-[1px] rotate-[-45deg]" />
                                            </>
                                        )}
                                        <span className={cn(
                                            "text-2xl sm:text-3xl relative z-20 drop-shadow-md",
                                            !isEarned && "opacity-50"
                                        )}>
                                            {badge.icon}
                                        </span>
                                    </div>

                                    {/* Unearned Progress Context */}
                                    {!isEarned && (
                                        <div className="absolute inset-x-3 bottom-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                            <div className="h-1.5 w-full bg-muted-foreground/20 rounded-full overflow-hidden shadow-inner">
                                                <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${progressPercentage}%` }} />
                                            </div>
                                            <span className="text-[9px] font-black text-center text-muted-foreground uppercase tracking-widest">{progress}/{maxProgress}</span>
                                        </div>
                                    )}

                                    {/* Locks and Pings */}
                                    {!isEarned && <Lock className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground/70 transition-opacity group-hover:opacity-0" />}
                                    {isEarned && newlyEarned.includes(badge.id) && (
                                        <div className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500 shadow-sm border border-yellow-200"></span>
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
