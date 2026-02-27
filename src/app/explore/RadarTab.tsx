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
            <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-primary/10 via-background to-background">
                <CardContent className="p-6 text-center space-y-4">
                    <div className="mx-auto bg-primary/20 p-4 rounded-full w-fit animate-pulse">
                        <RadarIcon className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Ойр хавийн хүмүүс (Radar)</h2>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                            Location-оо асаагаад таны эргэн тойронд 1 км дотор радар асаасан хүмүүсийг шууд харж, нууцаар Wispr бичээрэй. Радар 2 цаг ажиллах болно.
                        </p>
                    </div>

                    <Button
                        size="lg"
                        onClick={checkIn}
                        disabled={isPending}
                        className="w-full max-w-sm rounded-full font-bold shadow-lg"
                    >
                        {isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Navigation className="w-5 h-5 mr-2" />}
                        {isRadarActive ? "Дахин шалгах" : "Радар асааж шалгах"}
                    </Button>
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
                        <div className="text-center p-8 bg-muted/20 rounded-3xl border border-dashed">
                            <RadarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="font-semibold text-muted-foreground">Одоохондоо хэн ч олдсонгүй</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Танай эргэн тойронд радар асаасан хүн алга байна.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {nearbyUsers.map((profile) => (
                                <Link key={profile.shortId} href={`/c/${profile.shortId}`}>
                                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group hover:bg-primary/5">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                                                <AvatarImage src={profile.photoURL || ''} alt={profile.displayName || profile.username} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                    {(profile.displayName || profile.username || 'U').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-foreground truncate block">
                                                    {profile.displayName || profile.username}
                                                </h3>
                                                {profile.username && (
                                                    <p className="text-sm text-primary/80 font-medium font-mono truncate">@{profile.username}</p>
                                                )}
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
