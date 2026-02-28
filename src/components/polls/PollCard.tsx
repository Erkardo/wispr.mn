'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, StopCircle, RefreshCw, BarChart2, MoreVertical } from 'lucide-react';
import type { Poll, PollOption } from '@/types';
import { useState } from 'react';
import { votePollAction, togglePollStatusAction, deletePollAction } from '@/app/actions/polls';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { mn } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

interface PollCardProps {
    poll: Poll;
    isOwner?: boolean;
    onUpdate?: () => void;
    publicView?: boolean;
}

export function PollCard({ poll, isOwner, onUpdate, publicView }: PollCardProps) {
    const [loading, setLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false); // In a real app, check cookie or local storage
    const { toast } = useToast();

    // Local storage check for voting
    // TODO: Implement actual persistent check. For now just state.

    // Add confetti trigger on vote
    const triggerConfetti = () => {
        import('canvas-confetti').then((confetti) => {
            confetti.default({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#8b5cf6', '#d946ef', '#f43f5e']
            });
        });
    };

    const handleVote = async () => {
        if (!selectedOption) return;
        setLoading(true);
        try {
            const result = await votePollAction(poll.ownerId, poll.id, selectedOption);
            if (result.success) {
                setHasVoted(true);
                toast({ title: 'Баярлалаа! 🎉', description: 'Санал амжилттай бүртгэгдлээ.' });
                triggerConfetti();
                onUpdate?.();
            } else {
                toast({ title: 'Алдаа', description: result.message, variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Алдаа', description: 'Холболтын алдаа', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!confirm(poll.isActive ? 'Санал асуулгыг хаах уу?' : 'Санал асуулгыг нээх үү?')) return;
        try {
            await togglePollStatusAction(poll.ownerId, poll.id, !poll.isActive);
            onUpdate?.();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Санал асуулгыг устгах уу?')) return;
        try {
            await deletePollAction(poll.ownerId, poll.id);
            onUpdate?.();
        } catch (e) {
            console.error(e);
        }
    };

    const totalVotes = poll.responseCount || 0;
    const showResults = isOwner || hasVoted || (!poll.isActive && publicView);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            <Card className={cn(
                "w-full overflow-hidden transition-all duration-500 border-none shadow-lg",
                poll.isActive
                    ? "bg-gradient-to-br from-indigo-500/[0.03] via-purple-500/[0.05] to-pink-500/[0.02] dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10"
                    : "opacity-80 grayscale-[0.3] bg-muted/20"
            )}>
                <CardHeader className="pb-4 border-b border-white/10 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md relative z-10">
                    <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                {poll.isActive ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-semibold ring-1 ring-green-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        Нээлттэй
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 text-xs font-semibold ring-1 ring-zinc-500/20">
                                        Хаагдсан
                                    </div>
                                )}
                                {poll.createdAt && (
                                    <span className="text-xs font-medium text-muted-foreground/80">
                                        {formatDistanceToNow(poll.createdAt.toDate(), { addSuffix: true, locale: mn })}
                                    </span>
                                )}
                            </div>
                            <CardTitle className="text-xl font-bold leading-snug tracking-tight text-foreground/90">
                                {poll.question}
                            </CardTitle>
                        </div>
                        {isOwner && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                    <DropdownMenuItem onClick={handleToggleStatus} className="cursor-pointer font-medium">
                                        {poll.isActive ? (
                                            <><StopCircle className="h-4 w-4 mr-2 text-orange-500" /> Хаах</>
                                        ) : (
                                            <><RefreshCw className="h-4 w-4 mr-2 text-green-500" /> Нээх</>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} className="cursor-pointer font-medium text-destructive focus:bg-destructive/10">
                                        <Trash2 className="h-4 w-4 mr-2" /> Устгах
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6 relative">
                    <AnimatePresence mode="wait">
                        {showResults ? (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="space-y-4"
                            >
                                {poll.options?.map((option, idx) => {
                                    const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                                    const isWinner = totalVotes > 0 && option.votes === Math.max(...poll.options!.map(o => o.votes));
                                    const isSelected = selectedOption === option.id;

                                    return (
                                        <motion.div
                                            key={option.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="relative"
                                        >
                                            <div className="mb-2 flex justify-between text-sm font-medium z-10 relative px-1">
                                                <span className={cn(
                                                    "transition-colors",
                                                    (isSelected || isWinner) ? "text-foreground font-bold" : "text-muted-foreground"
                                                )}>
                                                    {option.text}
                                                    {isSelected && " ✓"}
                                                </span>
                                                <span className={isWinner ? "font-bold text-primary" : "text-muted-foreground"}>
                                                    {percentage}% <span className="text-xs opacity-70">({option.votes})</span>
                                                </span>
                                            </div>
                                            <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden relative">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.1 }}
                                                    className={cn(
                                                        "h-full rounded-full transition-all",
                                                        isWinner
                                                            ? "bg-gradient-to-r from-primary to-purple-500"
                                                            : "bg-muted-foreground/30"
                                                    )}
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="pt-4 text-xs font-semibold tracking-wide text-center uppercase text-muted-foreground/70 flex items-center justify-center gap-1.5"
                                >
                                    <BarChart2 className="h-3.5 w-3.5" /> Нийт {totalVotes} хүн санал өгсөн
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="vote"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <RadioGroup onValueChange={setSelectedOption} className="gap-3">
                                    {poll.options?.map((option) => (
                                        <Label
                                            key={option.id}
                                            htmlFor={option.id}
                                            className={cn(
                                                "flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer",
                                                selectedOption === option.id
                                                    ? "border-primary bg-primary/5 shadow-[0_4px_20px_-10px_rgba(139,92,246,0.3)]"
                                                    : "border-transparent bg-muted/40 hover:bg-muted/60 hover:scale-[1.01]"
                                            )}
                                        >
                                            <div className="flex-grow text-base font-semibold text-foreground/90">{option.text}</div>
                                            <RadioGroupItem
                                                value={option.id}
                                                id={option.id}
                                                className="w-5 h-5 ml-3"
                                            />
                                        </Label>
                                    ))}
                                </RadioGroup>

                                <Button
                                    onClick={handleVote}
                                    disabled={!selectedOption || loading}
                                    className="w-full h-12 text-base font-bold shadow-lg transition-all rounded-xl hover:shadow-primary/25 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        "Санал илгээх"
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
}
