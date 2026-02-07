'use server';

import { getAdminDb, getAdminAuth } from '@/lib/admin-db';
import { Timestamp } from 'firebase-admin/firestore';


export type ActivityItem = {
    type: 'user' | 'wispr' | 'confession' | 'payment';
    message: string;
    time: number;
};

export type DayStat = {
    date: string;
    wisprs: number;
    users: number;
    payments: number;
};

export type UserDetail = {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    hintsRemaining: number;
    createdAt: number;
    lastLogin?: number;
};

export type DashboardStatsResponse = {
    success: boolean;
    data: DashboardStats;
};

// Update type definition
export type DashboardStats = {
    totalUsers: number;
    totalWisprs: number;
    totalConfessions: number;
    totalRevenue: number;
    recentActivity: ActivityItem[];
    dailyStats: DayStat[];
    hintStats?: {
        totalHintsSold: number;
        totalBonusHints: number;
        hintsUsed: number;
    };
    userBreakdown?: {
        verified: number;
        anonymous: number;
    };
    packageBreakdown?: {
        small: number;  // 5 hints
        medium: number; // 10 hints
        large: number;  // 20 hints
    };
};

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
    const mockData: DashboardStats = {
        totalUsers: 0, totalWisprs: 0, totalConfessions: 0, totalRevenue: 0, recentActivity: [], dailyStats: []
    };

    try {
        const db = getAdminDb();
        const auth = getAdminAuth();

        // 1. User Stats from Auth (Source of Truth)
        const listUsersResult = await auth.listUsers(1000);
        const allAuthUsers = listUsersResult.users;

        const totalUsers = allAuthUsers.length;
        const verifiedUsers = allAuthUsers.filter(u => u.email).length;
        const anonymousUsers = totalUsers - verifiedUsers;

        // 2. Content Counts from Firestore
        const [wisprsSnap, confessionsSnap, paymentsSnap] = await Promise.all([
            db.collectionGroup('compliments').count().get().catch(() => ({ data: () => ({ count: 0 }) })),
            db.collection('confessions').count().get().catch(() => ({ data: () => ({ count: 0 }) })),
            db.collection('invoices').where('status', '==', 'PAID').count().get().catch(() => ({ data: () => ({ count: 0 }) }))
        ]);

        const totalWisprs = wisprsSnap.data().count;
        const totalConfessions = confessionsSnap.data().count;
        const totalPayments = paymentsSnap.data().count;

        // Calculate Total Revenue
        const revenueSnap = await db.collection('invoices')
            .where('status', '==', 'PAID')
            .select('amount')
            .get()
            .catch(() => ({ empty: true, docs: [] }));

        let totalRevenue = 0;
        if (!revenueSnap.empty) {
            revenueSnap.docs.forEach((doc: any) => {
                totalRevenue += (doc.data().amount || 0);
            });
        }

        // 3. Recent Activity & Daily Stats
        const activity: ActivityItem[] = [];

        const [recentConfessions, recentPayments, recentWisprs] = await Promise.all([
            db.collection('confessions').orderBy('createdAt', 'desc').limit(5).get().catch(() => ({ docs: [] })),
            db.collection('invoices').where('status', '==', 'PAID').orderBy('updatedAt', 'desc').limit(5).get().catch(() => ({ docs: [] })),
            db.collectionGroup('compliments').orderBy('createdAt', 'desc').limit(5).get().catch(() => ({ docs: [] }))
        ]);

        // Add recent users from Auth list (sorted manually)
        const sortedRecentUsers = allAuthUsers.sort((a, b) => new Date(b.metadata.creationTime).getTime() - new Date(a.metadata.creationTime).getTime()).slice(0, 5);

        sortedRecentUsers.forEach(u => {
            activity.push({
                type: 'user',
                message: `Шинэ хэрэглэгч: ${u.email ? u.displayName || u.email : 'Зочин'}`,
                time: new Date(u.metadata.creationTime).getTime()
            });
        });
        recentWisprs.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({ type: 'wispr', message: 'Шинэ wispr илгээгдлээ', time: data.createdAt?.toMillis() || Date.now() });
        });
        recentConfessions.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({ type: 'confession', message: 'Шинэ confession ирлээ', time: data.createdAt?.toMillis() || Date.now() });
        });
        recentPayments.docs.forEach((d: any) => {
            const data = d.data();
            activity.push({ type: 'payment', message: `Төлбөр: ${data.amount}₮`, time: data.updatedAt?.toMillis() || Date.now() });
        });

        activity.sort((a, b) => b.time - a.time);
        const recentActivity = activity.slice(0, 15);

        // Daily Stats - Simplified
        const dailyMap = new Map<string, DayStat>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const k = d.toISOString().split('T')[0];
            dailyMap.set(k, { date: k.slice(5), wisprs: 0, users: 0, payments: 0 });
        }
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

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

        weeklyPayments.docs.forEach((doc: any) => {
            if (doc.data().updatedAt) {
                const k = doc.data().updatedAt.toDate().toISOString().split('T')[0];
                if (dailyMap.has(k)) dailyMap.get(k)!.payments += (doc.data().amount || 0);
            }
        });
        weeklyUsers.docs.forEach((doc: any) => {
            if (doc.data().createdAt) {
                const k = doc.data().createdAt.toDate().toISOString().split('T')[0];
                if (dailyMap.has(k)) dailyMap.get(k)!.users += 1;
            }
        });
        weeklyConfessions.docs.forEach((doc: any) => {
            if (doc.data().createdAt) {
                const k = doc.data().createdAt.toDate().toISOString().split('T')[0];
                if (dailyMap.has(k)) dailyMap.get(k)!.wisprs += 1;
            }
        });
        const dailyStats = Array.from(dailyMap.values());

        // Hint Stats
        const hintsUsed = totalWisprs;
        let totalBonusHints = 0;
        const allOwnersSnap = await db.collection('complimentOwners').select('bonusHints').get().catch(() => ({ docs: [] }));
        allOwnersSnap.docs.forEach((d: any) => totalBonusHints += (d.data().bonusHints || 0));

        let totalHintsSold = 0;
        let packageSmall = 0;
        let packageMedium = 0;
        let packageLarge = 0;

        if (!revenueSnap.empty) {
            revenueSnap.docs.forEach((doc: any) => {
                const amount = doc.data().amount || 0;
                if (amount === 6900) { totalHintsSold += 5; packageSmall++; }
                else if (amount === 11900) { totalHintsSold += 10; packageMedium++; }
                else if (amount === 19900) { totalHintsSold += 20; packageLarge++; }
                else totalHintsSold += Math.floor(amount / 1000);
            });
        }

        return {
            success: true,
            data: {
                totalUsers, totalWisprs, totalConfessions, totalRevenue, recentActivity,
                dailyStats,
                hintStats: { totalHintsSold, totalBonusHints, hintsUsed },
                userBreakdown: { verified: verifiedUsers, anonymous: anonymousUsers },
                packageBreakdown: { small: packageSmall, medium: packageMedium, large: packageLarge }
            }
        };

    } catch (e: any) {
        console.error("Dashboard Stats Error:", e);
        return { success: true, data: mockData };
    }
}

