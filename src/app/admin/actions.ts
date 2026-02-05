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
import { getAuth } from 'firebase-admin/auth';

// Check if user is admin based on ID Token
export async function checkAdminAccess(idToken?: string) {
    try {
        if (!idToken) {
            console.log("[AdminCheck] No token provided");
            return { isAdmin: false };
        }

        // Ensure Admin SDK is initialized
        try {
            getAdminDb();
        } catch (e) {
            console.error("Failed to init admin db for auth check", e);
            return { isAdmin: false };
        }

        const decodedToken = await getAuth().verifyIdToken(idToken);
        const email = decodedToken.email;

        if (!email) {
            console.log("[AdminCheck] Token verified but no email found");
            return { isAdmin: false };
        }

        const envEmails = process.env.ADMIN_EMAILS || "";
        console.log(`[AdminCheck] Server Side. Checking access for: ${email}`);

        const adminEmails = envEmails.split(',').map(e => e.trim().toLowerCase());
        const userEmail = email.trim().toLowerCase();

        const isMatch = adminEmails.includes(userEmail);
        console.log(`[AdminCheck] Match result: ${isMatch}`);

        return { isAdmin: isMatch, email: userEmail };
    } catch (error) {
        console.error("Error checking admin access:", error);
        return { isAdmin: false };
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
                message: `Шинэ хэрэглэгч: ${data.displayName || 'Нэргүй'}`,
                time: data.createdAt?.toMillis() || Date.now()
            });
        });

        recentWisprs.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({
                type: 'wispr',
                message: `Шинэ wispr илгээгдлээ`,
                time: data.createdAt?.toMillis() || Date.now()
            });
        });

        recentConfessions.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({
                type: 'confession',
                message: `Шинэ confession ирлээ`,
                time: data.createdAt?.toMillis() || Date.now()
            });
        });

        recentPayments.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({
                type: 'payment',
                message: `Төлбөр: ${data.amount}₮`,
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



        // 4. Calculate Hint Stats
        // "Hints Used" is effectively "Total Wisprs" sent (assuming 1 hint per wispr)
        // This is more accurate than summing a user field that might not exist.
        const hintsUsed = totalWisprs;
        let totalBonusHints = 0;

        // Fetch ALL users for accurate Bonus stats
        const allUsersSnap = await db.collection('complimentOwners').get().catch(() => ({ docs: [] }));
        allUsersSnap.docs.forEach((d: any) => {
            const data = d.data();
            totalBonusHints += (data.bonusHints || 0);
        });

        // Calculate sold hints from invoices
        let totalHintsSold = 0;
        // Invoices analysis
        if (!revenueSnap.empty) {
            revenueSnap.docs.forEach((doc: any) => {
                const data = doc.data();
                const amount = data.amount || 0;
                // Specific package matching
                if (amount === 6900) totalHintsSold += 5;
                else if (amount === 11900) totalHintsSold += 10;
                else if (amount === 19900) totalHintsSold += 20;
                else totalHintsSold += Math.floor(amount / 1000); // Fallback: 1 hint per 1000₮
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
        // Fetch ALL users (limit 1000 to cover all current potential users)
        const usersSnap = await db.collection('complimentOwners')
            .limit(1000)
            .get();

        const users: UserDetail[] = usersSnap.docs.map(doc => {
            const data = doc.data();

            // Robust Name Resolution
            let finalDisplayName: string | null = (data.displayName as string) || null;
            if (!finalDisplayName) {
                if (data.email) finalDisplayName = (data.email as string).split('@')[0];
                else finalDisplayName = 'Нэргүй Хэрэглэгч';
            }

            // Hint Calculation: 
            // Default Daily: 5
            // Used Today: data.hintsUsedToday || 0
            // Bonus: data.bonusHints || 0
            // Safest display:
            const daily = 5;
            const usedToday = typeof data.hintsUsedToday === 'number' ? data.hintsUsedToday : 0;
            const bonus = typeof data.bonusHints === 'number' ? data.bonusHints : 0;
            const hintsRemaining = Math.max(0, (daily - usedToday)) + bonus;

            return {
                uid: doc.id,
                email: data.email || "Имэйлгүй",
                displayName: finalDisplayName,
                photoURL: data.photoURL || null,
                hintsRemaining: hintsRemaining,
                createdAt: data.createdAt?.toMillis() || 0,
                lastLogin: data.lastLogin?.toMillis()
            };
        });

        // Sort in memory locally to avoid index requirement
        users.sort((a, b) => b.createdAt - a.createdAt);

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
