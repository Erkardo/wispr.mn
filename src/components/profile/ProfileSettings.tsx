'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateProfileSettingsAction } from '@/app/profile/settings-action';
import { Loader2, BellRing, BellOff, ChevronDown, User, AtSign, AlignLeft, School, Briefcase } from 'lucide-react';
import type { ComplimentOwner } from '@/types';
import { useFCM } from '@/firebase';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
    username: z.string().min(3, "Хамгийн багадаа 3 үсэг/тоо байна.").max(20, "Хэтэрхий урт байна.").regex(/^[a-zA-Z0-9_.]+$/, "Зөвхөн англи үсэг, тоо, цэг, доогуур зураас зөвшөөрнө."),
    displayName: z.string().min(2, "Нэрээ оруулна уу.").max(30),
    bio: z.string().max(150, "Хэтэрхий урт байна.").optional().default(''),
    school: z.string().max(50).optional().default(''),
    workplace: z.string().max(50).optional().default(''),
    isPublic: z.boolean().default(false),
});

interface ProfileSettingsProps {
    ownerId: string;
    ownerData: ComplimentOwner | null;
}

export function ProfileSettings({ ownerId, ownerData }: ProfileSettingsProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const { permission, requestPermission, isSupportedBrowser } = useFCM();
    const [isRequestingPerm, setIsRequestingPerm] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            username: ownerData?.username || '',
            displayName: ownerData?.displayName || '',
            bio: ownerData?.bio || '',
            school: ownerData?.school || '',
            workplace: ownerData?.workplace || '',
            isPublic: ownerData?.isPublic || false,
        },
    });

    // Reset when fresh data comes in
    useEffect(() => {
        if (ownerData) {
            form.reset({
                username: ownerData.username || '',
                displayName: ownerData.displayName || '',
                bio: ownerData.bio || '',
                school: ownerData.school || '',
                workplace: ownerData.workplace || '',
                isPublic: ownerData.isPublic || false,
            });
        }
    }, [ownerData, form]);

    async function onSubmit(data: z.infer<typeof profileSchema>) {
        setIsSaving(true);
        try {
            const res = await updateProfileSettingsAction(ownerId, data);
            if (res.success) {
                toast({ title: 'Амжилттай', description: res.message });
            } else {
                toast({ title: 'Алдаа', description: res.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Алдаа', description: 'Хадгалахад алдаа гарлаа.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }

    const handleEnableNotifications = async () => {
        setIsRequestingPerm(true);
        const success = await requestPermission();
        if (success) {
            toast({ title: 'Мэдэгдэл идэвхжлээ!', description: 'Шинэ зурвас ирэх үед танд мэдэгдэх болно.' });
        } else {
            toast({ title: 'Мэдэгдэл асаах боломжгүй байна', description: 'Хөтөч дээрээ notification permission өгсөн эсэхээ шалгана уу.', variant: 'destructive' });
        }
        setIsRequestingPerm(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

                <div className="space-y-8">
                    <Card className="glass-morphism">
                        <CardContent className="p-8">
                            <FormField
                                control={form.control}
                                name="isPublic"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between gap-6">
                                        <div className="space-y-1.5">
                                            <FormLabel className="text-xl font-black tracking-tight">Нийтийн профайл</FormLabel>
                                            <FormDescription className="text-xs leading-relaxed max-w-[220px] opacity-60 font-medium">
                                                Бусад хүмүүс таныг Радараар олж харах боломжтой.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className="scale-125 data-[state=checked]:bg-primary"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Mэдэгдэл (Notifications) Toggle Card */}
                    {isSupportedBrowser && (
                        <Card className="glass-morphism">
                            <CardContent className="p-8">
                                <div className="flex flex-row items-center justify-between gap-6">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2.5 rounded-2xl transition-colors",
                                                permission === 'granted' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                            )}>
                                                {permission === 'granted' ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                                            </div>
                                            <Label className="text-xl font-black tracking-tight border-none">Мэдэгдэл</Label>
                                        </div>
                                        <p className="text-xs leading-relaxed max-w-[220px] text-muted-foreground/60 font-medium">
                                            Шинэ wispr ирэх үед танд шууд мэдэгдэнэ.
                                        </p>
                                    </div>
                                    <div>
                                        {permission === 'granted' ? (
                                            <div className="flex items-center gap-2 text-primary font-black text-sm bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                Идэвхтэй
                                            </div>
                                        ) : (
                                            <Button type="button" variant="premium" size="sm" onClick={handleEnableNotifications} disabled={isRequestingPerm} className="rounded-full">
                                                {isRequestingPerm ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Асаах"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-6 px-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-6 w-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/70">Үндсэн мэдээлэл</h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Username</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                                            <AtSign className="absolute left-5 top-1/2 -translate-y-1/2 text-primary w-5 h-5 z-20" />
                                            <Input
                                                placeholder="boldoo_123"
                                                className="h-14 pl-12 relative z-10 font-mono font-bold text-lg bg-secondary/30 backdrop-blur-md"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Дэлгэцийн нэр</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-5 h-5 z-20" />
                                            <Input
                                                placeholder="Овог Нэр"
                                                className="h-14 pl-12 font-black text-lg bg-secondary/30 backdrop-blur-md"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem className="mt-4">
                                    <FormLabel className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Таны тухай (Bio)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <AlignLeft className="absolute left-5 top-5 text-muted-foreground/40 w-5 h-5 z-20" />
                                            <Textarea
                                                placeholder="Өөрийнхөө тухай товчхон..."
                                                className="bg-secondary/30 backdrop-blur-md font-medium text-lg leading-relaxed pl-12"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <div className="flex justify-end pr-2">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            (field.value?.length || 0) > 130 ? "text-orange-500" : "text-muted-foreground/40"
                                        )}>
                                            {field.value?.length || 0} / 150
                                        </span>
                                    </div>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <div className="pt-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between h-14 rounded-2xl bg-secondary/20 hover:bg-secondary/40 border border-white/5 px-6 group"
                            >
                                <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/70 group-hover:text-primary transition-colors">Нэмэлт Мэдээлэл</span>
                                <div className={cn(
                                    "p-1.5 rounded-full transition-transform duration-300",
                                    showAdvanced ? "rotate-180 bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </Button>
                        </div>

                        {showAdvanced && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500 pt-2">
                                <FormField
                                    control={form.control}
                                    name="school"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Сургууль</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <School className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-5 h-5 z-20" />
                                                    <Input
                                                        placeholder="МУИС, СЭЗИС..."
                                                        className="h-14 pl-12 font-bold bg-secondary/30 backdrop-blur-md"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-bold" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="workplace"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Ажлын газар</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-5 h-5 z-20" />
                                                    <Input
                                                        placeholder="Голомт, Хаан..."
                                                        className="h-14 pl-12 font-bold bg-secondary/30 backdrop-blur-md"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-bold" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-8">
                    <Button
                        type="submit"
                        variant="premium"
                        size="lg"
                        className="w-full shadow-2xl h-16 rounded-[2rem] text-lg font-black"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>Шинэчилж байна...</span>
                            </div>
                        ) : (
                            "Өөрчлөлтийг хадгалах"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
