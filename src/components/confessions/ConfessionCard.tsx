'use client';

import type { Confession, ReactionEmoji } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reportConfessionAction, reactToConfessionAction } from '@/app/confessions/actions';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatTimeAgo } from '@/lib/format-time';
import { Separator } from '@/components/ui/separator';

const reactionEmojis: ReactionEmoji[] = ['❤️', '👍', '😢', '🔥'];

export function ConfessionCard({ confession }: { confession: Confession }) {
  const { toast } = useToast();
  const [localReactions, setLocalReactions] = useState(confession.reactionsCount);
  const [isReacting, setIsReacting] = useState<ReactionEmoji | null>(null);

  const handleReport = async () => {
    await reportConfessionAction(confession.id);
    toast({
      title: 'Мэдээлэл илгээгдлээ',
      description: 'Контентыг шалгах болно. Баярлалаа.',
    });
  };

  const handleReaction = async (reaction: ReactionEmoji) => {
    if (isReacting) return;
    setIsReacting(reaction);

    // Optimistic update
    const originalReactions = { ...localReactions };
    setLocalReactions(prev => ({ ...prev, [reaction]: (prev[reaction] || 0) + 1 }));

    try {
      await reactToConfessionAction(confession.id, reaction);
    } catch (error) {
      // Revert on error
      setLocalReactions(originalReactions);
      toast({ title: 'Алдаа', description: 'Түр хүлээгээд дахин оролдоно уу', variant: 'destructive' });
    } finally {
      setTimeout(() => setIsReacting(null), 500); // Prevent spamming
    }
  };

  return (
    <Card className="break-inside-avoid-column transition-transform duration-300 hover:-translate-y-1">
      <CardContent className="p-6 pb-4">
        <p className="text-foreground/90 text-base leading-relaxed whitespace-pre-wrap font-medium">{confession.text}</p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 p-4 pt-0">
        <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
          <div className="font-mono">
            {confession.createdAt && typeof confession.createdAt.toDate === 'function'
              ? formatTimeAgo(confession.createdAt.toDate())
              : ''}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground/70 hover:text-destructive h-8 w-8"
                aria-label="Сэтгэлийн үгийг мэдээлэх"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Та энэ постыг мэдээлэхдээ итгэлтэй байна уу?</AlertDialogTitle>
                <AlertDialogDescription>
                  Зохисгүй контентыг мэдээлснээр та бүгдэд тусалж байна.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                <AlertDialogAction onClick={handleReport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Мэдээлэх</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Separator className="my-0 w-full" />
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-1 sm:gap-2">
            {reactionEmojis.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(emoji)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 text-sm rounded-full bg-secondary hover:bg-secondary/80 hover:scale-110 transition-all transform-gpu",
                  isReacting === emoji && 'animate-pulse scale-125'
                )}
                aria-label={`'${emoji}'-р илэрхийлэх`}
                disabled={!!isReacting}
              >
                <span>{emoji}</span>
                <span className="font-mono text-xs text-muted-foreground min-w-[1ch]">{localReactions[emoji] || 0}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
