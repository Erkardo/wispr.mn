'use client';

import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useFCM } from '@/firebase';
import { Header } from '@/components/Header';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Gift, HelpCircle, Shield, MessageCircle, Gem, LogOut, Loader2, Users, ShoppingCart, FileText, Palette, Trophy, User, Settings, Bell, BellOff, Globe, Lock, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import type { ComplimentOwner } from '@/types';
import { isToday } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createQpayInvoiceAction } from '../payments/actions';
import { checkAdminAccess } from '@/app/admin/actions';
import { QPayDialog } from '@/components/payments/QpayDialog';
import { Separator } from '@/components/ui/separator';
import { ThemeSelector } from '@/components/profile/ThemeSelector';
import { LevelProgress } from '@/components/gamification/LevelProgress';
import { BadgeList } from '@/components/gamification/BadgeList';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { SwipeBack } from '@/components/SwipeBack';
import { cn } from '@/lib/utils';

type HintPackage = { id: number; name: string; numHints: number; amount: number; };
const hintPackages: HintPackage[] = [
    { id: 1, name: "5 Hint", numHints: 5, amount: 6900 },
    { id: 2, name: "10 Hint", numHints: 10, amount: 11900 },
    { id: 3, name: "20 Hint", numHints: 20, amount: 19900 },
];

// Compact toggle row
function ToggleRow({ icon: Icon, label, description, checked, onCheckedChange, disabled }: {
    icon: React.ElementType; label: string; description?: string;
    checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3 py-3 px-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-xl bg-muted/60 shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{label}</p>
                    {description && <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">{description}</p>}
                </div>
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="shrink-0" />
        </div>
    );
}

// Settings menu item
function MenuItem({ icon: Icon, label, href, onClick, danger }: {
    icon: React.ElementType; label: string; href?: string; onClick?: () => void; danger?: boolean;
}) {
    const cls = cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-sm font-semibold",
        danger
            ? "text-destructive hover:bg-destructive/10"
            : "text-foreground hover:bg-muted/60"
    );
    if (href) return (
        <Link href={href} className={cls}>
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            {label}
        </Link>
    );
    return (
        <button onClick={onClick} className={cls}>
            <Icon className={cn("w-4 h-4 shrink-0", danger ? "text-destructive" : "text-muted-foreground")} />
            {label}
        </button>
    );
}

