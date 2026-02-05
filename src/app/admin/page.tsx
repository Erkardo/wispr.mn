'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { getDashboardStats, checkAdminAccess, type DashboardStats, type ActivityItem } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, MessageSquare, DollarSign, Activity, Shield, TrendingUp, ArrowUpRight, CreditCard, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
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
                .then((res) => {
                    if (res.success && res.data) {
                        setStats(res.data);
                    } else {
                        throw new Error(res.error || "Failed to load dashboard stats.");
                    }
                })
                .catch((err) => {
                    console.error("Stats fetch failed:", err);
                    setError(err.message || "Failed to load dashboard stats.");
                })
                .finally(() => setLoading(false));
        }
    }, [isAdmin, mounted]);

    if (!mounted) return null;

    if (authLoading || checkingAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Checking permissions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
                <Card className="max-w-md w-full border-destructive/20 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <Shield className="h-5 w-5" /> Access Error
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{error}</p>
                        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto">
                            Details: {JSON.stringify({ email: user?.email, uid: user?.uid }, null, 2)}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
                <Card className="max-w-md w-full text-center shadow-lg border-none ring-1 ring-black/5">
                    <CardHeader>
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <Shield className="h-6 w-6 text-gray-500" />
                        </div>
                        <CardTitle>Restricted Access</CardTitle>
                        <CardDescription>
                            This area is restricted to administrators only.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Signed in as: <span className="font-medium text-foreground">{user?.email || 'Guest'}</span>
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT', currencyDisplay: 'narrowSymbol' }).format(amount).replace('MNT', '₮');
    };

    // Filter activities
    const payments = stats?.recentActivity.filter(a => a.type === 'payment') || [];
    const otherActivities = stats?.recentActivity.filter(a => a.type !== 'payment') || [];

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 pb-32">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                        <p className="text-muted-foreground">Welcome back, admin. Here's what's happening today.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 h-8">
                            Last updated: {new Date().toLocaleTimeString()}
                        </Badge>
                    </div>
                </div>

                {loading || !stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <Card key={i} className="h-32 animate-pulse bg-gray-100/50 border-none" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative group">
                                <div className="absolute right-0 top-0 h-24 w-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-white/20" />
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-indigo-100 flex items-center justify-between">
                                        Total Revenue
                                        <DollarSign className="h-4 w-4 text-indigo-100" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                                    <p className="text-xs text-indigo-200 mt-1 flex items-center">
                                        <TrendingUp className="h-3 w-3 mr-1" /> +12.5% from last month
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-blue-600" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Wisprs</CardTitle>
                                    <div className="h-8 w-8 rounded-full bg-pink-50 flex items-center justify-center">
                                        <MessageSquare className="h-4 w-4 text-pink-600" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-900">{stats.totalWisprs}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Hints sent</p>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Confessions</CardTitle>
                                    <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
                                        <Activity className="h-4 w-4 text-orange-600" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-900">{stats.totalConfessions}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Anonymous messages</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle>Revenue Overview</CardTitle>
                                    <CardDescription>Daily revenue for the last 7 days</CardDescription>
                                </CardHeader>
                                <CardContent className="pl-0">
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats.dailyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                                    tickFormatter={(value) => `${value}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none' }}
                                                    itemStyle={{ color: '#8b5cf6', fontWeight: 600 }}
                                                    formatter={(value: number) => [`${value}₮`, 'Revenue']}
                                                />
                                                <Area type="monotone" dataKey="payments" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle>User Activity</CardTitle>
                                    <CardDescription>New confessions and wisprs</CardDescription>
                                </CardHeader>
                                <CardContent className="pl-0">
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.dailyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none' }}
                                                />
                                                <Bar dataKey="wisprs" name="Confessions" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                <Bar dataKey="users" name="New Users" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Transactions & Actions */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Transactions - Takes 2 cols */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-none shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5 text-gray-500" />
                                            Recent Transactions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right">Time</TableHead>
                                                    <TableHead className="text-right">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments.length > 0 ? (
                                                    payments.map((item, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-medium text-gray-900">{item.message}</TableCell>
                                                            <TableCell className="text-right text-muted-foreground">{new Date(item.time).toLocaleString('mn-MN')}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                            No recent transactions found
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Recent Actions - Takes 1 col */}
                            <div className="space-y-6">
                                <Card className="border-none shadow-sm h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-gray-500" />
                                            Recent Activity
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {otherActivities.length > 0 ? (
                                                otherActivities.map((item, i) => (
                                                    <div key={i} className="flex gap-4 items-start">
                                                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${item.type === 'user' ? 'bg-blue-500' :
                                                                item.type === 'confession' ? 'bg-pink-500' : 'bg-gray-400'
                                                            }`} />
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium leading-none text-gray-900">
                                                                {item.message}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(item.time).toLocaleString('mn-MN')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center text-muted-foreground py-8">
                                                    No recent activity
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
