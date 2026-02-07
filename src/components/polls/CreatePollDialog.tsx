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

            toast({ title: 'Амжилттай', description: 'Санал асуулга үүслээ.' });
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
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Санал асуулга үүсгэх
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Санал асуулга үүсгэх</DialogTitle>
                    <DialogDescription>
                        Таны профайл дээр зочилсон хүмүүс санал өгөх боломжтой.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Асуулт</Label>
                        <Input
                            placeholder="Жишээ: Намайг ямар амьтантай зүйрлэх вэ?"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Сонголтууд</Label>
                        {options.map((option, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    placeholder={`Сонголт ${index + 1}`}
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                />
                                {options.length > 2 && (
                                    <Button variant="ghost" size="icon" onClick={() => removeOption(index)} className="shrink-0 text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        {options.length < 5 && (
                            <Button variant="outline" size="sm" onClick={addOption} className="w-full mt-2 border-dashed">
                                <Plus className="h-4 w-4 mr-2" /> Сонголт нэмэх
                            </Button>
                        )}
                    </div>

                    <Button onClick={handleCreate} disabled={loading} className="w-full mt-4">
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Үүсгэх
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