export async function getAdminUsersList(): Promise<{ success: boolean; users: UserDetail[] }> {
    try {
        const auth = getAdminAuth();
        const db = getAdminDb();

        // 1. Fetch Users from Authentication Service (Source of Truth for Identity)
        const listUsersResult = await auth.listUsers(1000); // Fetch up to 1000 users
        const authUsers = listUsersResult.users;

        // 2. Fetch Firestore Data for Hint Stats (Source of Truth for usage)
        const statsSnapshot = await db.collection('complimentOwners').get();
        const statsMap = new Map();

        statsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            statsMap.set(doc.id, {
                ...data,
                // Convert Timestamp to Date for easier comparison
                lastHintResetAt: data.lastHintResetAt?.toDate ? data.lastHintResetAt.toDate() : null
            });
        });

        // 3. Merge Data with Robust Logic
        const users: UserDetail[] = authUsers.map(u => {
            const stats = statsMap.get(u.uid) || {};

            // ROBUS HINT LOGIC:
            // If lastHintResetAt is NOT today, then hintsUsedToday should be considered 0.
            let usedToday = typeof stats.hintsUsedToday === 'number' ? stats.hintsUsedToday : 0;

            const lastReset = stats.lastHintResetAt;
            const isResetToday = lastReset && (
                lastReset.getDate() === new Date().getDate() &&
                lastReset.getMonth() === new Date().getMonth() &&
                lastReset.getFullYear() === new Date().getFullYear()
            );

            if (!isResetToday) {
                usedToday = 0; // Reset hasn't happened today, so used is effectively 0
            }

            const daily = 1; // CHANGED: Daily free hints reduced from 5 to 1
            const bonus = typeof stats.bonusHints === 'number' ? stats.bonusHints : 0;

            // Allow negative balance protection (though shouldn't happen)
            const dailyRemaining = Math.max(0, daily - usedToday);
            const totalRemaining = dailyRemaining + bonus;

            return {
                uid: u.uid,
                email: u.email || "Имэйлгүй",
                displayName: u.displayName || "Нэргүй Хэрэглэгч",
                photoURL: u.photoURL || null,
                hintsRemaining: totalRemaining,
                createdAt: new Date(u.metadata.creationTime).getTime(),
                lastLogin: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).getTime() : undefined
            };
        });

        // Sort by Created At Desc
        users.sort((a, b) => b.createdAt - a.createdAt);

        return { success: true, users };

    } catch (e) {
        console.error("Failed to fetch user list from Auth:", e);
        return { success: false, users: [] };
    }
}

export async function checkAdminAccess(idToken?: string | null): Promise<boolean> {
    if (!idToken) return false;

    try {
        // Verify the ID token first to securely get the email
        const decodedToken = await getAdminAuth().verifyIdToken(idToken);
        const email = decodedToken.email;

        if (!email) return false;

        const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
        return adminEmails.includes(email.toLowerCase());
    } catch (error) {
        console.error("Admin access check failed:", error);
        return false;
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
