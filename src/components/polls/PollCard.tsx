'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, StopCircle, RefreshCw, BarChart2 } from 'lucide-react';
import type { Poll, PollOption } from '@/types';
import { useState } from 'react';
import { votePollAction, togglePollStatusAction, deletePollAction } from '@/app/actions/polls';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { mn } from 'date-fns/locale';

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
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 }
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
                toast({ title: 'Баярлалаа', description: 'Санал амжилттай бүртгэгдлээ.' });
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
        <Card className={cn("w-full transition-all", !poll.isActive && "opacity-80 grayscale-[0.5]")}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold leading-tight">{poll.question}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                            {poll.createdAt && (
                                <span>{formatDistanceToNow(poll.createdAt.toDate(), { addSuffix: true, locale: mn })}</span>
                            )}
                            {poll.isActive ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Нээлттэй</Badge>
                            ) : (
                                <Badge variant="secondary">Хаагдсан</Badge>
                            )}
                        </CardDescription>
                    </div>
                    {isOwner && (
                        <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={handleToggleStatus} title={poll.isActive ? "Хаах" : "Нээх"}>
                                {poll.isActive ? <StopCircle className="h-4 w-4 text-orange-500" /> : <RefreshCw className="h-4 w-4 text-green-500" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleDelete} title="Устгах">
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {showResults ? (
                    <div className="space-y-3">
                        {poll.options?.map((option) => {
                            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                            return (
                                <div key={option.id} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className={cn(selectedOption === option.id && "font-bold text-primary")}>{option.text}</span>
                                        <span className="text-muted-foreground">{percentage}% ({option.votes})</span>
                                    </div>
                                    <Progress value={percentage} className="h-2" />
                                </div>
                            );
                        })}
                        <div className="pt-2 text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                            <BarChart2 className="h-3 w-3" /> Нийт {totalVotes} санал
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <RadioGroup onValueChange={setSelectedOption} className="gap-3">
                            {poll.options?.map((option) => (
                                <div key={option.id} className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent cursor-pointer">
                                    <RadioGroupItem value={option.id} id={option.id} />
                                    <Label htmlFor={option.id} className="flex-grow cursor-pointer font-medium">{option.text}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                        <Button onClick={handleVote} disabled={!selectedOption || loading} className="w-full">
                            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Санал өгөх
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
