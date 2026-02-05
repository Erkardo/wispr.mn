'use client';
import { useEffect, useState } from 'react';
import { getDashboardStats, getAdminUsersList, type DashboardStats, type UserDetail, checkAdminAccess } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, MessageSquare, DollarSign, Activity, Shield, TrendingUp, ArrowUpRight, CreditCard, UserPlus, Search, GripVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from '@/firebase/auth/use-user';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function AdminPage() {
    const { user, loading: authLoading } = useUser();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [usersList, setUsersList] = useState<UserDetail[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search state
    const [userSearch, setUserSearch] = useState('');

    useEffect(() => {
        async function init() {
            if (authLoading) return;

            if (!user) {
                setError("Та энэ хуудсыг үзэхийн тулд нэвтэрсэн байх шаардлагатай.");
                setPageLoading(false);
                return;
            }

            try {
                // 1. Get Token & Check Access
                const token = await user.getIdToken();
                const access = await checkAdminAccess(token);

                if (!access.isAdmin) {
                    setError("Хандах эрхгүй: Та админ биш байна.");
                    setPageLoading(false);
                    return;
                }

                // 2. Fetch Dashboard Stats
                const response = await getDashboardStats();
                if (response.success && response.data) {
                    setStats(response.data);
                } else {
                    setError("Мэдээлэл ачааллахад алдаа гарлаа.");
                }

                // 3. Fetch Users List
                const usersResp = await getAdminUsersList();
                if (usersResp.success) {
                    setUsersList(usersResp.users);
                    console.log("Users fetched:", usersResp.users.length);
                }

            } catch (err) {
                console.error("Admin init error:", err);
                setError("Тодорхойгүй алдаа гарлаа.");
            } finally {
                setPageLoading(false);
            }
        }
        init();
    }, [user, authLoading]);

    if (authLoading || pageLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-gray-500 font-medium">Удирдлагын самбарыг ачааллаж байна...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-red-100">
                    <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Хандах эрхгүй</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Button onClick={() => window.location.href = '/'} variant="outline">
                        Нүүр хуудас руу буцах
                    </Button>
                </div>
            </div>
        );
    }

    const filteredUsers = usersList.filter(u =>
        (u.displayName?.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.email?.toLowerCase().includes(userSearch.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 pb-32">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Удирдлагын Самбар</h1>
                        <p className="text-sm md:text-base text-muted-foreground">Системийн ерөнхий төлөв байдал.</p>
                    </div>
                    <Badge variant="outline" className="w-fit px-3 py-1 h-8 bg-white self-start md:self-center">
                        {new Date().toLocaleDateString('mn-MN')}
                    </Badge>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-white p-1 border shadow-sm w-full md:w-auto h-auto min-h-[44px] flex flex-wrap md:flex-nowrap justify-start gap-1">
                        <TabsTrigger value="overview" className="flex-1 md:flex-none py-2">Тойм</TabsTrigger>
                        <TabsTrigger value="users" className="flex-1 md:flex-none py-2">Хэрэглэгчид ({usersList.length})</TabsTrigger>
                        <TabsTrigger value="finance" className="flex-1 md:flex-none py-2">Санхүү</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* 
                           Bulletproof Mobile Layout: 
                           Start with grid-cols-1 (1 card per row) on mobile.
                           Switch to grid-cols-2 on sm (>640px).
                           Switch to grid-cols-4 on lg (>1024px).
                        */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Revenue Card (Gradient) */}
                            <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden">
                                <CardContent className="p-6 flex flex-col justify-between h-full">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-indigo-100 font-medium text-sm">Нийт Орлого</p>
                                            <h3 className="text-3xl font-bold mt-2 tracking-tight">
                                                {stats?.totalRevenue.toLocaleString()}₮
                                            </h3>
                                        </div>
                                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                            <DollarSign className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="mt-4 text-xs text-indigo-100 flex items-center">
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        Нийт олсон орлого
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Users Card */}
                            <Card className="border-none shadow-sm bg-white">
                                <CardContent className="p-6 flex flex-col justify-between h-full">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-gray-500 font-medium text-sm">Нийт Хэрэглэгчид</p>
                                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{stats?.totalUsers}</h3>
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded-lg">
                                            <Users className="h-5 w-5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-1">
                                        <div className="text-xs text-green-600 font-medium flex items-center">
                                            <UserPlus className="h-3 w-3 mr-1" />
                                            {stats?.userBreakdown?.verified || 0} Бүртгэлтэй
                                        </div>
                                        <div className="text-xs text-gray-400 font-medium flex items-center">
                                            <Users className="h-3 w-3 mr-1" />
                                            {stats?.userBreakdown?.anonymous || 0} Зочин
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Wisprs Card */}
                            <Card className="border-none shadow-sm bg-white">
                                <CardContent className="p-6 flex flex-col justify-between h-full">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-gray-500 font-medium text-sm">Илгээсэн Wispr</p>
                                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{stats?.totalWisprs}</h3>
                                        </div>
                                        <div className="bg-pink-50 p-2 rounded-lg">
                                            <MessageSquare className="h-5 w-5 text-pink-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 text-xs text-gray-500">
                                        Ашигласан Hint
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Confessions Card */}
                            <Card className="border-none shadow-sm bg-white">
                                <CardContent className="p-6 flex flex-col justify-between h-full">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-gray-500 font-medium text-sm">Confessions</p>
                                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{stats?.totalConfessions}</h3>
                                        </div>
                                        <div className="bg-orange-50 p-2 rounded-lg">
                                            <Activity className="h-5 w-5 text-orange-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 text-xs text-gray-500">
                                        Нэрээ нууцалсан мессеж
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-none shadow-sm col-span-1">
                                <CardHeader>
                                    <CardTitle>Орлогын түүх</CardTitle>
                                    <CardDescription>Сүүлийн 7 хоногийн орлого</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px] w-full pl-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.dailyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#aaa' }} />
                                            <Tooltip formatter={(value: any) => [`${value}₮`, 'Орлого']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Area type="monotone" dataKey="payments" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm col-span-1">
                                <CardHeader>
                                    <CardTitle>Идэвх</CardTitle>
                                    <CardDescription>Шинэ хэрэглэгч болон Wispr</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px] w-full pl-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.dailyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#aaa' }} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="wisprs" name="Шинэ Wispr" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="users" name="Шинэ Хэрэглэгч" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* USERS TAB - Improved Table */}
                    <TabsContent value="users" className="space-y-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                <div>
                                    <CardTitle>Хэрэглэгчийн Жагсаалт</CardTitle>
                                    <CardDescription>Бүртгэлтэй хэрэглэгчдийг удирдах</CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Нэр эсвэл имэйлээр хайх..."
                                        className="pl-9 bg-gray-50 border-gray-200"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* Wrap table in overflow-x-auto for mobile horizontal scrolling */}
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50/50">
                                            <TableRow>
                                                <TableHead className="w-[250px]">Хэрэглэгч</TableHead>
                                                <TableHead>Бүртгүүлсэн</TableHead>
                                                <TableHead>Үлдэгдэл</TableHead>
                                                <TableHead>Сүүлд орсон</TableHead>
                                                <TableHead className="text-right">Үйлдэл</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                                                <TableRow key={u.uid} className="hover:bg-gray-50/50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border border-gray-100">
                                                                <AvatarImage src={u.photoURL || undefined} />
                                                                <AvatarFallback className="bg-indigo-50 text-indigo-600 font-medium">
                                                                    {u.displayName?.slice(0, 2).toUpperCase() || 'UN'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col max-w-[150px] sm:max-w-none">
                                                                <span className="font-medium text-sm text-gray-900 truncate" title={u.displayName || 'Нэргүй'}>
                                                                    {u.displayName || 'Нэргүй'}
                                                                </span>
                                                                <span className="text-xs text-gray-500 truncate" title={u.email || 'Имэйлгүй'}>
                                                                    {u.email || 'Имэйлгүй'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                                                        {new Date(u.createdAt).toLocaleDateString('mn-MN')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={u.hintsRemaining > 5 ? "default" : "secondary"}>
                                                                {u.hintsRemaining} Hint
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                                                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('mn-MN') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                                            <GripVertical className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                                                        Хэрэглэгч олдсонгүй.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* FINANCE TAB */}
                    <TabsContent value="finance" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="border-none shadow-sm md:col-span-1 bg-green-50/50 border-green-100">
                                <CardHeader className="pb-2">
                                    <div className="text-xs font-semibold text-green-600 uppercase tracking-wider">Monetization</div>
                                    <CardTitle className="text-lg font-bold text-gray-900">Зарагдсан Hint</CardTitle>
                                    <CardDescription>Худалдаж авсан нийт Hint</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black text-green-700">
                                        {stats?.hintStats?.totalHintsSold || 0}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm md:col-span-1 bg-blue-50/50 border-blue-100">
                                <CardHeader className="pb-2">
                                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Engagement</div>
                                    <CardTitle className="text-lg font-bold text-gray-900">Нийт Ашиглалт</CardTitle>
                                    <CardDescription>Хэрэглэгчдийн ашигласан Hint</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black text-blue-700">
                                        {stats?.hintStats?.hintsUsed || 0}
                                    </div>
                                    <p className="text-xs text-blue-600/80 mt-2">
                                        Илгээсэн Wispr-тэй дүйцнэ
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm md:col-span-1 bg-purple-50/50 border-purple-100">
                                <CardHeader className="pb-2">
                                    <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">System</div>
                                    <CardTitle className="text-lg font-bold text-gray-900">Бонус Hint</CardTitle>
                                    <CardDescription>Системээс өгсөн үнэгүй Hint</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black text-purple-700">
                                        {stats?.hintStats?.totalBonusHints || 0}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle>Топ Худалдан авалтууд</CardTitle>
                                    <CardDescription>Баталгаажсан сүүлийн төлбөрүүд</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {stats?.recentActivity
                                            .filter(a => a.type === 'payment')
                                            .slice(0, 8)
                                            .map((p, i) => (
                                                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-green-100 p-2 rounded-full text-green-600">
                                                            <DollarSign className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">Төлсөн Нэхэмжлэх</p>
                                                            <p className="text-xs text-gray-500">{new Date(p.time).toLocaleDateString('mn-MN')}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-green-700">
                                                        {p.message.replace('Төлбөр: ', '')}
                                                    </span>
                                                </div>
                                            ))}
                                        {(!stats?.recentActivity.some(a => a.type === 'payment')) && (
                                            <p className="text-center text-gray-500 py-8">Төлбөр алга.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                </Tabs>
            </div>
        </div>
    );
}
