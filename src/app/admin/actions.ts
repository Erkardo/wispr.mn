'use server';

// import { getAdminDb } from '@/lib/admin-db';
// import { Timestamp } from 'firebase-admin/firestore';

export type DashboardStats = {
    totalUsers: number;
    totalWisprs: number;
    totalConfessions: number;
    totalRevenue: number;
    recentActivity: ActivityItem[];
    dailyStats: DayStat[];
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
        console.log(`[AdminCheck] PROCESSED ADMIN_EMAILS: ${envEmails.length > 0 ? 'Found' : 'Empty/Not Set'}`);

        const adminEmails = envEmails.split(',').map(e => e.trim().toLowerCase());
        const userEmail = email.trim().toLowerCase();

        const isMatch = adminEmails.includes(userEmail);
        console.log(`[AdminCheck] Comparing '${userEmail}' against configured list. Match: ${isMatch}`);

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
    try {
        console.log("Starting getDashboardStats...");
        // const db = getAdminDb();

        // MOCK DATA TO TEST CONNECTION
        return {
            success: true,
            data: {
                totalUsers: 123,
                totalWisprs: 456,
                totalConfessions: 789,
                totalRevenue: 100000,
                recentActivity: [],
                dailyStats: []
            }
        };

        /*
        // 1. Total Counts (Efficiently using count())
        const usersCountSnap = await db.collection('complimentOwners').count().get();
        // ... (rest of the code mocked out)
        */

        /*
        // Sort and limit activity
        activity.sort((a, b) => b.time - a.time);

        // 4. Daily Stats (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo); // This line is commented out as per instruction

        // const recentStatsInvoices = await db.collection('invoices')
        //     .where('status', '==', 'PAID')
        //     .where('createdAt', '>=', sevenDaysAgoTimestamp)
        //     .get();

        // const recentStatsConfessions = await db.collection('confessions')
        //     .where('createdAt', '>=', sevenDaysAgoTimestamp)
        //     .get();

        // const dailyMap = new Map<string, DayStat>();
        */
    } catch (e: any) {
        console.error("Dashboard Stats Error:", e);
        return { success: false, error: e.message || "Failed to fetch stats" };
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
