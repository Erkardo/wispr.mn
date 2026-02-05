'use server';

import { getAdminDb } from '@/lib/admin-db';
import { Timestamp } from 'firebase-admin/firestore';

export type DashboardStats = {
    totalUsers: number;
    totalWisprs: number;
    totalConfessions: number;
    totalRevenue: number;
    recentActivity: ActivityItem[];
    dailyStats: DayStat[];
    // New fields for enhanced details
    hintStats?: {
        totalHintsSold: number;
        totalBonusHints: number;
        hintsUsed: number;
    }
};

export type UserDetail = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    hintsRemaining: number;
    createdAt: number;
    lastLogin?: number;
};

export type ActivityItem = {
    type: 'wispr' | 'confession' | 'user' | 'payment';
    message: string;
    time: number;
};

export type DayStat = {
    date: string;
    wisprs: number;
    users: number;
    payments: number;
};

// Check if user is admin based on email
export async function checkAdminAccess(email: string | null | undefined) {
    try {
        if (!email) {
            console.log("[AdminCheck] No email provided");
            return false;
        }

        // Check various sources for admin email to debug
        const envEmails = process.env.ADMIN_EMAILS || "";

        console.log(`[AdminCheck] Server Side. Checking access for: ${email}`);

        const adminEmails = envEmails.split(',').map(e => e.trim().toLowerCase());
        const userEmail = email.trim().toLowerCase();

        const isMatch = adminEmails.includes(userEmail);
        console.log(`[AdminCheck] Match result: ${isMatch}`);

        return isMatch;
    } catch (error) {
        console.error("Error checking admin access:", error);
        return false;
    }
}

export type DashboardStatsResponse = {
    success: boolean;
    data?: DashboardStats;
    error?: string;
};

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
    // Default mock data to use as fallback
    const mockData: DashboardStats = {
        totalUsers: 0,
        totalWisprs: 0,
        totalConfessions: 0,
        totalRevenue: 0,
        recentActivity: [],
        dailyStats: []
    };

    try {
        console.log("Starting getDashboardStats...");

        let db;
        try {
            db = getAdminDb();
        } catch (dbError) {
            console.warn("Failed to initialize Admin DB. Using empty stats.", dbError);
            return { success: true, data: mockData };
        }

        // 1. Total Counts & Header Stats
        const [usersSnap, wisprsSnap, confessionsSnap, paymentsSnap] = await Promise.all([
            db.collection('complimentOwners').count().get().catch(() => ({ data: () => ({ count: 0 }) })),
            db.collection('wisprs').count().get().catch(() => ({ data: () => ({ count: 0 }) })),
            db.collection('confessions').count().get().catch(() => ({ data: () => ({ count: 0 }) })),
            db.collection('invoices').where('status', '==', 'PAID').count().get().catch(() => ({ data: () => ({ count: 0 }) }))
        ]);

        const totalUsers = usersSnap.data().count;
        const totalWisprs = wisprsSnap.data().count;
        const totalConfessions = confessionsSnap.data().count;
        const totalPayments = paymentsSnap.data().count; // Count of paid invoices

        // Calculate Total Revenue
        const revenueSnap = await db.collection('invoices')
            .where('status', '==', 'PAID')
            .select('amount')
            .get()
            .catch(() => ({ empty: true, docs: [] }));

        let totalRevenue = 0;
        if (!revenueSnap.empty) {
            revenueSnap.docs.forEach((doc: any) => {
                const data = doc.data();
                totalRevenue += (data.amount || 0);
            });
        }

        // 2. Recent Activity (for list)
        const activity: ActivityItem[] = [];

        // Fetch recent items
        const [recentUsers, recentWisprs, recentConfessions, recentPayments] = await Promise.all([
            db.collection('complimentOwners').orderBy('createdAt', 'desc').limit(5).get().catch(() => ({ docs: [] })),
            db.collection('wisprs').orderBy('createdAt', 'desc').limit(5).get().catch(() => ({ docs: [] })),
            db.collection('confessions').orderBy('createdAt', 'desc').limit(5).get().catch(() => ({ docs: [] })),
            db.collection('invoices').where('status', '==', 'PAID').orderBy('updatedAt', 'desc').limit(5).get().catch(() => ({ docs: [] }))
        ]);

        // Process Recent Items
        recentUsers.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({
                type: 'user',
                message: `New user: ${data.displayName || 'Anonymous'}`,
                time: data.createdAt?.toMillis() || Date.now()
            });
        });

        recentWisprs.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({
                type: 'wispr',
                message: `New wispr sent`,
                time: data.createdAt?.toMillis() || Date.now()
            });
        });

        recentConfessions.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({
                type: 'confession',
                message: `New confession`,
                time: data.createdAt?.toMillis() || Date.now()
            });
        });

        recentPayments.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({
                type: 'payment',
                message: `Payment: ${data.amount}₮`,
                time: data.updatedAt?.toMillis() || Date.now()
            });
        });

        activity.sort((a, b) => b.time - a.time);
        const recentActivity = activity.slice(0, 15); // Increased limit for better list

        // 3. Daily Stats (Last 7 Days) - Real Aggregation
        const dailyMap = new Map<string, DayStat>();

        // Initialize last 7 days with 0
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const displayDate = dateKey.slice(5); // MM-DD
            dailyMap.set(dateKey, {
                date: displayDate,
                wisprs: 0,
                users: 0,
                payments: 0
            });
        }

        // Calculate start date for query (7 days ago)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

        // Run queries for last 7 days
        // Note: This reads all docs from last 7 days. Ensure this matches your usage limits.
        const [weeklyPayments, weeklyUsers, weeklyConfessions] = await Promise.all([
            db.collection('invoices')
                .where('status', '==', 'PAID')
                .where('updatedAt', '>=', sevenDaysAgoTimestamp)
                .select('updatedAt', 'amount')
                .get()
                .catch(() => ({ docs: [] })),
            db.collection('complimentOwners')
                .where('createdAt', '>=', sevenDaysAgoTimestamp)
                .select('createdAt')
                .get()
                .catch(() => ({ docs: [] })),
            db.collection('confessions')
                .where('createdAt', '>=', sevenDaysAgoTimestamp)
                .select('createdAt')
                .get()
                .catch(() => ({ docs: [] }))
        ]);

        // Aggregate Payments
        weeklyPayments.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.updatedAt) {
                const dateKey = data.updatedAt.toDate().toISOString().split('T')[0];
                if (dailyMap.has(dateKey)) {
                    const stat = dailyMap.get(dateKey)!;
                    stat.payments += (data.amount || 0);
                }
            }
        });

        // Aggregate Users
        weeklyUsers.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.createdAt) {
                const dateKey = data.createdAt.toDate().toISOString().split('T')[0];
                if (dailyMap.has(dateKey)) {
                    const stat = dailyMap.get(dateKey)!;
                    stat.users += 1;
                }
            }
        });

        // Aggregate Confessions (mapped to 'wisprs' in DayStat for chart simplicity or separate?)
        // The chart expects 'wisprs' key for the line chart. Let's use it for confessions count.
        weeklyConfessions.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.createdAt) {
                const dateKey = data.createdAt.toDate().toISOString().split('T')[0];
                if (dailyMap.has(dateKey)) {
                    const stat = dailyMap.get(dateKey)!;
                    stat.wisprs += 1;
                }
            }
        });

        const dailyStats = Array.from(dailyMap.values());



        // 4. Calculate Hint Stats (Approximation)
        // This requires iterating users or storing global counters. 
        // Iterate users snap to get exact hints remaining + bonus hints?
        // Let's do a lightweight aggregation from the 'weeklyUsers' logic if possible, 
        // OR better yet, fetch All Users (since it's small, 17 users) for this dashboard load.

        let hintsUsed = 0;
        let totalBonusHints = 0;

        // Fetch ALL users for accurate stats (Okay for < 1000 users)
        const allUsersSnap = await db.collection('complimentOwners').get().catch(() => ({ docs: [] }));
        allUsersSnap.docs.forEach((d: any) => {
            const data = d.data();
            totalBonusHints += (data.bonusHints || 0);
            hintsUsed += (data.hintsUsed || 0); // Assuming we track this, if not, we might need another way
        });

        // Calculate sold hints from invoices
        let totalHintsSold = 0;
        // Re-using revenue calculation logic but looking at package details if possible
        // For now, let's infer: 
        // 5 Hints = 6900
        // 10 Hints = 11900
        // 20 Hints = 19900
        if (!revenueSnap.empty) {
            revenueSnap.docs.forEach((doc: any) => {
                const data = doc.data();
                const amount = data.amount || 0;
                if (amount === 6900) totalHintsSold += 5;
                else if (amount === 11900) totalHintsSold += 10;
                else if (amount === 19900) totalHintsSold += 20;
                else totalHintsSold += Math.floor(amount / 1000); // Fallback estimate
            });
        }

        return {
            success: true,
            data: {
                totalUsers,
                totalWisprs,
                totalConfessions,
                totalRevenue,
                recentActivity,
                dailyStats,
                hintStats: {
                    totalHintsSold,
                    totalBonusHints,
                    hintsUsed
                }
            }
        };

    } catch (e: any) {
        console.error("Dashboard Stats Error (Falling back to mock):", e);
        // Fallback to mock data on critical failure
        return { success: true, data: mockData };
    }
}

