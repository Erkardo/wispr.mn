'use client';

import { getLevel, getNextLevel } from '@/lib/gamification';
import { Trophy, ArrowUpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LevelProgressProps {
    xp: number;
}

export function LevelProgress({ xp }: LevelProgressProps) {
    const currentLevel = getLevel(xp);
    const nextLevel = getNextLevel(xp);

    const currentLevelMinXp = currentLevel?.minXp || 0;
    const nextLevelMinXp = nextLevel?.minXp || (currentLevel?.minXp || 0) + 1000;
    const xpNeeded = nextLevelMinXp - xp;
    const isMaxLevel = !nextLevel;

    // Calculate percentage, maxing at 100%
    const progressPerc = isMaxLevel ? 100 : Math.min(100, Math.max(0, ((xp - currentLevelMinXp) / (nextLevelMinXp - currentLevelMinXp)) * 100));

    return (
        <div className="space-y-5">
            {/* Header: Trophy, Level, Current XP */}
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-2xl shadow-inner shadow-white/40 ring-4 ring-yellow-500/20 shrink-0">
                        <Trophy className="h-6 w-6 text-yellow-950" />
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-white/20 blur-md rounded-2xl -z-10" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Таны зэрэглэл</p>
                        <h3 className="text-xl font-black bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent leading-none">
                            {currentLevel?.title || 'Шинэков'}
                        </h3>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Нийт XP</p>
                    <p className="text-2xl font-black leading-none">{xp.toLocaleString()}</p>
                </div>
            </div>

            {/* Progress Bar Section */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Түвшин {currentLevel?.level || 1}</span>
                    {!isMaxLevel && <span className="text-muted-foreground">Түвшин {(currentLevel?.level || 1) + 1}</span>}
                </div>

                {/* Custom Animated Progress Bar */}
                <div className="relative h-4 w-full bg-muted/60 rounded-full overflow-hidden shadow-inner flex items-center p-0.5">
                    <motion.div
                        className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPerc}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    >
                        {/* Animated shimmer effect inside the bar */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] animate-shimmer" />
                    </motion.div>
                </div>

                {/* Footer: XP Remaining */}
                {!isMaxLevel ? (
                    <div className="flex items-center justify-center gap-1.5 pt-1 text-xs font-medium text-muted-foreground/80">
                        <ArrowUpCircle className="w-3.5 h-3.5 text-orange-400" />
                        <span>Дараагийн цолонд хүрэхэд <strong className="text-foreground">{xpNeeded.toLocaleString()} XP</strong> дутуу байна</span>
                    </div>
                ) : (
                    <div className="flex justify-center pt-1 text-xs font-bold text-yellow-600 bg-yellow-100/50 py-1 rounded-lg">
                        Та хамгийн дээд түвшинд хүрсэн байна! 👑
                    </div>
                )}
            </div>
        </div>
    );
}
