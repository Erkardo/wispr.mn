'use server';

import { getAdminDb } from '@/lib/admin-db';
import * as admin from 'firebase-admin';
import * as geofire from 'geofire-common';
import { PublicProfile } from './search-action';

// 2 hours radar duration
const RADAR_DURATION_MS = 2 * 60 * 60 * 1000;
// Search radius in meters
const RADAR_RADIUS_M = 1000;

export async function activateRadarAction(userId: string, lat: number, lng: number) {
    if (!userId) return { success: false, message: 'Unauthorized' };

    try {
        const db = getAdminDb();
        const hash = geofire.geohashForLocation([lat, lng]);

        await db.collection('complimentOwners').doc(userId).update({
            lastRadarLocation: new admin.firestore.GeoPoint(lat, lng),
            geohash: hash,
            radarExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + RADAR_DURATION_MS)
        });

        return { success: true, message: 'Радар амжилттай аслаа. Хажууд байгаа хүмүүс таныг харах боломжтой.' };
    } catch (error) {
        console.error('Radar activation failed:', error);
        return { success: false, message: 'Радар асаахад алдаа гарлаа.' };
    }
}

export async function getNearbyRadarUsersAction(userId: string, lat: number, lng: number): Promise<{ success: boolean; data?: PublicProfile[]; message?: string }> {
    if (!userId) return { success: false, message: 'Unauthorized' };

    try {
        const db = getAdminDb();
        const center: [number, number] = [lat, lng];
        const bounds = geofire.geohashQueryBounds(center, RADAR_RADIUS_M);
        const promises = [];
        const now = admin.firestore.Timestamp.now();

        for (const b of bounds) {
            const q = db.collection('complimentOwners')
                .where('geohash', '>=', b[0])
                .where('geohash', '<=', b[1]);

            promises.push(q.get());
        }

        const snapshots = await Promise.all(promises);
        const matchingDocs: PublicProfile[] = [];

        for (const snap of snapshots) {
            for (const doc of snap.docs) {
                const data = doc.data();

                // Check if public
                if (data.isPublic !== true) continue;

                // Don't show yourself
                if (doc.id === userId) continue;

                // Check expiration
                if (!data.radarExpiresAt || data.radarExpiresAt.toMillis() < now.toMillis()) continue;

                // Calculate exact distance to confirm it's within radius
                const loc = data.lastRadarLocation;
                if (!loc) continue;

                const distanceInKm = geofire.distanceBetween([loc.latitude, loc.longitude], center);
                const distanceInM = distanceInKm * 1000;

                if (distanceInM <= RADAR_RADIUS_M) {
                    matchingDocs.push({
                        shortId: data.shortId,
                        username: data.username,
                        displayName: data.displayName,
                        photoURL: data.photoURL,
                        school: data.school,
                        workplace: data.workplace
                    });
                }
            }
        }

        // Return distinct users (bound queries can sometimes overlap slightly)
        const uniqueDocs = Array.from(new Map(matchingDocs.map(item => [item.shortId, item])).values());

        return { success: true, data: uniqueDocs };

    } catch (error) {
        console.error('Nearby search failed:', error);
        return { success: false, message: 'Ойролцоо байгаа хүмүүсийг хайхад алдаа гарлаа.' };
    }
}
