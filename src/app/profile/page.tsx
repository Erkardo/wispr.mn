'use client';

import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Header } from '@/components/Header';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, HelpCircle, Shield, MessageCircle, Gem, LogOut, Loader2, Users, ShoppingCart, FileText, Palette, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
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


type HintPackage = {
    id: number;
    name: string;
    numHints: number;
    amount: number;
};

const hintPackages: HintPackage[] = [
    { id: 1, name: "5 Hint", numHints: 5, amount: 6900 },
    { id: 2, name: "10 Hint", numHints: 10, amount: 11900 },
    { id: 3, name: "20 Hint", numHints: 20, amount: 19900 },
];

export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // State for payment flow
    const [isBuyHintDialogOpen, setIsBuyHintDialogOpen] = useState(false);
    const [isCreatingInvoice, setIsCreatingInvoice] = useState<number | false>(false);
    const [qpayData, setQpayData] = useState<{ qrImage: string, deeplinks: any[], invoiceId: string } | null>(null);

    const ownerRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'complimentOwners', user.uid);
    }, [user, firestore]);

    const { data: ownerData, isLoading: ownerLoading } = useDoc<ComplimentOwner>(ownerRef);

    const [totalHints, setTotalHints] = useState(5);

    useEffect(() => {
        if (ownerData === undefined) return; // Still loading or not available

        if (ownerData === null) { // Doc doesn't exist
            setTotalHints(5);
            return;
        }

        let dailyHints = 5;
        const resetDate = (ownerData.lastHintResetAt && typeof ownerData.lastHintResetAt.toDate === 'function')
            ? ownerData.lastHintResetAt.toDate()
            : null;
        if (resetDate && isToday(resetDate)) {
            dailyHints = 5 - (ownerData.hintsUsedToday || 0);
        }

        setTotalHints(dailyHints + (ownerData.bonusHints || 0));

    }, [ownerData]);

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            if (user && !user.isAnonymous) {
                try {
                    const idToken = await user.getIdToken();
                    const hasAccess = await checkAdminAccess(idToken);
                    setIsAdmin(hasAccess);
                } catch (e) {
                    console.error("Failed to check admin status", e);
                }
            }
        };
        checkAdmin();
    }, [user]);

    const handleCreateInvoice = async (pkg: HintPackage) => {
        if (!user) {
            toast({
                title: "Нэвтэрнэ үү",
                description: "Hint худалдан авахын тулд та нэвтэрсэн байх шаардлагатай.",
                variant: "destructive",
            });
            setIsCreatingInvoice(false);
            return;
        }
        setIsCreatingInvoice(pkg.id);

        try {
            const result = await createQpayInvoiceAction(pkg, user.uid);
            if (result.error) {
                toast({
                    title: "Алдаа гарлаа",
                    description: result.error,
                    variant: "destructive",
                });
            } else {
                setQpayData({
                    qrImage: result.qrImage,
                    deeplinks: result.deeplinks,
                    invoiceId: result.invoiceId
                });
                setIsBuyHintDialogOpen(false); // Close the package selection dialog
            }

        } catch (error) {
            console.error("Hint худалдан авах хүсэлт явуулахад алдаа гарлаа:", error);
            toast({
                title: "Алдаа гарлаа",
                description: "Нэхэмжлэл үүсгэхэд алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.",
                variant: "destructive",
            });
        } finally {
            setIsCreatingInvoice(false);
        }
    };


    const handleSignOut = async () => {
        if (auth) {
            await auth.signOut();
            router.push('/login');
        }
    };

    const handleShare = async () => {
        if (!ownerData?.shareUrl) return;
        const shareUrl = ownerData.shareUrl;
        const shareText = `Надад нэргүйгээр wispr үлдээгээрэй 💛\n\n${shareUrl}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Надад нэг wispr үлдээгээрэй!',
                    text: 'Wispr-аар дамжуулан надад нэргүйгээр wispr-үүд илгээгээрэй. Хэн болохыг тань хэн ч мэдэхгүй.',
                    url: shareUrl,
                });
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    // console.log('Share canceled by user');
                    return;
                }
                if (!(error instanceof Error && error.name === 'NotAllowedError')) {
                    navigator.clipboard.writeText(shareText);
                    toast({ title: 'Хуулагдлаа!', description: 'Түгээх боломжгүй тул текстийг хууллаа.' });
                }
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({ title: 'Хуулагдлаа!', description: 'Найзуудтайгаа хуваалцахад бэлэн.' });
        }
    };

    if (userLoading || ownerLoading) {
        return (
            <>
                <Header title="Профайл" showBackButton={false} />
                <div className="container mx-auto max-w-2xl p-4 py-8 space-y-6">
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-40 w-full rounded-lg" />
                        <Skeleton className="h-48 w-full rounded-lg" />
                    </div>
                </div>
            </>
        )
    }

    if (!user || user.isAnonymous) {
        return (
            <>
                <Header title="Профайл" showBackButton={false} />
                <div className="container mx-auto max-w-2xl p-4 py-8 space-y-8">
                    <Card className="text-center border-primary/20 bg-primary/5">
                        <CardHeader>
                            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4 ring-8 ring-primary/5">
                                <Gem className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle>Wispr-үүдээ мөнхөд хадгалаарай</CardTitle>
                            <CardDescription>
                                Таны wispr-үүд одоогоор зөвхөн энэ төхөөрөмж дээр хадгалагдаж байна. Wispr-үүдээ алдалгүй хадгалж, бусад төхөөрөмжөөс хандахын тулд бүртгэлээ баталгаажуулна уу.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full font-bold" size="lg">
                                <Link href="/login">Google-ээр үргэлжлүүлэх</Link>
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Бусад</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <div className="space-y-1">
                                <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                    <Link href="/privacy">
                                        <FileText className="w-5 h-5 text-muted-foreground" /> Үйлчилгээний нөхцөл
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                    <Link href="/privacy">
                                        <Shield className="w-5 h-5 text-muted-foreground" /> Нууцлалын бодлого
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                    <Link href="/feedback">
                                        <MessageCircle className="w-5 h-5 text-muted-foreground" /> Санал хүсэлт
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                    <Link href="/help">
                                        <HelpCircle className="w-5 h-5 text-muted-foreground" /> Тусламж
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        )
    }

    return (
        <>
            <Header title="Профайл" showBackButton={false} />
            <div className="container mx-auto max-w-2xl p-4 py-8 space-y-6">
                <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                        <Avatar className="h-16 w-16 border-2 border-primary/20">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                            <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className='min-w-0'>
                            <h2 className="text-xl font-bold truncate">{user.displayName}</h2>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="themes" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="themes" className="gap-2">
                            <Palette className="h-4 w-4" />
                            <span>Загвар</span>
                        </TabsTrigger>
                        <TabsTrigger value="achievements" className="gap-2">
                            <Trophy className="h-4 w-4" />
                            <span>Амжилт</span>
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="themes" className="mt-4 space-y-4">
                        <ThemeSelector currentThemeId={ownerData?.theme} ownerData={ownerData} />
                    </TabsContent>
                    <TabsContent value="achievements" className="mt-4 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Миний амжилтууд</CardTitle>
                                <CardDescription>Таны цуглуулсан оноо болон тэмдэгүүд</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <LevelProgress xp={ownerData?.xp || 0} />

                                <div className="pt-4">
                                    <h3 className="text-sm font-medium mb-4">Тэмдэгүүд</h3>
                                    <BadgeList
                                        ownerId={user.uid}
                                        earnedBadges={ownerData?.badges || []}
                                        stats={{
                                            totalCompliments: ownerData?.totalCompliments || 0,
                                            xp: ownerData?.xp || 0
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Hint & Payment Section */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 shadow-xl border-none">
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 text-white/20 rotate-12">
                        <Gift className="w-full h-full" />
                    </div>
                    <div className="relative">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary-foreground">Hint-ийн эрх</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center relative z-10">
                            <div className="text-7xl font-black text-white drop-shadow-md mb-2">{totalHints}</div>
                            <p className="text-center text-sm font-medium text-white/90">
                                Нийт үлдсэн hint. Найзаа урьж нэмэлт эрх аваарай.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Dialog open={isBuyHintDialogOpen} onOpenChange={setIsBuyHintDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full bg-white/90 text-primary hover:bg-white font-bold"><ShoppingCart className="mr-2 h-4 w-4" /> Hint худалдаж авах</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Нэмэлт Hint авах</DialogTitle>
                                        <DialogDescription>
                                            Хэрэв таны үнэгүй hint дууссан бол, та нэмэлт эрх худалдан авах эсвэл найзуудаа урьж үнэгүй hint авах боломжтой.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-6 py-4">
                                        <div className="rounded-lg border p-4 space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-foreground">Hint худалдаж авах</h3>
                                                <p className="text-sm text-muted-foreground">Нэмэлт hint-ийн багц сонгоно уу.</p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {hintPackages.map((pkg) => (
                                                    <Button key={pkg.id} onClick={() => handleCreateInvoice(pkg)} disabled={!!isCreatingInvoice}>
                                                        {isCreatingInvoice === pkg.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gem className="mr-2 h-4 w-4" />}
                                                        {pkg.name} - {pkg.amount.toLocaleString()}₮
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-background px-2 text-muted-foreground">
                                                    Эсвэл
                                                </span>
                                            </div>
                                        </div>
                                        <div className="rounded-lg border p-4 bg-secondary space-y-4">
                                            <div>
                                                <h3 className="font-semibold text-foreground">Найзаа урих</h3>
                                                <p className="text-sm text-muted-foreground">Урьсан найз бүрийнхээ тоогоор та <span className="font-bold text-primary">1 үнэгүй hint</span>-ийн эрх авах болно.</p>
                                            </div>
                                            <Button className="w-full" onClick={() => {
                                                handleShare();
                                                setIsBuyHintDialogOpen(false);
                                            }}>
                                                <Users className="mr-2 h-4 w-4" />
                                                Урилгын линк хуваалцах
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardFooter>
                    </div>
                </Card>

                {qpayData && (
                    <QPayDialog
                        isOpen={!!qpayData}
                        onClose={() => setQpayData(null)}
                        qrImage={qpayData.qrImage}
                        deeplinks={qpayData.deeplinks}
                        invoiceId={qpayData.invoiceId}
                        onSuccess={() => {
                            toast({ title: "Баяр хүргэе!", description: "Hint-ийн эрх амжилттай нэмэгдлээ." });
                        }}
                    />
                )}


                {/* Settings and Legal Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Тохиргоо &amp; Бусад</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                        <div className="space-y-1">
                            {isAdmin && (
                                <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                    <Link href="/admin">
                                        <Shield className="w-5 h-5 text-muted-foreground" /> Админ самбар
                                    </Link>
                                </Button>
                            )}
                            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                <Link href="/privacy">
                                    <FileText className="w-5 h-5 text-muted-foreground" /> Үйлчилгээний нөхцөл
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                <Link href="/privacy">
                                    <Shield className="w-5 h-5 text-muted-foreground" /> Нууцлалын бодлого
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                <Link href="/feedback">
                                    <MessageCircle className="w-5 h-5 text-muted-foreground" /> Санал хүсэлт
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base h-12">
                                <Link href="/help">
                                    <HelpCircle className="w-5 h-5 text-muted-foreground" /> Тусламж
                                </Link>
                            </Button>
                        </div>
                        <Separator className="my-2" />
                        <div className="pt-1">
                            <Button variant="ghost" className="w-full justify-start gap-3 text-base h-12 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                                <LogOut className="w-5 h-5" /> Гарах
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
