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
    if (!email) return false;
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    return adminEmails.includes(email);
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const db = getAdminDb();

    // 1. Total Counts (Efficiently using count())
    const usersCountSnap = await db.collection('complimentOwners').count().get();
    const confessionsCountSnap = await db.collection('confessions').count().get();
    const wisprsCountSnap = await db.collectionGroup('compliments').count().get();

    // 2. Revenue (Sum of PAID invoices) - This requires reading all PAID invoices
    const paidInvoicesSnap = await db.collection('invoices')
        .where('status', '==', 'PAID')
        .get();

    let totalRevenue = 0;
    paidInvoicesSnap.forEach(doc => {
        totalRevenue += (doc.data().amount || 0);
    });

    // 3. Recent Activity (Sample)
    const activity: ActivityItem[] = [];

    // Get last 5 confessions
    const recentConfessions = await db.collection('confessions')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

    recentConfessions.forEach(doc => {
        const data = doc.data();
        activity.push({
            type: 'confession',
            message: `New confession: "${data.text.substring(0, 30)}..."`,
            time: data.createdAt?.toMillis() || Date.now()
        });
    });

    // Get last 5 payments
    const recentPayments = await db.collection('invoices')
        .where('status', '==', 'PAID')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

    recentPayments.forEach(doc => {
        const data = doc.data();
        activity.push({
            type: 'payment',
            message: `Payment received: ${data.amount}₮`,
            time: data.createdAt?.toMillis() || Date.now()
        });
    });

    // Sort and limit activity
    activity.sort((a, b) => b.time - a.time);

    // 4. Daily Stats (Last 7 days)
    // Note: Aggregating this purely on-the-fly from raw docs might be expensive if scale is huge.
    // For MVP, we'll approximate or fetch recent 7 days of docs. 
    // Ideally, you'd have a scheduled function aggregating this into a 'stats' collection.

    // For now, let's keep it simple: Just return the 7 days placeholders 
    // or do a lightweight query if documents are few. 
    // Let's implement a real query for LAST 7 DAYS of *invoices* and *confessions*.

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

    const recentStatsInvoices = await db.collection('invoices')
        .where('status', '==', 'PAID')
        .where('createdAt', '>=', sevenDaysAgoTimestamp)
        .get();

    const recentStatsConfessions = await db.collection('confessions')
        .where('createdAt', '>=', sevenDaysAgoTimestamp)
        .get();

    // We can't easily get 'users' by createdAt unless we stored it. 
    // complimentOwners doesn't seem to have createdAt in the type definition, relying on implied or different field.
    // We'll check if we can skip users chart for now or add it later.

    const dailyMap = new Map<string, DayStat>();

    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        dailyMap.set(dateStr, { date: dateStr, wisprs: 0, users: 0, payments: 0 });
    }

    recentStatsInvoices.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
            const dateStr = data.createdAt.toDate().toISOString().split('T')[0];
            if (dailyMap.has(dateStr)) {
                const stat = dailyMap.get(dateStr)!;
                stat.payments += data.amount;
                dailyMap.set(dateStr, stat);
            }
        }
    });

    recentStatsConfessions.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
            const dateStr = data.createdAt.toDate().toISOString().split('T')[0];
            if (dailyMap.has(dateStr)) {
                const stat = dailyMap.get(dateStr)!;
                stat.wisprs += 1; // Actually confessions, but we'll use 'wisprs' field for chart
                dailyMap.set(dateStr, stat);
            }
        }
    });

    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
        totalUsers: usersCountSnap.data().count,
        totalWisprs: wisprsCountSnap.data().count,
        totalConfessions: confessionsCountSnap.data().count,
        totalRevenue: totalRevenue,
        recentActivity: activity.slice(0, 10),
        dailyStats: dailyStats
    };
}
