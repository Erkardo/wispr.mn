'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const controls = useAnimation();
    const y = useMotionValue(0);

    // Constrain the pull distance
    const pullDistance = 80;
    const rotate = useTransform(y, [0, pullDistance], [0, 360]);
    const opacity = useTransform(y, [0, pullDistance / 2, pullDistance], [0, 0.5, 1]);
    const scale = useTransform(y, [0, pullDistance], [0.5, 1]);

    const handlePan = (event: any, info: any) => {
        if (isRefreshing) return;

        // Only allow pulling down if at top
        if (window.scrollY === 0 && info.offset.y > 0) {
            y.set(info.offset.y * 0.4); // Resistance factor
        }
    };

    const handlePanEnd = async (event: any, info: any) => {
        if (isRefreshing) return;

        if (y.get() >= pullDistance) {
            setIsRefreshing(true);
            y.set(pullDistance);

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(10); // Subtle tick
            }

            await onRefresh();

            setIsRefreshing(false);
            y.set(0);
        } else {
            y.set(0);
        }
    };

    return (
        <div className="relative w-full">
            <motion.div
                onPan={handlePan}
                onPanEnd={handlePanEnd}
                style={{ y }}
                className="relative z-10 bg-background"
            >
                {children}
            </motion.div>

            {/* Pull indicator */}
            <motion.div
                style={{
                    opacity,
                    scale,
                    top: 10,
                    left: '50%',
                    translateX: '-50%'
                }}
                className="absolute z-0 flex items-center justify-center pointer-events-none"
            >
                <div className="relative">
                    {/* Sonar rings */}
                    {isRefreshing && (
                        <>
                            <motion.div
                                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="absolute inset-0 rounded-full bg-primary/20"
                            />
                            <motion.div
                                animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                className="absolute inset-0 rounded-full bg-primary/10"
                            />
                        </>
                    )}

                    <motion.div
                        style={{ rotate: isRefreshing ? undefined : rotate }}
                        animate={isRefreshing ? { rotate: 360 } : {}}
                        transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                        className="bg-primary/10 p-3 rounded-full backdrop-blur-md border border-primary/20 shadow-lg"
                    >
                        {isRefreshing ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : (
                            <RefreshCw className="w-5 h-5 text-primary" />
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
