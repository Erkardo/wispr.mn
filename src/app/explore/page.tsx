'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Search, Briefcase, GraduationCap, Loader2, Radar,
    Sparkles, ArrowRight, X, Zap, Users, MapPin
} from 'lucide-react';
import { searchPublicProfilesAction, type PublicProfile } from './search-action';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadarTab } from './RadarTab';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';

export default function ExplorePage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicProfile[]>([]);
    const [isPending, startTransition] = useTransition();
    const [hasSearched, setHasSearched] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [activeTab, setActiveTab] = useState('search');

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setHasSearched(true);
        startTransition(async () => {
            const res = await searchPublicProfilesAction(query);
            if (res.success && res.data) {
                setResults(res.data);
            } else {
                setResults([]);
            }
        });
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setHasSearched(false);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header title="Хайх" />

            <div className="container mx-auto max-w-2xl p-4 pt-4 relative space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                    {/* Tab switcher */}
                    <div className="flex justify-center mb-2">
                        <TabsList className="bg-muted/40 p-1.5 rounded-full shadow-inner border border-border/40 backdrop-blur-sm h-auto gap-1">
                            <TabsTrigger
                                value="search"
                                className="rounded-full px-6 py-2.5 text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-bold transition-all duration-300"
                            >
                                <Search className="w-4 h-4 mr-2" />
                                Хайх
                            </TabsTrigger>
                            <TabsTrigger
                                value="radar"
                                className="rounded-full px-6 py-2.5 text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-bold transition-all duration-300"
                            >
                                <Radar className="w-4 h-4 mr-2" />
                                Радар
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* ── SEARCH TAB ── */}
                    <TabsContent value="search" className="space-y-5 focus-visible:outline-none m-0 animate-in fade-in duration-300">

                        {/* Search bar */}
                        <div className="sticky top-2 z-30">
                            <Card className={cn(
                                "border-none shadow-xl transition-all duration-300 overflow-hidden rounded-[2rem]",
                                isFocused
                                    ? "ring-2 ring-primary/30 shadow-primary/10 bg-card"
                                    : "bg-card/80 backdrop-blur-xl"
                            )}>
                                <CardContent className="p-2">
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                                                {isPending
                                                    ? <Loader2 className="w-5 h-5 animate-spin" />
                                                    : <Search className="w-5 h-5" />
                                                }
                                            </div>
                                            <Input
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                placeholder="Нэр, username, сургууль, ажил..."
                                                className="h-14 pl-12 pr-10 border-none bg-transparent text-base font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
                                                autoComplete="off"
                                            />
                                            {query && (
                                                <button
                                                    type="button"
                                                    onClick={handleClear}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            className="h-14 w-14 rounded-[1.5rem] shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0"
                                            disabled={isPending || !query.trim()}
                                        >
                                            {isPending
                                                ? <Loader2 className="w-5 h-5 animate-spin" />
                                                : <ArrowRight className="w-5 h-5" />
                                            }
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Empty / result states */}
                        <AnimatePresence mode="sync">

                            {/* ── Empty state ── */}
                            {!hasSearched && (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-4"
                                >
                                    {/* How-to hint */}
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="h-px flex-1 bg-border/50" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Хэрхэн хайх вэ</span>
                                        <div className="h-px flex-1 bg-border/50" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { icon: Users, label: 'Нэрээр', example: 'Болд', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                            { icon: Sparkles, label: 'Username', example: 'boldoo_123', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                                            { icon: GraduationCap, label: 'Сургуулиар', example: 'МУИС', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                                            { icon: Briefcase, label: 'Ажлаар', example: 'Хаан банк', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                        ].map(({ icon: Icon, label, example, color, bg }) => (
                                            <button
                                                key={label}
                                                onClick={() => { setQuery(example); }}
                                                className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card/60 hover:bg-card hover:border-primary/20 hover:shadow-md transition-all text-left group active:scale-95"
                                            >
                                                <div className={cn('p-2 rounded-xl shrink-0', bg)}>
                                                    <Icon className={cn('w-4 h-4', color)} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">{label}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">{example}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Radar promo — clicking switches to radar tab */}
                                    <button
                                        onClick={() => setActiveTab('radar')}
                                        className="w-full text-left active:scale-[0.99] transition-transform"
                                    >
                                        <Card className="border-none bg-zinc-900 text-white rounded-[2rem] overflow-hidden relative group cursor-pointer hover:shadow-2xl transition-shadow">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-green-500/20 via-transparent to-transparent" />
                                            {/* Animated radar rings */}
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                {[0, 1, 2].map(i => (
                                                    <div
                                                        key={i}
                                                        className="absolute inset-0 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-green-500/30"
                                                        style={{
                                                            animation: `ping 2s cubic-bezier(0,0,0.2,1) ${i * 0.6}s infinite`,
                                                            transform: `translate(-50%,-50%) scale(${1 + i * 0.5})`,
                                                        }}
                                                    />
                                                ))}
                                                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/40 flex items-center justify-center backdrop-blur-sm group-hover:bg-green-500/20 transition-colors">
                                                    <Radar className="w-7 h-7 text-green-400 group-hover:animate-spin transition-all" />
                                                </div>
                                            </div>
                                            <CardContent className="p-6 pr-28 relative z-10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-green-400">Live Radar</span>
                                                </div>
                                                <h3 className="text-xl font-black tracking-tight leading-tight">Ойр хавийн<br />хүмүүсийг хар</h3>
                                                <p className="text-sm text-white/50 mt-1 flex items-center gap-1">
                                                    Радар асаах <ArrowRight className="w-3 h-3" />
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </button>
                                </motion.div>
                            )}

                            {/* ── Search results ── */}
                            {hasSearched && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-4 pb-8"
                                >
                                    {isPending ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-20 w-full bg-muted/30 rounded-[1.5rem] animate-pulse" />
                                            ))}
                                        </div>
                                    ) : results.length === 0 ? (
                                        <div className="text-center py-16 px-6 space-y-4">
                                            <div className="text-5xl">🔍</div>
                                            <div>
                                                <h4 className="font-black text-xl">Олдсонгүй</h4>
                                                <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                                                    &ldquo;{query}&rdquo;-тэй тохирох нийтэд нээлттэй хэрэглэгч олдсонгүй.
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={handleClear} className="rounded-full">
                                                Дахин хайх
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-xs font-bold text-muted-foreground">
                                                    {results.length} үр дүн
                                                </span>
                                                <button onClick={handleClear} className="text-xs text-primary hover:underline font-bold">
                                                    Цэвэрлэх
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {results.map((profile, idx) => (
                                                    <motion.div
                                                        key={profile.shortId}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.04 }}
                                                    >
                                                        <Link href={`/c/${profile.shortId}`}>
                                                            <Card className="overflow-hidden border-none shadow-md hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer group bg-card/70 backdrop-blur-md rounded-[1.5rem]">
                                                                <CardContent className="p-4 flex items-center gap-4">
                                                                    <div className="relative shrink-0">
                                                                        <Avatar className="h-14 w-14 ring-2 ring-background shadow-lg transition-all duration-300 group-hover:scale-105">
                                                                            <AvatarImage src={profile.photoURL || ''} alt={profile.displayName || profile.username} />
                                                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-black text-lg">
                                                                                {(profile.displayName || profile.username || 'U').charAt(0).toUpperCase()}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-background" />
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <h3 className="font-black text-base text-foreground truncate group-hover:text-primary transition-colors">
                                                                            {profile.displayName || profile.username}
                                                                        </h3>
                                                                        {profile.username && (
                                                                            <p className="text-xs text-primary/70 font-mono font-bold mb-1.5">@{profile.username}</p>
                                                                        )}
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {profile.school && (
                                                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20">
                                                                                    <GraduationCap className="w-2.5 h-2.5" />{profile.school}
                                                                                </span>
                                                                            )}
                                                                            {profile.workplace && (
                                                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                                                    <Briefcase className="w-2.5 h-2.5" />{profile.workplace}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                                                                        <ArrowRight className="w-4 h-4" />
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </Link>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </TabsContent>

                    {/* ── RADAR TAB ── */}
                    <TabsContent value="radar" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                        <RadarTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