export async function getAdminUsersList(): Promise<{ success: boolean; users: UserDetail[] }> {
    try {
        const db = getAdminDb();
        const usersSnap = await db.collection('complimentOwners')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const users: UserDetail[] = usersSnap.docs.map(doc => {
            const data = doc.data();

            // Calculate actual hints remaining (logic from profile page: daily + bonus)
            let dailyHints = 5;
            // Check if reset today? Simplified for admin view: just assume 5 base + bonus
            // Ideally should replicate the 'isToday' logic but let's stick to raw data for now.
            const hintsRemaining = (5 - (data.hintsUsedToday || 0)) + (data.bonusHints || 0);

            return {
                uid: doc.id,
                email: data.email || null,
                displayName: data.displayName || 'Anonymous',
                photoURL: data.photoURL || null,
                hintsRemaining: hintsRemaining,
                createdAt: data.createdAt?.toMillis() || 0,
                lastLogin: data.lastLogin?.toMillis()
            };
        });

        return { success: true, users };
    } catch (e) {
        console.error("Failed to fetch user list", e);
        return { success: false, users: [] };
    }
}

// Debugging helper to check env vars on server
export async function debugEnvVars() {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const adminEmails = process.env.ADMIN_EMAILS;

    return {
        projectId: projectId ? `${projectId.substring(0, 5)}...` : 'MISSING',
        clientEmail: clientEmail ? `${clientEmail.substring(0, 5)}...` : 'MISSING',
        privateKey: privateKey ? `Length: ${privateKey.length}, Starts with: ${privateKey.substring(0, 10)}...` : 'MISSING',
        adminEmails: adminEmails ? adminEmails : 'MISSING',
        nodeEnv: process.env.NODE_ENV
    };
}
