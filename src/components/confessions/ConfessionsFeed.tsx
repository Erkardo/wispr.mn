'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Confession } from '@/types';
import { getConfessions } from '@/lib/db';
import { ConfessionCard } from './ConfessionCard';
import { ConfessionForm } from './ConfessionForm';
import { Loader2, Sparkles } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

type ConfessionsFeedProps = {
  initialData: {
    confessions: Confession[];
    lastVisible: any;
  };
};

export function ConfessionsFeed({ initialData }: ConfessionsFeedProps) {
  const [confessions, setConfessions] = useState<Confession[]>(initialData.confessions);
  const [lastVisible, setLastVisible] = useState<any>(initialData.lastVisible);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.confessions.length > 0);
  const { ref, inView } = useInView({ threshold: 0.5 });

  const loadMoreConfessions = useCallback(async () => {
    if (isLoading || !hasMore || !lastVisible) return;
    setIsLoading(true);
    const { confessions: newConfessions, lastVisible: newLastVisible } = await getConfessions(10, lastVisible);
    
    setConfessions(prev => [...prev, ...newConfessions]);
    setLastVisible(newLastVisible);
    
    if (newConfessions.length < 10) {
      setHasMore(false);
    }
    setIsLoading(false);
  }, [isLoading, hasMore, lastVisible]);
  
  useEffect(() => {
    if (inView) {
      loadMoreConfessions();
    }
  }, [inView, loadMoreConfessions]);

  return (
    <>
      <div className="columns-1 md:columns-2 gap-6 space-y-6">
        {confessions.map((confession) => (
          <ConfessionCard key={confession.id} confession={confession} />
        ))}
      </div>

      {confessions.length === 0 && !isLoading && (
        <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg mt-8">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Одоогоор сэтгэлийн үг алга байна</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                Сэтгэлийн үгээ хуваалцсан анхны хүн болоорой.
            </p>
        </div>
      )}

      {hasMore && (
        <div ref={ref} className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasMore && confessions.length > 0 && (
         <div className="text-center py-8 text-muted-foreground">
            Цааш унших пост алга байна.
         </div>
      )}
      <ConfessionForm />
    </>
  );
}
