'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MapPin, Radar as RadarIcon, Navigation } from 'lucide-react';
import Link from 'next/link';
import { activateRadarAction, getNearbyRadarUsersAction } from './radar-action';
import { type PublicProfile } from './search-action';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function RadarTab() {
    const { user } = useUser();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [nearbyUsers, setNearbyUsers] = useState<PublicProfile[] | null>(null);
    const [isRadarActive, setIsRadarActive] = useState(false);

    const checkIn = () => {
        if (!user) {
            toast({ title: 'Нэвтрэх шаардлагатай', description: 'Та эхлээд бүртгэлээрээ нэвтэрнэ үү.', variant: 'destructive' });
            return;
        }

        if (!navigator.geolocation) {
            toast({ title: 'Алдаа', description: 'Таны хөтөч байршил тогтоохыг дэмжихгүй байна.', variant: 'destructive' });
            return;
        }

        startTransition(() => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    // 1. Activate Radar
                    const res = await activateRadarAction(user.uid, latitude, longitude);
                    if (res.success) {
                        toast({ title: 'Радар аслаа', description: res.message });
                        setIsRadarActive(true);

                        // 2. Fetch nearby
                        const nearbyRes = await getNearbyRadarUsersAction(user.uid, latitude, longitude);
                        if (nearbyRes.success && nearbyRes.data) {
                            setNearbyUsers(nearbyRes.data);
                        } else {
                            setNearbyUsers([]);
                            if (nearbyRes.message) toast({ title: 'Алдаа', description: nearbyRes.message, variant: 'destructive' });
                        }
                    } else {
                        toast({ title: 'Алдаа', description: res.message, variant: 'destructive' });
                    }
                },
                (err) => {
                    toast({ title: 'Байршил тогтоож чадсангүй', description: 'GPS зөвшөөрлөө шалгаад дахин оролдоно уу.', variant: 'destructive' });
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        });
    };

    return (
        <div className="space-y-6 pt-4 animate-in fade-in">
            <Card className="overflow-hidden border-none shadow-2xl bg-gradient-to-br from-primary/20 via-background to-secondary/10 rounded-3xl relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -ml-16 -mb-16" />

                <CardContent className="p-8 text-center space-y-6 relative z-10">
                    <div className="mx-auto bg-primary/10 p-5 rounded-full w-fit ring-8 ring-primary/5 animate-pulse">
                        <RadarIcon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight">Ойр хавийн хүмүүс</h2>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                            Location-оо асаагаад таны эргэн тойронд 1 км дотор байгаа хүмүүсийг харж, нууцаар Wispr бичээрэй.
                        </p>
                    </div>

                    <Button
                        size="lg"
                        onClick={checkIn}
                        disabled={isPending}
                        className="w-full max-w-sm rounded-2xl font-black shadow-xl shadow-primary/20 h-14 text-lg border-b-4 border-primary-foreground/20 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        {isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Navigation className="w-5 h-5 mr-2" />}
                        {isRadarActive ? "Дахин шалгах" : "Радар асаах"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Радар 2 цаг ажиллах болно</p>
                </CardContent>
            </Card>

            {/* Results */}
            {nearbyUsers !== null && !isPending && (
                <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Ойрхон олдсон хүмүүс ({nearbyUsers.length})
                    </h3>

                    {nearbyUsers.length === 0 ? (
                        <div className="text-center p-12 bg-muted/20 rounded-[2rem] border-2 border-dashed border-muted-foreground/20 space-y-4">
                            <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <RadarIcon className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-muted-foreground">Одоогоор хэн ч алга</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                                    Таны эргэн тойронд радар асаасан хүн олдсонгүй.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {nearbyUsers.map((profile) => (
                                <Link key={profile.shortId} href={`/c/${profile.shortId}`}>
                                    <Card className="overflow-hidden border-primary/5 hover:border-primary/20 transition-all cursor-pointer group hover:shadow-xl hover:shadow-primary/5 bg-card/40 backdrop-blur-sm">
                                        <CardContent className="p-5 flex items-center gap-5">
                                            <div className="relative">
                                                <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg transition-transform group-hover:scale-105 duration-300">
                                                    <AvatarImage src={profile.photoURL || ''} alt={profile.displayName || profile.username} />
                                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-black text-xl">
                                                        {(profile.displayName || profile.username || 'U').charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-background shadow-sm" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-lg text-foreground truncate block group-hover:text-primary transition-colors">
                                                    {profile.displayName || profile.username}
                                                </h3>
                                                {profile.username && (
                                                    <p className="text-xs text-primary/70 font-bold font-mono tracking-tight mb-2">@{profile.username}</p>
                                                )}
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 w-fit px-2 py-0.5 rounded-full">
                                                    <MapPin className="w-2.5 h-2.5" /> 1км дотор
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
