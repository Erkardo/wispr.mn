'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { getDashboardStats, checkAdminAccess, type DashboardStats } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, MessageSquare, DollarSign, Activity, Shield } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

export default function AdminPage() {
    const { user, loading: authLoading } = useUser();
    const [mounted, setMounted] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        async function verify() {
            if (!authLoading && user) {
                try {
                    const hasAccess = await checkAdminAccess(user.email);
                    setIsAdmin(hasAccess);
                } catch (err: any) {
                    console.error("Admin check failed:", err);
                    setError("Failed to verify admin status: " + (err.message || "Unknown error"));
                } finally {
                    setCheckingAccess(false);
                }
            } else if (!authLoading && !user) {
                setCheckingAccess(false);
            }
        }
        if (mounted) verify();
    }, [user, authLoading, mounted]);

    useEffect(() => {
        if (isAdmin && mounted) {
            setLoading(true);
            getDashboardStats()
                .then(setStats)
                .catch((err) => {
                    console.error("Stats fetch failed:", err);
                    // Show the actual error message from the server (e.g. "Missing Firebase Admin Credentials")
                    setError(err.message || "Failed to load dashboard stats.");
                })
                .finally(() => setLoading(false));
        }
    }, [isAdmin, mounted]);

    // Prevent hydration mismatch and SSR errors with Recharts by not rendering until mounted
    if (!mounted) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (authLoading || checkingAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="max-w-md text-center p-8 border-destructive/20 bg-destructive/5">
                    <h1 className="text-xl font-bold mb-4 text-destructive">System Error</h1>
                    <p className="text-muted-foreground">{error}</p>
                </Card>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="max-w-md text-center p-8">
                    <h1 className="text-xl font-bold mb-4">Нэвтрэх шаардлагатай</h1>
                    <p>Админ хэсэгт хандахын тулд эхлээд нэвтэрнэ үү.</p>
                </Card>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="max-w-md text-center p-8 border-destructive/20 bg-destructive/5">
                    <h1 className="text-xl font-bold mb-4 text-destructive">Хандах эрхгүй</h1>
                    <p>Таны имэйл ({user.email}) админ жагсаалтад бүртгэгдээгүй байна.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 p-4 md:p-8 pb-32">
            <div className="mx-auto max-w-6xl space-y-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Админ Самбар</h1>

                {loading && !stats ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : stats ? (
                    <>
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Нийт Хэрэглэгч</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Нийт Wispr (Hint илгээсэн)</CardTitle>
                                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalWisprs}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Нийт Confession</CardTitle>
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalConfessions}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Нийт Орлого</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}₮</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Row */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Сүүлийн 7 хоног (Орлого)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.dailyStats}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}₮`} />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="payments" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Орлого" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Сүүлийн 7 хоног (Шинэ Confession)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={stats.dailyStats}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Line type="monotone" dataKey="wisprs" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} name="Confessions" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Activity */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Сүүлийн үйлдлүүд</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats.recentActivity.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${item.type === 'payment' ? 'bg-green-500' :
                                                    item.type === 'confession' ? 'bg-pink-500' : 'bg-blue-500'
                                                    }`} />
                                                <span className="text-sm font-medium">{item.message}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(item.time).toLocaleString('mn-MN')}
                                            </span>
                                        </div>
                                    ))}
                                    {stats.recentActivity.length === 0 && (
                                        <div className="text-center text-muted-foreground py-4">Одоогоор үйлдэл бүртгэгдээгүй байна</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                    </>
                ) : null}
            </div>
        </div>
    );
}
