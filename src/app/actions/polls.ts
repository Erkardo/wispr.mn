'use server';

import { db } from '@/lib/db';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, setDoc, query, where, getDocs, orderBy, limit, runTransaction, type Transaction } from 'firebase/firestore';
import type { Poll, PollResponse } from '@/types';
import { revalidatePath } from 'next/cache';

export async function createPollAction(ownerId: string, question: string, options: string[] = []): Promise<{ success: boolean; message: string; pollId?: string }> {
    try {
        if (!ownerId || !question) {
            return { success: false, message: 'Мэдээлэл дутуу байна.' };
        }

        const pollsRef = collection(db, 'complimentOwners', ownerId, 'polls');

        // Deactivate previous polls? Or allow multiple?
        // Let's allow multiple but maybe only show the latest active one on profile.
        // Or we can set all others to inactive.

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
            createdAt: serverTimestamp(),
            responseCount: 0
        };

        const docRef = await addDoc(pollsRef, newPollData);

        revalidatePath('/');
        return { success: true, message: 'Санал асуулга амжилттай үүслээ.', pollId: docRef.id };

    } catch (error) {
        console.error("Error creating poll:", error);
        return { success: false, message: 'Санал асуулга үүсгэхэд алдаа гарлаа.' };
    }
}

export async function votePollAction(ownerId: string, pollId: string, answer: string | string[]): Promise<{ success: boolean; message: string }> {
    // answer is optionId for choice type, or text for text type.
    try {
        const pollRef = doc(db, 'complimentOwners', ownerId, 'polls', pollId);

        await runTransaction(db, async (transaction: Transaction) => {
            const pollSnap = await transaction.get(pollRef);

            if (!pollSnap.exists()) {
                throw new Error('Санал асуулга олдсонгүй.');
            }

            const poll = pollSnap.data() as Poll;

            if (!poll.isActive) {
                throw new Error('Энэ санал асуулга хаагдсан байна.');
            }

            const responsesRef = collection(db, 'complimentOwners', ownerId, 'polls', pollId, 'responses');
            const newResponseRef = doc(responsesRef); // Generate ID for new response

            if (poll.type === 'choice') {
                // Answer should be an optionId
                const optionId = Array.isArray(answer) ? answer[0] : answer;
                const optionIndex = poll.options?.findIndex(o => o.id === optionId);

                if (optionIndex === undefined || optionIndex === -1) {
                    throw new Error('Буруу сонголт байна.');
                }

                // Update array atomically within transaction
                const newOptions = [...(poll.options || [])];
                newOptions[optionIndex].votes += 1;

                transaction.update(pollRef, {
                    options: newOptions,
                    responseCount: increment(1)
                });

                // Add detailed response
                transaction.set(newResponseRef, {
                    pollId,
                    optionId,
                    createdAt: serverTimestamp()
                });

            } else {
                // Text response
                const textAnswer = Array.isArray(answer) ? answer[0] : answer;
                if (!textAnswer.trim()) {
                    throw new Error('Хариулт хоосон байна.');
                }

                transaction.update(pollRef, {
                    responseCount: increment(1)
                });

                transaction.set(newResponseRef, {
                    pollId,
                    answerText: textAnswer,
                    createdAt: serverTimestamp()
                });
            }
        });

        revalidatePath('/'); // or revalidate path to owner's page
        return { success: true, message: 'Санал амжилттай илгээгдлээ.' };

    } catch (error: any) {
        console.error("Error voting poll:", error);
        return { success: false, message: error.message || 'Санал өгөхөд алдаа гарлаа.' };
    }
}

export async function togglePollStatusAction(ownerId: string, pollId: string, isActive: boolean) {
    try {
        const pollRef = doc(db, 'complimentOwners', ownerId, 'polls', pollId);
        await updateDoc(pollRef, { isActive });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error toggling poll:", error);
        return { success: false, message: "Алдаа гарлаа" };
    }
}

export async function deletePollAction(ownerId: string, pollId: string) {
    try {
        const pollRef = doc(db, 'complimentOwners', ownerId, 'polls', pollId);
        // Note: Subcollections (responses) won't be deleted automatically in Firestore standard delete.
        // For this app, it's fine to leave orphans or we should delete them recursively (admin sdk only usually).
        // Since we use client sdk here, we can't easily do recursive delete without listing all.
        // We'll just delete the parent doc for now.
        await import('firebase/firestore').then(m => m.deleteDoc(pollRef));
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error deleting poll:", error);
        return { success: false, message: "Алдаа гарлаа" };
    }
}
