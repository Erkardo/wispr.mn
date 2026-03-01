'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { activateRadarAction, getNearbyRadarUsersAction } from './radar-action';
import { type PublicProfile } from './search-action';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

// Random stable positions for blips on the radar
function getBlipPosition(index: number, total: number) {
    // Deterministic placement based on index so blips don't jump around
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI + 0.5;
    const radius = 25 + (index % 3) * 18; // concentric rings: 25, 43, 61 (% of 50)
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { x, y };
}

function RadarScreen({ isActive, isScanning, blipCount }: {
    isActive: boolean;
    isScanning: boolean;
    blipCount: number;
}) {
    const [sweepAngle, setSweepAngle] = useState(0);
    const rafRef = useRef<number>(0);
    const startRef = useRef<number | null>(null);
    const DURATION = 2500; // ms per full rotation

    useEffect(() => {
        if (!isScanning && !isActive) {
            cancelAnimationFrame(rafRef.current);
            startRef.current = null;
            return;
        }

        const animate = (ts: number) => {
            if (!startRef.current) startRef.current = ts;
            const elapsed = (ts - startRef.current) % DURATION;
            setSweepAngle((elapsed / DURATION) * 360);
            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isScanning, isActive]);

    const blips = Array.from({ length: blipCount }, (_, i) => getBlipPosition(i, blipCount));

    return (
        <div className="relative w-72 h-72 mx-auto select-none">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-green-500/10 blur-2xl" />

            {/* Radar screen */}
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full drop-shadow-[0_0_30px_rgba(34,197,94,0.4)]"
            >
                {/* Screen background */}
                <defs>
                    <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#052e16" />
                        <stop offset="100%" stopColor="#011008" />
                    </radialGradient>
                    {/* Sweep gradient */}
                    <radialGradient id="sweepGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </radialGradient>
                    <clipPath id="radarClip">
                        <circle cx="50" cy="50" r="49" />
                    </clipPath>
                </defs>

                {/* Background fill */}
                <circle cx="50" cy="50" r="50" fill="url(#radarBg)" />

                {/* Concentric range rings */}
                {[15, 27, 39, 49].map((r, i) => (
                    <circle
                        key={r}
                        cx="50" cy="50" r={r}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth={i === 3 ? 0.8 : 0.4}
                        strokeOpacity={i === 3 ? 0.7 : 0.3}
                    />
                ))}

                {/* Crosshair lines */}
                <line x1="50" y1="1" x2="50" y2="99" stroke="#22c55e" strokeWidth="0.3" strokeOpacity="0.3" />
                <line x1="1" y1="50" x2="99" y2="50" stroke="#22c55e" strokeWidth="0.3" strokeOpacity="0.3" />
                <line x1="15" y1="15" x2="85" y2="85" stroke="#22c55e" strokeWidth="0.2" strokeOpacity="0.15" />
                <line x1="85" y1="15" x2="15" y2="85" stroke="#22c55e" strokeWidth="0.2" strokeOpacity="0.15" />

                {/* Sweep wedge (active) */}
                {(isActive || isScanning) && (
                    <g
                        transform={`rotate(${sweepAngle} 50 50)`}
                        clipPath="url(#radarClip)"
                    >
                        {/* Trailing glow wedge — drawn as a conic-ish gradient approximation */}
                        {[...Array(20)].map((_, i) => {
                            const angle = -(i * 3); // trailing behind sweep
                            const opacity = (1 - i / 20) * 0.35;
                            const rad = (angle * Math.PI) / 180;
                            const x2 = 50 + 49 * Math.sin(rad);
                            const y2 = 50 - 49 * Math.cos(rad);
                            return (
                                <line
                                    key={i}
                                    x1="50" y1="50"
                                    x2={x2} y2={y2}
                                    stroke="#22c55e"
                                    strokeWidth="1.5"
                                    strokeOpacity={opacity}
                                />
                            );
                        })}
                        {/* Main sweep line */}
                        <line
                            x1="50" y1="50"
                            x2="50" y2="1"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeOpacity="0.95"
                        />
                    </g>
                )}

                {/* Idle state — subtle pulse lines */}
                {!isActive && !isScanning && (
                    <>
                        <line x1="50" y1="50" x2="50" y2="1" stroke="#22c55e" strokeWidth="0.6" strokeOpacity="0.2" />
                    </>
                )}

                {/* User blips */}
                {isActive && blips.map((pos, i) => (
                    <g key={i}>
                        <circle cx={pos.x} cy={pos.y} r="2.5" fill="#22c55e" opacity="0.9" />
                        <circle cx={pos.x} cy={pos.y} r="2.5" fill="#22c55e" opacity="0.4">
                            <animate
                                attributeName="r"
                                from="2.5" to="6"
                                dur="1.5s"
                                begin={`${i * 0.3}s`}
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="opacity"
                                from="0.4" to="0"
                                dur="1.5s"
                                begin={`${i * 0.3}s`}
                                repeatCount="indefinite"
                            />
                        </circle>
                    </g>
                ))}

                {/* Center dot */}
                <circle cx="50" cy="50" r="1.5" fill="#22c55e" opacity="0.9" />
                <circle cx="50" cy="50" r="3" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.5" />

                {/* Outer border */}
                <circle cx="50" cy="50" r="49" fill="none" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.8" />
            </svg>

            {/* Status text overlay */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <span className={`text-[10px] font-black uppercase tracking-[0.25em] font-mono ${isScanning ? 'text-green-400 animate-pulse' : isActive ? 'text-green-500' : 'text-green-700'}`}>
                    {isScanning ? 'SCANNING...' : isActive ? 'ACTIVE' : 'OFFLINE'}
                </span>
            </div>
        </div>
    );
}

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
                    const res = await activateRadarAction(user.uid, latitude, longitude);
                    if (res.success) {
                        toast({ title: '📡 Радар аслаа', description: res.message });
                        setIsRadarActive(true);
                        const nearbyRes = await getNearbyRadarUsersAction(user.uid, latitude, longitude);
                        if (nearbyRes.success && nearbyRes.data) {
                            setNearbyUsers(nearbyRes.data);
                        } else {
                            setNearbyUsers([]);
                        }
                    } else {
                        toast({ title: 'Алдаа', description: res.message, variant: 'destructive' });
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    let description = 'GPS асаах үед алдаа гарлаа. Та утсаа сэгсрээд дахин оролдоно уу.';
                    if (error.code === 1) description = 'Байршлын зөвшөөрлийг хөтчөөсөө "Зөвшөөрөх" (Allow) товчийг даран идэвхжүүлнэ үү.';
                    else if (error.code === 2) description = 'Байршил тогтооход хүндрэл гарлаа. Утасныхаа GPS асаалттай эсэхийг шалгана уу.';
                    else if (error.code === 3) description = 'Байршил тогтоох хугацаа хэтэрлээ. Дахин оролдоно уу.';

                    toast({
                        title: '📍 Байршил тогтоож чадсангүй',
                        description,
                        variant: 'destructive',
                        action: (
                            <Button variant="outline" size="sm" onClick={checkIn} className="h-8 border-white/20 hover:bg-white/10 text-white font-bold">
                                Дахин оролдох
                            </Button>
                        )
                    });
                },
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            );
        });
    };

    const blipCount = nearbyUsers?.length ?? 0;

    return (
        <div className="space-y-6 pt-4 animate-in fade-in">

            {/* Radar Screen Card */}
            <div className="relative rounded-[2rem] overflow-hidden bg-[#030f07] border border-green-900/60 shadow-[0_0_60px_rgba(34,197,94,0.15)]">
                {/* Scan lines overlay for CRT effect */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03] z-10"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,197,94,0.8) 2px, rgba(34,197,94,0.8) 3px)',
                        backgroundSize: '100% 3px',
                    }}
                />

                <div className="relative z-20 p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isRadarActive || isPending ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-green-900'}`} />
                            <span className="text-green-500 text-[10px] font-black uppercase tracking-[0.3em] font-mono">
                                WISPR RADAR v1.0
                            </span>
                        </div>
                        {isRadarActive && nearbyUsers !== null && (
                            <span className="text-green-400 text-[10px] font-black uppercase tracking-widest font-mono">
                                {blipCount} SIGNAL{blipCount !== 1 ? 'S' : ''}
                            </span>
                        )}
                    </div>

                    {/* Radar display */}
                    <RadarScreen
                        isActive={isRadarActive && !isPending}
                        isScanning={isPending}
                        blipCount={blipCount}
                    />

                    {/* Info row */}
                    <div className="flex items-center justify-between text-green-700 text-[9px] font-mono uppercase tracking-widest">
                        <span>RANGE: 1.0 KM</span>
                        <span>MODE: PASSIVE</span>
                        <span>TTL: 2H</span>
                    </div>

                    {/* Activate button */}
                    <button
                        onClick={checkIn}
                        disabled={isPending}
                        className="w-full h-14 rounded-2xl font-black text-base tracking-wider uppercase transition-all active:scale-95 disabled:opacity-60 border font-mono"
                        style={{
                            background: isPending
                                ? 'rgba(34,197,94,0.1)'
                                : isRadarActive
                                    ? 'rgba(34,197,94,0.15)'
                                    : 'rgba(34,197,94,0.2)',
                            borderColor: 'rgba(34,197,94,0.4)',
                            color: '#4ade80',
                            boxShadow: isRadarActive || isPending
                                ? '0 0 20px rgba(34,197,94,0.3), inset 0 0 20px rgba(34,197,94,0.05)'
                                : 'none',
                        }}
                    >
                        {isPending ? (
                            <span className="flex items-center justify-center gap-3">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                                SCANNING AREA...
                            </span>
                        ) : isRadarActive ? (
                            '↺ RESCAN'
                        ) : (
                            <span className="flex items-center justify-center gap-3">
                                <Navigation className="w-5 h-5" />
                                ACTIVATE RADAR
                            </span>
                        )}
                    </button>

                    <p className="text-center text-[9px] text-green-900 font-mono uppercase tracking-[0.2em]">
                        LOCATION REQUIRED · EXPIRES IN 2 HOURS
                    </p>
                </div>
            </div>

            {/* Results */}
            <AnimatePresence>
                {nearbyUsers !== null && !isPending && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <h3 className="font-black text-base flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            {nearbyUsers.length === 0 ? 'Ойролцоо хэн ч байхгүй' : `Ойролцоо ${nearbyUsers.length} хүн олдлоо`}
                        </h3>

                        {nearbyUsers.length === 0 ? (
                            <div className="text-center p-10 bg-[#030f07] rounded-[2rem] border border-green-900/40 space-y-3">
                                <p className="text-green-700 font-mono text-sm">NO SIGNALS DETECTED</p>
                                <p className="text-muted-foreground text-sm">Таны эргэн тойронд радар асаасан хүн олдсонгүй. Найзуудаасаа радар асахыг хүсэж болно.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {nearbyUsers.map((profile, idx) => (
                                    <motion.div
                                        key={profile.shortId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.06 }}
                                    >
                                        <Link href={`/c/${profile.shortId}`}>
                                            <Card className="overflow-hidden border-green-900/30 hover:border-green-700/50 transition-all cursor-pointer group hover:shadow-xl bg-card/60 backdrop-blur-md rounded-[1.5rem]">
                                                <CardContent className="p-4 flex items-center gap-4">
                                                    <div className="relative">
                                                        <Avatar className="h-14 w-14 ring-2 ring-background shadow-lg">
                                                            <AvatarImage src={profile.photoURL || ''} alt={profile.displayName || profile.username} />
                                                            <AvatarFallback className="bg-green-950 text-green-400 font-black">
                                                                {(profile.displayName || profile.username || 'U').charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-background shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-black text-base truncate group-hover:text-green-500 transition-colors">
                                                            {profile.displayName || profile.username}
                                                        </h3>
                                                        {profile.username && (
                                                            <p className="text-xs text-green-600 font-mono">@{profile.username}</p>
                                                        )}
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {profile.school && (
                                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-950/60 text-green-600 border border-green-900/50">
                                                                    <GraduationCap className="w-2.5 h-2.5" />{profile.school}
                                                                </span>
                                                            )}
                                                            {profile.workplace && (
                                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-950/60 text-green-600 border border-green-900/50">
                                                                    <Briefcase className="w-2.5 h-2.5" />{profile.workplace}
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-950/60 text-green-500 border border-green-800/50">
                                                                <MapPin className="w-2.5 h-2.5" />1км дотор
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 rounded-xl border border-green-900/40 group-hover:bg-green-500 group-hover:border-green-500 transition-all">
                                                        <ArrowRight className="w-4 h-4 text-green-700 group-hover:text-white" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
