'use server';

import { getAdminDb } from '@/lib/admin-db';
import { FieldValue } from 'firebase-admin/firestore';
import type { Poll } from '@/types';
import { revalidatePath } from 'next/cache';

export async function createPollAction(ownerId: string, question: string, options: string[] = []): Promise<{ success: boolean; message: string; pollId?: string }> {
    try {
        if (!ownerId || !question) {
            return { success: false, message: 'Мэдээлэл дутуу байна.' };
        }

        const db = getAdminDb();
        const pollsRef = db.collection('complimentOwners').doc(ownerId).collection('polls');

        const newPollData = {
            ownerId,
            question,
            type: options.length > 0 ? 'choice' : 'text',
            options: options.map((text, index) => ({
                id: `opt-${index}-${Date.now()}`,
                text,
                votes: 0
            })),
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            responseCount: 0
        };

        const docRef = await pollsRef.add(newPollData);

        revalidatePath('/');
        return { success: true, message: 'Санал асуулга амжилттай үүслээ.', pollId: docRef.id };

    } catch (error) {
        console.error("Error creating poll:", error);
        return { success: false, message: 'Санал асуулга үүсгэхэд алдаа гарлаа.' };
    }
}

export async function votePollAction(ownerId: string, pollId: string, answer: string | string[]): Promise<{ success: boolean; message: string }> {
    try {
        const db = getAdminDb();
        const pollRef = db.collection('complimentOwners').doc(ownerId).collection('polls').doc(pollId);

        await db.runTransaction(async (transaction) => {
            const pollSnap = await transaction.get(pollRef);

            if (!pollSnap.exists) {
                throw new Error('Санал асуулга олдсонгүй.');
            }

            const poll = pollSnap.data() as Poll;

            if (!poll.isActive) {
                throw new Error('Энэ санал асуулга хаагдсан байна.');
            }

            const responsesRef = db.collection('complimentOwners').doc(ownerId).collection('polls').doc(pollId).collection('responses');
            const newResponseRef = responsesRef.doc(); // Generate ID

            if (poll.type === 'choice') {
                const optionId = Array.isArray(answer) ? answer[0] : answer;
                const optionIndex = poll.options?.findIndex(o => o.id === optionId);

                if (optionIndex === undefined || optionIndex === -1) {
                    throw new Error('Буруу сонголт байна.');
                }

                const newOptions = [...(poll.options || [])];
                newOptions[optionIndex].votes += 1;

                transaction.update(pollRef, {
                    options: newOptions,
                    responseCount: FieldValue.increment(1)
                });

                transaction.set(newResponseRef, {
                    pollId,
                    optionId,
                    createdAt: FieldValue.serverTimestamp()
                });

            } else {
                const textAnswer = Array.isArray(answer) ? answer[0] : answer;
                if (!textAnswer.trim()) {
                    throw new Error('Хариулт хоосон байна.');
                }

                transaction.update(pollRef, {
                    responseCount: FieldValue.increment(1)
                });

                transaction.set(newResponseRef, {
                    pollId,
                    answerText: textAnswer,
                    createdAt: FieldValue.serverTimestamp()
                });
            }
        });

        revalidatePath('/');
        return { success: true, message: 'Санал амжилттай илгээгдлээ.' };

    } catch (error: any) {
        console.error("Error voting poll:", error);
        return { success: false, message: error.message || 'Санал өгөхөд алдаа гарлаа.' };
    }
}

export async function togglePollStatusAction(ownerId: string, pollId: string, isActive: boolean) {
    try {
        const db = getAdminDb();
        const pollRef = db.collection('complimentOwners').doc(ownerId).collection('polls').doc(pollId);
        await pollRef.update({ isActive });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error toggling poll:", error);
        return { success: false, message: "Алдаа гарлаа" };
    }
}

export async function deletePollAction(ownerId: string, pollId: string) {
    try {
        const db = getAdminDb();
        const pollRef = db.collection('complimentOwners').doc(ownerId).collection('polls').doc(pollId);
        await pollRef.delete();
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error deleting poll:", error);
        return { success: false, message: "Алдаа гарлаа" };
    }
}
