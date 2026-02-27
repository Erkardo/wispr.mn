'use server';

import { getAdminDb } from '@/lib/admin-db';
import { revalidatePath } from 'next/cache';

export async function updateProfileSettingsAction(userId: string, data: {
    username: string;
    displayName: string;
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

        await ownerRef.update({
            username: cleanUsername,
            displayName: data.displayName.trim(),
            school: data.school.trim(),
            workplace: data.workplace.trim(),
            isPublic: data.isPublic,
        });

        revalidatePath('/profile');
        return { success: true, message: 'Мэдээлэл амжилттай шинэчлэгдлээ.' };
    } catch (error) {
        console.error('Error updating profile settings:', error);
        return { success: false, message: 'Алдаа гарлаа. Дахин оролдоно уу.' };
    }
}
