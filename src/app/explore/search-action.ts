'use server';

import { getAdminDb } from '@/lib/admin-db';

export type PublicProfile = {
    shortId: string;
    username: string;
    displayName: string;
    photoURL?: string;
    school?: string;
    workplace?: string;
};

export async function searchPublicProfilesAction(query: string, type: 'username' | 'name' | 'school' | 'workplace'): Promise<{ success: boolean; data?: PublicProfile[]; message?: string }> {
    try {
        const db = getAdminDb();
        const cleanQuery = query.trim().toLowerCase();

        if (!cleanQuery) return { success: true, data: [] };

        // Firebase doesn't have a native full-text search or "LIKE %text%" operator.
        // For basic "starts with" queries, we can use inequality operators.
        // For a true search in production, Algolia or Typesense is needed.
        // But for our Phase 2, we will use a naive prefix search + filter.

        // We only search for users who have opted in `isPublic: true`
        let profilesRef = db.collection('complimentOwners').where('isPublic', '==', true);

        // Fetch max 100 rows, then filter in memory for fuzzy match (simple workaround for small-mid DB)
        // If the DB scales, we MUST switch to a dedicated index or Algolia.
        const snapshot = await profilesRef.limit(200).get();

        const results: PublicProfile[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();

            // Safety check
            if (!data.username && !data.displayName) return;

            let isMatch = false;

            if (type === 'username' && data.username) {
                isMatch = data.username.toLowerCase().includes(cleanQuery);
            } else if (type === 'name' && data.displayName) {
                isMatch = data.displayName.toLowerCase().includes(cleanQuery);
            } else if (type === 'school' && data.school) {
                isMatch = data.school.toLowerCase().includes(cleanQuery);
            } else if (type === 'workplace' && data.workplace) {
                isMatch = data.workplace.toLowerCase().includes(cleanQuery);
            }

            if (isMatch) {
                results.push({
                    shortId: data.shortId, // IMPORTANT: We redirect people to `/c/shortId` to keep anonymity alive!
                    username: data.username,
                    displayName: data.displayName,
                    photoURL: data.photoURL,
                    school: data.school,
                    workplace: data.workplace,
                });
            }
        });

        // Sort results by name simply
        results.sort((a, b) => (a.displayName || a.username || '').localeCompare(b.displayName || b.username || ''));

        // Return top 20 matches max
        return { success: true, data: results.slice(0, 20) };

    } catch (error) {
        console.error("Search failed", error);
        return { success: false, message: 'Хайлт хийхэд алдаа гарлаа.' };
    }
}
