'use client';

import { Progress } from '@/components/ui/progress';
import { getLevel, getNextLevel, LEVELS } from '@/lib/gamification';
import { Trophy } from 'lucide-react';

interface LevelProgressProps {
    xp: number;
}

export function LevelProgress({ xp }: LevelProgressProps) {
    const currentLevel = getLevel(xp);
    const nextLevel = getNextLevel(xp);

    const currentLevelMinXp = currentLevel?.minXp || 0;
    const nextLevelMinXp = nextLevel?.minXp || (currentLevel?.minXp || 0) + 100; // Fallback if max level

    const progress = Math.min(100, Math.max(0, ((xp - currentLevelMinXp) / (nextLevelMinXp - currentLevelMinXp)) * 100));

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 text-yellow-700 p-1.5 rounded-full">
                        <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                        <span className="text-sm font-bold">Level {currentLevel?.level || 1}</span>
                        <span className="text-xs text-muted-foreground ml-2">{currentLevel?.title}</span>
                    </div>
                </div>
                <span className="text-xs text-muted-foreground">{xp} / {nextLevelMinXp} XP</span>
            </div>
            <Progress value={progress} className="h-2" />
        </div>
    );
}
