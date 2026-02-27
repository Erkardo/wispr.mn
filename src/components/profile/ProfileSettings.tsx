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
import { useToast } from '@/hooks/use-toast';
import { updateProfileSettingsAction } from '@/app/profile/settings-action';
import { Loader2 } from 'lucide-react';
import type { ComplimentOwner } from '@/types';

const profileSchema = z.object({
    username: z.string().min(3, "Хамгийн багадаа 3 үсэг/тоо байна.").max(20, "Хэтэрхий урт байна.").regex(/^[a-zA-Z0-9_.]+$/, "Зөвхөн англи үсэг, тоо, цэг, доогуур зураас зөвшөөрнө."),
    displayName: z.string().min(2, "Нэрээ оруулна уу.").max(30),
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

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            username: ownerData?.username || '',
            displayName: ownerData?.displayName || '',
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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

                <div className="space-y-6">
                    <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-primary/10 to-transparent rounded-3xl">
                        <CardContent className="p-6">
                            <FormField
                                control={form.control}
                                name="isPublic"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <FormLabel className="text-lg font-black tracking-tight">Нийтэд нээлттэй болгох</FormLabel>
                                            <FormDescription className="text-xs leading-relaxed max-w-[240px]">
                                                Хайлтаар болон Радараар дамжуулан бусад хүмүүс таныг олж, Wispr бичүүлэх боломжийг нээх үү?
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

                    <div className="space-y-5 px-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-1 w-8 bg-primary rounded-full" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Үндсэн мэдээлэл</h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Username</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                            <span className="absolute left-4 top-3 text-primary font-bold">@</span>
                                            <Input
                                                placeholder="boldoo_123"
                                                className="h-12 pl-9 rounded-2xl bg-background border-muted/50 focus:border-primary transition-all relative z-10 font-mono font-bold"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Таны нэр</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Овог Нэр"
                                            className="h-12 rounded-2xl bg-background border-muted/50 focus:border-primary transition-all font-bold"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center gap-2 mt-8 mb-2 pt-4">
                            <div className="h-1 w-8 bg-secondary rounded-full" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Нэмэлт (Хайлтад тусална)</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="school"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Сургууль</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="МУИС, СЭЗИС..."
                                                className="h-12 rounded-2xl bg-background border-muted/50 focus:border-primary transition-all"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="workplace"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Ажлын газар</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Голомт, Хаан..."
                                                className="h-12 rounded-2xl bg-background border-muted/50 focus:border-primary transition-all"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6">
                    <Button
                        type="submit"
                        className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 border-b-4 border-primary-foreground/20 active:border-b-0 active:translate-y-1 transition-all"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Хадгалж байна...</span>
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
