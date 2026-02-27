'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Briefcase, GraduationCap, User, Loader2, Radar } from 'lucide-react';
import { searchPublicProfilesAction, type PublicProfile } from './search-action';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadarTab } from './RadarTab';

export default function ExplorePage() {
    const [query, setQuery] = useState('');
    const [type, setType] = useState<'username' | 'name' | 'school' | 'workplace'>('name');
    const [results, setResults] = useState<PublicProfile[]>([]);
    const [isPending, startTransition] = useTransition();
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
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

    return (
        <div className="container mx-auto max-w-2xl p-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">

            <div className="text-center space-y-2 mb-8">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4 ring-8 ring-primary/5">
                    <Search className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-black">Хайх</h1>
                <p className="text-muted-foreground">Найзуудаа Сургууль, Ажил болон Нэрээр нь хайж олоод нууцаар Wispr илгээгээрэй.</p>
            </div>

            <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-full">
                    <TabsTrigger value="search" className="rounded-full gap-2">
                        <Search className="h-4 w-4" />
                        <span>Ердийн хайлт</span>
                    </TabsTrigger>
                    <TabsTrigger value="radar" className="rounded-full gap-2">
                        <Radar className="h-4 w-4" />
                        <span>Радар</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-4">
                    <Card className="border-primary/20 shadow-lg bg-card/50 backdrop-blur">
                        <CardContent className="p-6 space-y-6">
                            {/* Filters */}
                            <div className="flex flex-wrap gap-2 justify-center">
                                <Button
                                    variant={type === 'name' ? 'default' : 'outline'}
                                    onClick={() => setType('name')}
                                    size="sm" className="rounded-full"
                                >
                                    <User className="w-4 h-4 mr-2" /> Нэр
                                </Button>
                                <Button
                                    variant={type === 'username' ? 'default' : 'outline'}
                                    onClick={() => setType('username')}
                                    size="sm" className="rounded-full"
                                >
                                    <span className="font-bold mr-1">@</span> Username
                                </Button>
                                <Button
                                    variant={type === 'school' ? 'default' : 'outline'}
                                    onClick={() => setType('school')}
                                    size="sm" className="rounded-full"
                                >
                                    <GraduationCap className="w-4 h-4 mr-2" /> Сургууль
                                </Button>
                                <Button
                                    variant={type === 'workplace' ? 'default' : 'outline'}
                                    onClick={() => setType('workplace')}
                                    size="sm" className="rounded-full"
                                >
                                    <Briefcase className="w-4 h-4 mr-2" /> Ажил
                                </Button>
                            </div>

                            <form onSubmit={handleSearch} className="flex gap-2 relative">
                                <div className="relative w-full">
                                    {type === 'username' && <span className="absolute left-4 top-3 text-muted-foreground font-medium">@</span>}
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={
                                            type === 'name' ? "Овог нэр эсвэл нэр..." :
                                                type === 'username' ? "boldoo_123" :
                                                    type === 'school' ? "МУИС, СЭЗИС..." :
                                                        "MCS, Голомт банк..."
                                        }
                                        className={`h-12 text-lg rounded-2xl bg-background ${type === 'username' ? 'pl-9' : 'pl-4'}`}
                                    />
                                </div>
                                <Button type="submit" className="h-12 px-6 rounded-2xl" disabled={isPending}>
                                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    <div className="space-y-4 pt-4">
                        {isPending && (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        )}

                        {!isPending && hasSearched && results.length === 0 && (
                            <div className="text-center p-12 mt-4 bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/30">
                                <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="font-semibold text-lg">Илэрц олдсонгүй</h3>
                                <p className="text-muted-foreground mt-1">
                                    Энэ хайлтаар нийтэд нээлттэй хүн олдсонгүй. Өөр үгээр шалгана уу.
                                </p>
                            </div>
                        )}

                        {!isPending && results.length > 0 && (
                            <div className="grid grid-cols-1 gap-4">
                                {results.map((profile) => (
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
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h3 className="font-bold text-lg text-foreground truncate block group-hover:text-primary transition-colors">
                                                            {profile.displayName || profile.username}
                                                        </h3>
                                                        <Radar className="w-3.5 h-3.5 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                                    </div>

                                                    {profile.username && (
                                                        <p className="text-xs text-primary/70 font-bold font-mono tracking-tight mb-2">@{profile.username}</p>
                                                    )}

                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {profile.school && (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                                                <GraduationCap className="w-3 h-3" />
                                                                <span className="truncate max-w-[120px]">{profile.school}</span>
                                                            </div>
                                                        )}
                                                        {profile.workplace && (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/30 border border-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                                                <Briefcase className="w-3 h-3" />
                                                                <span className="truncate max-w-[120px]">{profile.workplace}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="radar">
                    <RadarTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
