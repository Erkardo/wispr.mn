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
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { generateComplimentSuggestionsAction } from '@/app/actions/ai';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AISuggestionsDialogProps {
    onSelect: (text: string) => void;
}

export function AISuggestionsDialog({ onSelect }: AISuggestionsDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const { toast } = useToast();

    const [relationship, setRelationship] = useState('friend');
    const [tone, setTone] = useState('nice');
    const [keywords, setKeywords] = useState('');

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const result = await generateComplimentSuggestionsAction(relationship, tone, keywords);
            if (result.success && result.suggestions) {
                setSuggestions(result.suggestions);
            } else {
                toast({
                    title: "Алдаа",
                    description: "AI санал болгож чадсангүй.",
                    variant: "destructive",
                });
            }
        } catch (e) {
            console.error(e);
            toast({
                title: "Алдаа",
                description: "Холболтын алдаа гарлаа.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (text: string) => {
        onSelect(text);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                    <Sparkles className="h-4 w-4" />
                    AI-аар бичүүлэх
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>AI Туслах</DialogTitle>
                    <DialogDescription>
                        Та санаагаа хэл, хиймэл оюун ухаан танд гоё үгс санал болгоё.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Харилцаа</Label>
                            <Select value={relationship} onValueChange={setRelationship}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="friend">Найз</SelectItem>
                                    <SelectItem value="crush">Crush</SelectItem>
                                    <SelectItem value="coworker">Ажлын хүн</SelectItem>
                                    <SelectItem value="family">Гэр бүл</SelectItem>
                                    <SelectItem value="stranger">Танихгүй</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Өнгө аяс</Label>
                            <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nice">Эелдэг</SelectItem>
                                    <SelectItem value="funny">Хөгжилтэй</SelectItem>
                                    <SelectItem value="poetic">Яруу найргийн</SelectItem>
                                    <SelectItem value="flirty">Сээтэгнүүр</SelectItem>
                                    <SelectItem value="grateful">Талархсан</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Түлхүүр үг (Заавал биш)</Label>
                        <Input
                            placeholder="Жишээ: инээмсэглэл, нүд, тусч..."
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleGenerate} disabled={loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Эхлүүлэх
                    </Button>

                    {suggestions.length > 0 && (
                        <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-bottom-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Санал болгож буй хувилбарууд</Label>
                            {suggestions.map((text, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleSelect(text)}
                                    className="p-3 rounded-lg border bg-muted/50 hover:bg-muted hover:border-primary/50 cursor-pointer transition-colors text-sm"
                                >
                                    {text}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
