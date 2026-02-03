'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Compliment } from '@/types';
import { createStoryAction } from '@/app/compliments/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, FileText, Share2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function ComplimentStoryGenerator() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isGenerating, setIsGenerating] = useState(false);
    const [story, setStory] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const complimentsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'complimentOwners', user.uid, 'compliments'),
            orderBy('createdAt', 'desc')
        );
    }, [user, firestore]);

    const { data: compliments, isLoading: complimentsLoading } = useCollection<Compliment>(complimentsQuery);

    const handleGenerateStory = async () => {
        if (!compliments || compliments.length === 0) {
            toast({
                title: "Түүх үүсгэх боломжгүй",
                description: "Танд хангалттай wispr цуглаагүй байна.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);
        const complimentTexts = compliments.map(c => c.text);

        try {
            const result = await createStoryAction(complimentTexts);
            if (result.success && result.story) {
                setStory(result.story);
                setIsDialogOpen(true);
            } else {
                toast({
                    title: "Алдаа гарлаа",
                    description: result.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Алдаа гарлаа",
                description: "Түүх үүсгэж чадсангүй. Түр хүлээгээд дахин оролдоно уу.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShareStory = async () => {
        if (!story) return;
        const shareText = `Миний "Wispr"-ын түүх:\n\n"${story}"\n\nТа ч бас өөрийн линкээ үүсгээрэй!`;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Миний Wispr түүх', text: shareText })
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                if (!(error instanceof Error && error.name === 'NotAllowedError')) {
                    navigator.clipboard.writeText(shareText);
                    toast({ title: "Хуулагдлаа!", description: "Түүхээ хуваалцахад бэлэн боллоо." })
                }
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({ title: "Хуулагдлаа!", description: "Түүхээ хуваалцахад бэлэн боллоо." })
        }
    }

    const isLoading = userLoading || complimentsLoading;

    if (isLoading) {
        return <Skeleton className="h-48 w-full rounded-lg" />;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold px-2">📖 Таны түүх</h2>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><FileText className="w-6 h-6 text-primary" /> Миний түүхийг бүтээх</CardTitle>
                    <CardDescription>
                        AI танд ирсэн бүх wispr-үүдийг уншиж, зөвхөн танд зориулсан урам зоригтой түүхийг бичиж өгнө.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateStory} disabled={isGenerating || !compliments || compliments.length < 3} className="w-full">
                        {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Түүх үүсгэх
                    </Button>
                    {compliments && compliments.length < 3 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">Сайн түүх бүтээхийн тулд дор хаяж 3 wispr шаардлагатай.</p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-black">Таны түүх</DialogTitle>
                        <DialogDescription className="text-center">
                            Бусад хүмүүс таныг ингэж хардаг.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 px-2 my-4 bg-secondary rounded-lg border max-h-[50vh] overflow-y-auto">
                        <p className="text-foreground leading-relaxed whitespace-pre-line">{story}</p>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleShareStory} className="w-full">
                            <Share2 className="mr-2 h-4 w-4" /> Хуваалцах
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
