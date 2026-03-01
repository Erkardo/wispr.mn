import { Skeleton } from '@/components/ui/skeleton';

export default function GlobalLoading() {
    return (
        <div className="w-full min-h-screen bg-background flex flex-col items-center p-4">
            {/* Header Skeleton */}
            <div className="w-full max-w-2xl h-16 bg-muted/20 animate-pulse rounded-2xl mb-8 border border-white/5" />

            {/* Content Skeletons */}
            <div className="w-full max-w-2xl space-y-6">
                <div className="w-full h-12 bg-muted/30 animate-pulse rounded-full border border-white/5 mb-6 opacity-80" />
                <div className="w-full min-h-[350px] bg-muted/40 animate-pulse rounded-[3rem] border border-white/5 shadow-inner" />
                <div className="w-full min-h-[350px] bg-muted/30 animate-pulse rounded-[3rem] border border-white/5" />
                <div className="w-full min-h-[350px] bg-muted/20 animate-pulse rounded-[3rem] border border-white/5" />
            </div>
        </div>
    );
}
