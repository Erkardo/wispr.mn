'use server';

import { getAdminDb } from '@/lib/admin-db';
import { revalidatePath } from 'next/cache';

export async function updateProfileSettingsAction(userId: string, data: {
    username: string;
    displayName: string;
    bio: string;
    school: string;
    workplace: string;
    isPublic: boolean;
}) {
    if (!userId) return { success: false, message: 'Unauthorized' };

    try {
        const db = getAdminDb();

        // Ensure username format
        const cleanUsername = data.username.trim().toLowerCase();

        // 1. Check if username is already taken by someone else
        if (cleanUsername) {
            const usernameQ = await db.collection('complimentOwners')
                .where('username', '==', cleanUsername)
                .get();

            let isTaken = false;
            usernameQ.forEach(doc => {
                if (doc.id !== userId) {
                    isTaken = true;
                }
            });

            if (isTaken) {
                return { success: false, message: 'Энэ Username-ийг өөр хүн авсан байна. Өөр нэр сонгоно уу.' };
            }
        }

        // 2. Update user document
        const ownerRef = db.collection('complimentOwners').doc(userId);
        const ownerSnap = await ownerRef.get();
        const ownerData = ownerSnap.data();

        const updateData: any = {
            username: cleanUsername,
            displayName: data.displayName.trim(),
            bio: data.bio.trim(),
            school: data.school.trim(),
            workplace: data.workplace.trim(),
            isPublic: data.isPublic,
        };

        // 3. Ensure shortId exists if isPublic is true (or always, for safety)
        if (!ownerData?.shortId) {
            const shortId = Math.random().toString(36).slice(2, 10);
            updateData.shortId = shortId;

            // Create entry in shortLinks
            await db.collection('shortLinks').doc(shortId).set({
                ownerId: userId
            });
        }

        // 4. Update shareUrl based on whether username exists
        if (cleanUsername) {
            updateData.shareUrl = `https://wispr.mn/@${cleanUsername}`;
        } else if (!ownerData?.shareUrl) {
            updateData.shareUrl = `https://wispr.mn/c/${updateData.shortId || ownerData?.shortId}`;
        }

        await ownerRef.update(updateData);

        revalidatePath('/profile');
        return { success: true, message: 'Мэдээлэл амжилттай шинэчлэгдлээ.' };
    } catch (error) {
        console.error('Error updating profile settings:', error);
        return { success: false, message: 'Алдаа гарлаа. Дахин оролдоно уу.' };
    }
}
