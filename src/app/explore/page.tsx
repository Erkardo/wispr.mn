'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Briefcase, GraduationCap, User, Loader2, Radar, Sparkles, Flame, History, ArrowRight, X } from 'lucide-react';
import { searchPublicProfilesAction, type PublicProfile } from './search-action';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadarTab } from './RadarTab';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';

const CATEGORIES = [
    { id: 'name', label: 'Нэр', icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'username', label: 'Username', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'school', label: 'Сургууль', icon: GraduationCap, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'workplace', label: 'Ажил', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
] as const;

export default function ExplorePage() {
    const [query, setQuery] = useState('');
    const [type, setType] = useState<typeof CATEGORIES[number]['id']>('name');
    const [results, setResults] = useState<PublicProfile[]>([]);
    const [isPending, startTransition] = useTransition();
    const [hasSearched, setHasSearched] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setHasSearched(true);
        startTransition(async () => {
            const res = await searchPublicProfilesAction(query, type);
            if (res.success && res.data) {
                setResults(res.data);
            } else {
                setResults([]);
            }
        });
    };

    const getPlaceholder = () => {
        switch (type) {
            case 'name': return "Хэнийг хайх вэ?";
            case 'username': return "boldoo_123...";
            case 'school': return "МУИС, СЭЗИС...";
            case 'workplace': return "MCS, Хаан банк...";
            default: return "Хайх...";
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header title="Хайх" />

            {/* Immersive Header Backdrop */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent pointer-events-none" />

            <div className="container mx-auto max-w-2xl p-4 pt-4 relative space-y-8">

                <Tabs defaultValue="search" className="w-full">
                    <div className="flex justify-center px-4 mb-6">
                        <div className="w-full max-w-sm overflow-x-auto no-scrollbar pb-2 -mb-2">
                            <TabsList className="bg-muted/40 p-1.5 rounded-full shadow-inner border border-border/40 backdrop-blur-sm h-auto flex flex-nowrap justify-start sm:justify-center min-w-max mx-auto gap-1">
                                <TabsTrigger value="search" className="rounded-full px-5 py-2.5 text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-bold transition-all duration-300">
                                    <Search className="w-4 h-4 mr-2" />
                                    Хайх
                                </TabsTrigger>
                                <TabsTrigger value="radar" className="rounded-full px-5 py-2.5 text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-bold transition-all duration-300">
                                    <Radar className="w-4 h-4 mr-2" />
                                    Радар
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <TabsContent value="search" className="space-y-8 focus-visible:outline-none m-0">
                        {/* Premium Search Bar Container */}
                        <div className="sticky top-2 z-30 transition-all duration-300">
                            <Card className={cn(
                                "border-none shadow-2xl transition-all duration-500 overflow-hidden rounded-[2rem]",
                                isFocused ? "ring-2 ring-primary/20 shadow-primary/10" : "bg-card/80 backdrop-blur-xl"
                            )}>
                                <CardContent className="p-2">
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                            </div>
                                            <Input
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                placeholder={getPlaceholder()}
                                                className="h-14 pl-12 pr-12 border-none bg-transparent text-lg font-bold placeholder:text-muted-foreground/50 placeholder:font-medium focus-visible:ring-0"
                                            />
                                            {query && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            className="h-14 w-14 rounded-[1.5rem] shadow-lg shadow-primary/20 transition-all active:scale-95"
                                            disabled={isPending || !query.trim()}
                                        >
                                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Category Pills Strip */}
                        <div className="space-y-3 px-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                                <History className="w-3 h-3" />
                                Хайх төрөл
                            </h3>
                            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setType(cat.id);
                                            if (query.trim()) handleSearch();
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap transition-all duration-300 border font-bold text-sm",
                                            type === cat.id
                                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                                                : "bg-card border-border hover:border-primary/30 text-muted-foreground"
                                        )}
                                    >
                                        <cat.icon className={cn("w-4 h-4", type === cat.id ? "text-white" : cat.color)} />
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Feedback / State */}
                        <AnimatePresence mode="wait">
                            {!hasSearched && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="pt-4 grid grid-cols-1 gap-4"
                                >
                                    {/* Empty Search Suggestion Card */}
                                    <Card className="border-none bg-gradient-to-br from-primary/5 to-secondary/5 rounded-[2.5rem] overflow-hidden group border-muted-foreground/5 relative">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                        <CardContent className="p-8 text-center space-y-6 relative z-10">
                                            <div className="mx-auto w-20 h-20 bg-background rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                                                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black">Хэнийг ч олж болно</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed px-4">
                                                    Найзуудаа нэрээр нь, сургуулиар нь эсвэл хаана ажилладгаар нь хайж олоод нууцаар мэндчилээрэй.
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto pt-2">
                                                {['#мүис', '#mcs', '#boldoo', '#designer'].map(tag => (
                                                    <span key={tag} className="px-3 py-1 rounded-full bg-background/50 border border-border/50 text-[10px] font-black uppercase text-muted-foreground">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Radar Teaser */}
                                    <div className="cursor-pointer">
                                        <Card className="border-none bg-zinc-900 text-white rounded-[2.5rem] overflow-hidden relative group">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
                                            <CardContent className="p-8 flex items-center justify-between relative z-10">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/80">Active Now</span>
                                                    </div>
                                                    <h3 className="text-2xl font-black tracking-tight">Радар асаах</h3>
                                                    <p className="text-sm text-white/60">Эргэн тойронд байгаа хүмүүсийг харах</p>
                                                </div>
                                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md group-hover:bg-primary transition-colors duration-500">
                                                    <Radar className="w-8 h-8 text-white animate-spin-slow" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </motion.div>
                            )}

                            {hasSearched && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-4 pt-4 pb-12"
                                >
                                    {isPending ? (
                                        <div className="grid grid-cols-1 gap-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-24 w-full bg-muted/30 rounded-[2rem] animate-pulse" />
                                            ))}
                                        </div>
                                    ) : results.length === 0 ? (
                                        <Card className="border-2 border-dashed border-muted-foreground/10 bg-transparent rounded-[2.5rem]">
                                            <CardContent className="p-12 text-center space-y-4">
                                                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto opacity-50">
                                                    <Search className="w-8 h-8 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="font-black text-lg">Уучлаарай, олдсонгүй</h4>
                                                    <p className="text-sm text-muted-foreground">Энэ хайлтаар нийтэд нээлттэй хэрэглэгч олдсонгүй. Өөр үгээр оролдоод үзээрэй.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            {results.map((profile, idx) => (
                                                <motion.div
                                                    key={profile.shortId}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                >
                                                    <Link href={`/c/${profile.shortId}`}>
                                                        <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer group bg-card/60 backdrop-blur-md rounded-[2rem]">
                                                            <CardContent className="p-5 flex items-center gap-5">
                                                                <div className="relative">
                                                                    <Avatar className="h-20 w-20 ring-4 ring-background shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                                                                        <AvatarImage src={profile.photoURL || ''} alt={profile.displayName || profile.username} />
                                                                        <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/5 text-primary font-black text-2xl">
                                                                            {(profile.displayName || profile.username || 'U').charAt(0).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-background shadow-sm" />
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                                        <h3 className="font-black text-xl text-foreground truncate block group-hover:text-primary transition-colors duration-300">
                                                                            {profile.displayName || profile.username}
                                                                        </h3>
                                                                        <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                                            <ArrowRight className="w-4 h-4" />
                                                                        </div>
                                                                    </div>

                                                                    {profile.username && (
                                                                        <p className="text-xs text-primary/80 font-black font-mono tracking-tighter mb-3">@{profile.username}</p>
                                                                    )}

                                                                    <div className="flex flex-wrap gap-2">
                                                                        {profile.school && (
                                                                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-black text-primary uppercase">
                                                                                <GraduationCap className="w-3 h-3" />
                                                                                <span className="truncate max-w-[100px]">{profile.school}</span>
                                                                            </div>
                                                                        )}
                                                                        {profile.workplace && (
                                                                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[9px] font-black text-emerald-600 uppercase">
                                                                                <Briefcase className="w-3 h-3" />
                                                                                <span className="truncate max-w-[100px]">{profile.workplace}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
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
                    </TabsContent>

                    <TabsContent value="radar" className="m-0 focus-visible:outline-none">
                        <RadarTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
