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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Public Visibility Toggle */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                    <FormField
                        control={form.control}
                        name="isPublic"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base font-bold">Нийтэд нээлттэй болгох</FormLabel>
                                    <FormDescription>
                                        Хэрэв асаавал бусад хүмүүс таныг Сургууль, Ажил, Username-ээр хайх болон Хажууд (Radar)-д харах боломжтой болно.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Хэрэглэгчийн нэр (Username)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">@</span>
                                        <Input placeholder="boldoo_123" className="pl-8" {...field} />
                                    </div>
                                </FormControl>
                                <FormDescription>Тан руу линк илгээхгүйгээр шууд Username-р хайж олох боломжтой.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Овог Нэр (Display Name)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Таны нэр" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="school"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Сургууль</FormLabel>
                                    <FormControl>
                                        <Input placeholder="МҮИС 3-р курс" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="workplace"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ажлын газар</FormLabel>
                                    <FormControl>
                                        <Input placeholder="MCS Group" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Хадгалах
                </Button>
            </form>
        </Form>
    );
}
