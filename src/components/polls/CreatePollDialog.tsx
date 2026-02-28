'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';

interface CreatePollDialogProps {
    onPollCreated: () => void;
}

import { motion, AnimatePresence } from 'framer-motion';

export function CreatePollDialog({ onPollCreated }: CreatePollDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']); // Start with 2 empty options
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleCreate = async () => {
        if (!user || !firestore) return;

        // Filter out empty options
        const validOptions = options.filter(o => o.trim() !== '');

        // Validation
        if (!question.trim()) {
            toast({ title: 'Алдаа', description: 'Асуултаа бичнэ үү.', variant: 'destructive' });
            return;
        }
        if (validOptions.length < 2) {
            toast({ title: 'Алдаа', description: 'Дор хаяж 2 сонголт оруулна уу.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const pollsRef = collection(firestore, 'complimentOwners', user.uid, 'polls');

            const newPollData = {
                ownerId: user.uid,
                question,
                type: validOptions.length > 0 ? 'choice' : 'text',
                options: validOptions.map((text, index) => ({
                    id: `opt-${index}-${Date.now()}`,
                    text,
                    votes: 0
                })),
                isActive: true,
                createdAt: serverTimestamp(),
                responseCount: 0
            };

            await addDoc(pollsRef, newPollData);

            toast({ title: 'Амжилттай! 🎉', description: 'Санал асуулга үүслээ.' });
            setOpen(false);
            setQuestion('');
            setOptions(['', '']);
            onPollCreated();

        } catch (e) {
            console.error(e);
            toast({ title: 'Алдаа', description: 'Санал асуулга үүсгэхэд алдаа гарлаа.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        if (options.length < 5) {
            setOptions([...options, '']);
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 bg-primary text-primary-foreground font-bold rounded-full px-6">
                    <Plus className="h-4 w-4" />
                    Санал асуулга үүсгэх
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
                <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6 pb-2">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Санал асуулга үүсгэх</DialogTitle>
                        <DialogDescription className="text-sm">
                            Таны профайл дээр зочилсон хүмүүс санал өгөх боломжтой.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="p-6 pt-4 bg-background">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Асуулт</Label>
                            <Input
                                placeholder="Жишээ нь: Намайг ямар амьтантай зүйрлэх вэ?"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                className="h-12 bg-muted/40 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-transparent font-medium"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Сонголтууд (дээд тал нь 5)</Label>
                            <AnimatePresence>
                                {options.map((option, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex gap-2 items-center"
                                    >
                                        <div className="relative flex-grow">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-primary/40 bg-background" />
                                            <Input
                                                placeholder={`Сонголт ${index + 1}`}
                                                value={option}
                                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                                className="h-11 pl-9 bg-muted/20 border-border/50 rounded-xl focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 shadow-sm transition-all"
                                            />
                                        </div>
                                        {options.length > 2 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeOption(index)}
                                                className="shrink-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-full w-10 h-10 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {options.length < 5 && (
                                <motion.div layout>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addOption}
                                        className="w-full h-11 border-dashed border-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors mt-2"
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Сонголт нэмэх
                                    </Button>
                                </motion.div>
                            )}
                        </div>

                        <Button
                            onClick={handleCreate}
                            disabled={loading || question.trim().length === 0 || options.filter(o => o.trim() !== '').length < 2}
                            className="w-full h-12 rounded-xl font-bold text-base shadow-lg hover:shadow-primary/25 transition-all mt-4"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Үүсгэх"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
