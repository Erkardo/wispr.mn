'use server';

import { getAdminDb } from '@/lib/admin-db';

export type PublicProfile = {
    shortId: string;
    username: string;
    displayName: string;
    photoURL?: string;
    school?: string;
    workplace?: string;
    score?: number;
};

export async function searchPublicProfilesAction(query: string): Promise<{ success: boolean; data?: PublicProfile[]; message?: string }> {
    try {
        const db = getAdminDb();
        const cleanQuery = query.trim().toLowerCase();

        if (!cleanQuery) return { success: true, data: [] };

        // Fetch all public profiles (in-memory filter — works well for small-mid DBs)
        const snapshot = await db.collection('complimentOwners')
            .where('isPublic', '==', true)
            .limit(300)
            .get();

        const results: PublicProfile[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.shortId) return;

            const fields = {
                displayName: (data.displayName || '').toLowerCase(),
                username: (data.username || '').toLowerCase(),
                school: (data.school || '').toLowerCase(),
                workplace: (data.workplace || '').toLowerCase(),
            };

            // Score: exact start match > contains match > no match
            let score = 0;
            if (fields.displayName.startsWith(cleanQuery)) score += 8;
            if (fields.displayName.includes(cleanQuery)) score += 4;
            if (fields.username.startsWith(cleanQuery)) score += 6;
            if (fields.username.includes(cleanQuery)) score += 3;
            if (fields.school.includes(cleanQuery)) score += 2;
            if (fields.workplace.includes(cleanQuery)) score += 2;

            // Also check each word in display name for partial matches
            const nameParts = fields.displayName.split(/\s+/);
            for (const part of nameParts) {
                if (part.startsWith(cleanQuery)) score += 2;
            }

            if (score > 0) {
                results.push({
                    shortId: data.shortId,
                    username: data.username,
                    displayName: data.displayName,
                    photoURL: data.photoURL,
                    school: data.school,
                    workplace: data.workplace,
                    score,
                });
            }
        });

        // Sort by relevance score descending
        results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        return { success: true, data: results.slice(0, 20) };

    } catch (error) {
        console.error('Search failed', error);
        return { success: false, message: 'Хайлт хийхэд алдаа гарлаа.' };
    }
}
