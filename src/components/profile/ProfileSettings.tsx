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
import { Loader2, BellRing, BellOff } from 'lucide-react';
import type { ComplimentOwner } from '@/types';
import { useFCM } from '@/firebase';

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

                    {/* Mэдэгдэл (Notifications) Toggle Card */}
                    {isSupportedBrowser && (
                        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-secondary/50 to-transparent rounded-3xl">
                            <CardContent className="p-6">
                                <div className="flex flex-row items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {permission === 'granted' ? <BellRing className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                                            <Label className="text-lg font-black tracking-tight border-none">Апп-н мэдэгдэл</Label>
                                        </div>
                                        <p className="text-xs leading-relaxed max-w-[240px] text-muted-foreground">
                                            Шинэ зурвас болон хариу ирсэн үед унтруулсан үед ч мэдэгдэл авах уу?
                                        </p>
                                    </div>
                                    <div>
                                        {permission === 'granted' ? (
                                            <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">Асаалттай</span>
                                        ) : (
                                            <Button type="button" variant="outline" size="sm" onClick={handleEnableNotifications} disabled={isRequestingPerm}>
                                                {isRequestingPerm ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Асаах"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

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

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem className="mt-4">
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Таны тухай (Bio)</FormLabel>
                                    <FormControl>
                                        <textarea
                                            placeholder="Өөрийнхөө тухай товчхон..."
                                            className="flex w-full rounded-2xl border border-muted/50 bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none min-h-[80px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-[10px] text-right">
                                        {field.value?.length || 0}/150
                                    </FormDescription>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center justify-between mt-8 mb-2 pt-4">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-8 bg-secondary rounded-full" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Нэмэлт Мэдээлэл</h3>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-xs font-bold text-primary"
                            >
                                {showAdvanced ? 'Нуух' : 'Дэлгэрүүлэх'}
                            </Button>
                        </div>

                        {showAdvanced && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                        )}
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