export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { permission, requestPermission, isSupportedBrowser } = useFCM();
    const [isRequestingPerm, setIsRequestingPerm] = useState(false);
    const [isTogglingPublic, setIsTogglingPublic] = useState(false);

    // Tab state management
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'settings');
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) setActiveTab(tab);
    }, [searchParams]);

    const handleTabChange = useCallback((value: string) => {
        setActiveTab(value);
        window.history.replaceState(null, '', `?tab=${value}`);
    }, []);

    const [isBuyHintDialogOpen, setIsBuyHintDialogOpen] = useState(false);
    const [isCreatingInvoice, setIsCreatingInvoice] = useState<number | false>(false);
    const [qpayData, setQpayData] = useState<{ qrImage: string; deeplinks: any[]; invoiceId: string } | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const ownerRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'complimentOwners', user.uid);
    }, [user, firestore]);

    const { data: ownerData, isLoading: ownerLoading } = useDoc<ComplimentOwner>(ownerRef);

    const [totalHints, setTotalHints] = useState(5);
    useEffect(() => {
        if (ownerData === undefined) return;
        if (!ownerData) { setTotalHints(5); return; }
        let daily = 5;
        const resetDate = ownerData.lastHintResetAt?.toDate?.() ?? null;
        if (resetDate && isToday(resetDate)) daily = 5 - (ownerData.hintsUsedToday || 0);
        setTotalHints(daily + (ownerData.bonusHints || 0));
    }, [ownerData]);

    useEffect(() => {
        if (!user || user.isAnonymous) return;
        user.getIdToken().then(token => checkAdminAccess(token)).then(setIsAdmin).catch(() => { });
    }, [user]);

    const handleCreateInvoice = async (pkg: HintPackage) => {
        if (!user) return;
        setIsCreatingInvoice(pkg.id);
        try {
            const result = await createQpayInvoiceAction(pkg, user.uid);
            if (result.error) {
                toast({ title: "Алдаа гарлаа", description: result.error, variant: "destructive" });
            } else {
                setQpayData({ qrImage: result.qrImage, deeplinks: result.deeplinks, invoiceId: result.invoiceId });
                setIsBuyHintDialogOpen(false);
            }
        } catch {
            toast({ title: "Алдаа гарлаа", description: "Нэхэмжлэл үүсгэхэд алдаа гарлаа.", variant: "destructive" });
        } finally {
            setIsCreatingInvoice(false);
        }
    };

    const handleSignOut = async () => {
        if (auth) { await auth.signOut(); router.push('/login'); }
    };

    const handleTogglePublic = async (val: boolean) => {
        if (!firestore || !user || isTogglingPublic) return;
        setIsTogglingPublic(true);
        try {
            await updateDoc(doc(firestore, 'complimentOwners', user.uid), { isPublic: val });
            toast({ title: val ? 'Нийтэд нээлттэй болсон' : 'Нийтийн профайл хаагдлаа' });
        } catch {
            toast({ title: 'Алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsTogglingPublic(false);
        }
    };

    const handleToggleNotification = async (val: boolean) => {
        if (!isSupportedBrowser) {
            toast({
                title: 'Мэдэгдэл идэвхжүүлэх боломжгүй ⚠️',
                description: 'Таны ашиглаж буй хөтөч эсвэл төхөөрөмж дэмжихгүй байна. Google Chrome эсвэл Safari хөтчөөр орж Home Screen дээрээ нэмнэ үү.',
                variant: 'destructive',
            });
            return;
        }
        if (val && permission !== 'granted') {
            setIsRequestingPerm(true);
            await requestPermission?.();
            setIsRequestingPerm(false);
        }
    };

    if (userLoading || ownerLoading) {
        return (
            <SwipeBack threshold={80}>
                <Header title="Тохиргоо" showBackButton={true} />
                <div className="container mx-auto max-w-2xl p-4 py-8 space-y-4">
                    <Skeleton className="h-20 w-full rounded-3xl" />
                    <Skeleton className="h-40 w-full rounded-3xl" />
                    <Skeleton className="h-48 w-full rounded-3xl" />
                </div>
            </SwipeBack>
        );
    }

    if (!user || user.isAnonymous) {
        return (
            <SwipeBack threshold={80}>
                <Header title="Тохиргоо" showBackButton={true} />
                <div className="container mx-auto max-w-2xl p-4 py-8 space-y-6">
                    <Card className="text-center border-primary/20 bg-primary/5 rounded-3xl">
                        <CardHeader>
                            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                                <Gem className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle>Нэвтэрч орно уу</CardTitle>
                            <CardDescription>Тохиргоог харахын тулд бүртгэлээрээ нэвтэрнэ үү.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full font-bold" size="lg">
                                <Link href="/login">Google-ээр үргэлжлүүлэх</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </SwipeBack>
        );
    }

    return (
        <SwipeBack threshold={80}>
            <Header title="Тохиргоо" showBackButton={true} />
            <div className="container mx-auto max-w-2xl px-4 pb-24">

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full pt-4">
                    {/* Tab switcher */}
                    <div className="flex justify-center mb-5">
                        <div className="w-full overflow-x-auto no-scrollbar pb-1">
                            <TabsList className="h-auto flex flex-nowrap justify-start sm:justify-center min-w-max mx-auto gap-1">
                                <TabsTrigger value="settings" className="flex items-center gap-1.5">
                                    <Settings className="w-3.5 h-3.5" />Тохиргоо
                                </TabsTrigger>
                                <TabsTrigger value="profile" className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" />Профайл
                                </TabsTrigger>
                                <TabsTrigger value="achievements" className="flex items-center gap-1.5">
                                    <Trophy className="w-3.5 h-3.5" />Амжилт
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    {/* ── ТОХИРГОО TAB ── */}
                    <TabsContent value="settings" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                        <div className="space-y-4">

                            {/* Compact user card */}
                            <Card className="rounded-[1.75rem] border border-border/50 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Avatar className="h-14 w-14 ring-2 ring-primary/20 shadow-md shrink-0">
                                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-black text-lg">
                                            {user.displayName?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="font-black text-base leading-tight truncate">{user.displayName}</h2>
                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        {ownerData?.username && (
                                            <p className="text-xs text-primary/70 font-mono font-bold mt-0.5">@{ownerData.username}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Hint card — compact */}
                            <Card className="rounded-[1.75rem] overflow-hidden border-none bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 shadow-lg">
                                <CardContent className="p-0">
                                    <div className="flex items-center gap-4 p-4">
                                        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 shrink-0">
                                            <Gift className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] text-white/60 font-black uppercase tracking-widest">Hint-ийн эрх</p>
                                            <p className="text-3xl font-black text-white leading-none">{totalHints}</p>
                                        </div>
                                        <Dialog open={isBuyHintDialogOpen} onOpenChange={setIsBuyHintDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-none rounded-2xl font-bold text-xs shrink-0 h-10 px-4">
                                                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />Авах
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="rounded-[2rem]">
                                                <DialogHeader>
                                                    <DialogTitle>Нэмэлт Hint авах</DialogTitle>
                                                    <DialogDescription>Hint-ийн багц сонгоно уу.</DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-3 py-2">
                                                    {hintPackages.map((pkg) => (
                                                        <Button key={pkg.id} onClick={() => handleCreateInvoice(pkg)} disabled={!!isCreatingInvoice} className="rounded-xl h-12">
                                                            {isCreatingInvoice === pkg.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gem className="mr-2 h-4 w-4" />}
                                                            {pkg.name} — {pkg.amount.toLocaleString()}₮
                                                        </Button>
                                                    ))}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notification Activation Card */}
                            {permission !== 'granted' && (
                                <Card className="rounded-[1.75rem] border-none bg-primary/10 overflow-hidden">
                                    <div className="p-5 flex items-start gap-4 cursor-pointer hover:bg-primary/15 transition-colors" onClick={() => handleToggleNotification(true)}>
                                        <div className="p-2.5 rounded-2xl bg-primary/20 shrink-0">
                                            <Bell className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black uppercase tracking-widest text-primary mb-1">Мэдэгдэл идэвхжүүлэх</p>
                                            <p className="text-xs text-foreground font-semibold leading-relaxed">
                                                Утасныхаа дэлгэцэнд шинэ Wispr болон хариу ирэх бүрт мэдэгдэл хүлээн авахыг хүсвэл энд дарж зөвшөөрнө үү.
                                            </p>
                                            <Button size="sm" className="mt-3 rounded-xl font-bold px-4" onClick={(e) => { e.stopPropagation(); handleToggleNotification(true); }} disabled={isRequestingPerm}>
                                                {isRequestingPerm ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                                                Зөвшөөрөх
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Compact toggles */}
                            <Card className="rounded-[1.75rem] border border-border/50 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
                                <ToggleRow
                                    icon={ownerData?.isPublic ? Globe : Lock}
                                    label="Нийтийн профайл"
                                    description={ownerData?.isPublic ? "Хайлтаар олгодно" : "Зөвхөн таны линкээр"}
                                    checked={ownerData?.isPublic ?? false}
                                    onCheckedChange={handleTogglePublic}
                                    disabled={isTogglingPublic}
                                />
                                {permission === 'granted' && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between gap-3 py-3 px-4 opacity-70">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-1.5 rounded-xl bg-green-500/10 shrink-0">
                                                    <Bell className="w-4 h-4 text-green-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold leading-tight">Мэдэгдэл идэвхтэй</p>
                                                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">Төхөөрөмжид мэдэгдэл очно</p>
                                                </div>
                                            </div>
                                            <div className="p-1 px-2 rounded-lg bg-green-500/10 text-green-600 text-[10px] font-black uppercase">Идэвхтэй</div>
                                        </div>
                                    </>
                                )}
                            </Card>

                            {/* Settings menu */}
                            <Card className="rounded-[1.75rem] border border-border/50 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
                                <div className="p-2 space-y-0.5">
                                    {isAdmin && <MenuItem icon={Shield} label="Админ самбар" href="/admin" />}
                                    <MenuItem icon={MessageCircle} label="Санал хүсэлт" href="/feedback" />
                                    <MenuItem icon={HelpCircle} label="Тусламж" href="/help" />
                                    <MenuItem icon={FileText} label="Үйлчилгээний нөхцөл" href="/privacy" />
                                    <MenuItem icon={Shield} label="Нууцлалын бодлого" href="/privacy" />
                                    <Separator className="my-1" />
                                    <MenuItem icon={LogOut} label="Гарах" onClick={handleSignOut} danger />
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ── ПРОФАЙЛ TAB ── */}
                    <TabsContent value="profile" className="m-0 focus-visible:outline-none animate-in fade-in duration-300">
                        <div className="space-y-6">
                            <Card className="rounded-[1.75rem] border border-border/50 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Хувийн мэдээлэл</CardTitle>
                                    <CardDescription>Нийтэд харагдах мэдээллээ тохируулна уу.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ProfileSettings ownerId={user.uid} ownerData={ownerData} />
                                </CardContent>
                            </Card>

                            <div>
                                <div className="flex items-center gap-3 mb-4 px-1">
                                    <Palette className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">Загвар</span>
                                    <div className="h-px flex-1 bg-border/50" />
                                </div>
                                <ThemeSelector currentThemeId={ownerData?.theme} ownerData={ownerData} />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── АМЖИЛТ TAB ── */}
                    <TabsContent value="achievements" className="m-0 focus-visible:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut", staggerChildren: 0.1 }}
                            className="space-y-6"
                        >
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="rounded-[1.75rem] border border-border/50 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base text-muted-foreground uppercase tracking-widest font-black text-[11px]">Түвшин & Оноо</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <LevelProgress xp={ownerData?.xp || 0} />
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="rounded-[1.75rem] border border-border/50 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base text-muted-foreground uppercase tracking-widest font-black text-[11px]">Тэмдэгүүд</CardTitle>
                                        <CardDescription className="text-sm font-medium">Таны цуглуулсан болон цуглуулах боломжтой тэмдэгүүд</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <BadgeList
                                            ownerId={user.uid}
                                            earnedBadges={ownerData?.badges || []}
                                            stats={{ totalCompliments: ownerData?.totalCompliments || 0, xp: ownerData?.xp || 0 }}
                                        />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>

            {qpayData && (
                <QPayDialog
                    isOpen={!!qpayData}
                    onClose={() => setQpayData(null)}
                    qrImage={qpayData.qrImage}
                    deeplinks={qpayData.deeplinks}
                    invoiceId={qpayData.invoiceId}
                    onSuccess={() => toast({ title: "Баяр хүргэе!", description: "Hint амжилттай нэмэгдлээ." })}
                />
            )}
        </SwipeBack>
    );
}
