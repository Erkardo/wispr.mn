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
    const [isAdmin, setIsAdmin] = useState(false);

    // Search state for users
    const [userSearch, setUserSearch] = useState('');

    useEffect(() => {
        async function init() {
            if (authLoading) return;

            if (!user) {
                // Not logged in
                setError("You must be logged in to view this page.");
                setPageLoading(false);
                return;
            }

            try {
                // 1. Get Token & Check Access
                const token = await user.getIdToken();
                // We pass the token to the server action
                const access = await checkAdminAccess(token);

                if (!access.isAdmin) {
                    setError("Access Denied: You are not an admin.");
                    setPageLoading(false);
                    return;
                }
                setIsAdmin(true);

                // 2. Fetch Dashboard Stats
                const response = await getDashboardStats();
                if (response.success && response.data) {
                    setStats(response.data);
                } else {
                    setError("Failed to load dashboard data.");
                }

                // 3. Fetch Users List (for the Users tab)
                const usersResp = await getAdminUsersList();
                if (usersResp.success) {
                    setUsersList(usersResp.users);
                }

            } catch (err) {
                console.error("Admin init error:", err);
                setError("An unexpected error occurred.");
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
                <p className="text-gray-500 font-medium">Verifying admin access & loading data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-red-100">
                    <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Button onClick={() => window.location.href = '/'} variant="outline">
                        Return to Home
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
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                        <p className="text-muted-foreground">Welcome back. Overview of system performance.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 h-8 bg-white">
                            {new Date().toLocaleDateString()}
                        </Badge>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="bg-white p-1 border shadow-sm w-full md:w-auto overflow-x-auto flex justify-start">
                        <TabsTrigger value="overview" className="flex-1 md:flex-none">Overview</TabsTrigger>
                        <TabsTrigger value="users" className="flex-1 md:flex-none">Users ({usersList.length})</TabsTrigger>
                        <TabsTrigger value="finance" className="flex-1 md:flex-none">Finance & Hints</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative group">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-indigo-100 font-medium text-sm">Total Revenue</p>
                                            <h3 className="text-3xl font-bold mt-2">
                                                {stats?.totalRevenue.toLocaleString()}₮
                                            </h3>
                                        </div>
                                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                            <DollarSign className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs text-indigo-100">
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        <span>+12.5% from last month</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-500 font-medium text-sm">Total Users</p>
                                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{stats?.totalUsers}</h3>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded-xl">
                                            <Users className="h-6 w-6 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                        <span>Active accounts</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-500 font-medium text-sm">Total Wisprs</p>
                                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{stats?.totalWisprs}</h3>
                                        </div>
                                        <div className="bg-pink-50 p-3 rounded-xl">
                                            <MessageSquare className="h-6 w-6 text-pink-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs text-gray-500">
                                        <span>Hints sent</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-500 font-medium text-sm">Confessions</p>
                                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{stats?.totalConfessions}</h3>
                                        </div>
                                        <div className="bg-orange-50 p-3 rounded-xl">
                                            <Activity className="h-6 w-6 text-orange-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs text-gray-500">
                                        <span>Anonymous messages</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            <Card className="border-none shadow-sm h-[350px]">
                                <CardHeader>
                                    <CardTitle>Revenue Overview</CardTitle>
                                    <CardDescription>Daily revenue for the last 7 days</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.dailyStats}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                                tickMargin={10}
                                            />
                                            <YAxis
                                                hide={true} // Hide Y axis for cleaner look, tooltip is enough
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => [`${value}₮`, 'Revenue']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="payments"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorRevenue)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm h-[350px]">
                                <CardHeader>
                                    <CardTitle>User Activity</CardTitle>
                                    <CardDescription>New confessions and wisprs</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.dailyStats} barSize={20}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                                tickMargin={10}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend iconType="circle" />
                                            <Bar name="New Wisprs" dataKey="wisprs" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                            <Bar name="New Users" dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Activity List */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-gray-500" />
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats?.recentActivity.map((item, i) => (
                                        <div key={i} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                                            <div className={`p-2 rounded-full shrink-0 ${item.type === 'payment' ? 'bg-green-100 text-green-600' :
                                                item.type === 'user' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.type === 'payment' ? <CreditCard className="h-4 w-4" /> :
                                                    item.type === 'user' ? <UserPlus className="h-4 w-4" /> :
                                                        <Activity className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{item.message}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(item.time).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                                        <p className="text-sm text-gray-500 text-center py-4">No recent activity.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* USERS TAB */}
                    <TabsContent value="users" className="space-y-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>Users Directory</CardTitle>
                                    <CardDescription>All registered users and their status.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="search"
                                        placeholder="Search users..."
                                        className="pl-9 w-full"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Joined</TableHead>
                                                <TableHead>Hints Left</TableHead>
                                                <TableHead>Last Active</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                                <TableRow key={user.uid}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={user.photoURL || undefined} />
                                                                <AvatarFallback>{user.displayName?.substring(0, 2).toUpperCase() || 'UN'}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm text-gray-900">{user.displayName || 'Anonymous'}</span>
                                                                <span className="text-xs text-gray-500">{user.email}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-gray-500 text-sm">
                                                        {new Date(user.createdAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={user.hintsRemaining > 5 ? "default" : "secondary"}>
                                                            {user.hintsRemaining} Hints
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-500 text-sm">
                                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon">
                                                            <GripVertical className="h-4 w-4 text-gray-400" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                                                        No users found matching "{userSearch}"
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* FINANCE & HINTS TAB */}
                    <TabsContent value="finance" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Summary Cards */}
                            <Card className="border-none shadow-sm md:col-span-1 bg-indigo-50 border-indigo-100">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-indigo-800">Hints Sold</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-indigo-900">
                                        {stats?.hintStats?.totalHintsSold || 0}
                                    </div>
                                    <p className="text-xs text-indigo-600 mt-1">Paid packages</p>
                                </CardContent>
                            </Card>
                            <Card className="border-none shadow-sm md:col-span-1 bg-purple-50 border-purple-100">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-purple-800">Bonus Hints</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-purple-900">
                                        {stats?.hintStats?.totalBonusHints || 0}
                                    </div>
                                    <p className="text-xs text-purple-600 mt-1">System gifted / Daily resets</p>
                                </CardContent>
                            </Card>
                            <Card className="border-none shadow-sm md:col-span-1 bg-amber-50 border-amber-100">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-amber-800">Hints Consumed</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-amber-900">
                                        {stats?.hintStats?.hintsUsed || 0}
                                    </div>
                                    <p className="text-xs text-amber-600 mt-1">Total hints used by users</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Hint Breakdown Visualization (Simplified) */}
                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle>Revenue Sources</CardTitle>
                                    <CardDescription>Breakdown of paid services</CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center justify-center h-[200px] text-gray-500">
                                    {/* Placeholder for Pie Chart if needed, using simple text for now */}
                                    {stats?.totalRevenue ? (
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-gray-900">100%</p>
                                            <p>Hint Packages</p>
                                            <p className="text-sm text-gray-400 mt-2">Currently the only revenue stream</p>
                                        </div>
                                    ) : (
                                        <p>No revenue data yet</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle>Top Spenders</CardTitle>
                                    <CardDescription>Users who purchased hints</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {/* We can reuse Recent Activity 'payment' items or fetch dedicated list */}
                                            {stats?.recentActivity.filter(a => a.type === 'payment').slice(0, 5).map((pay, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">User (via Invoice)</TableCell>
                                                    <TableCell className="text-right text-green-600 font-bold">
                                                        {pay.message.replace('Payment: ', '')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!stats?.recentActivity.some(a => a.type === 'payment')) && (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-center py-4 text-gray-500">No recent payments</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
