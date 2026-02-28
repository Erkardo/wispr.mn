'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface SwipeBackProps {
    children: ReactNode;
    threshold?: number;
}

export function SwipeBack({ children, threshold = 100 }: SwipeBackProps) {
    const router = useRouter();
    const x = useMotionValue(0);
    const opacity = useTransform(x, [0, threshold], [1, 0.5]);
    const scale = useTransform(x, [0, threshold], [1, 0.98]);

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.x > threshold && info.velocity.x > 20) {
            router.back();
        } else {
            x.set(0);
        }
    };

    return (
        <motion.div
            style={{ x, opacity, scale }}
            drag="x"
            dragConstraints={{ left: 0, right: threshold + 50 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="min-h-screen touch-pan-y"
        >
            {children}
        </motion.div>
    );
}
