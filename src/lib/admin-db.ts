import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    // We throw here or handle nicely depending on if we are in build time or runtime
    if (process.env.NODE_ENV === 'production') {
        console.warn("Missing Firebase Admin credentials. Webhook operations requiring Admin privileges will fail.");
    }
}

const firebaseAdminConfig = {
    credential: cert({
        projectId,
        clientEmail,
        privateKey,
    }),
};

export function getAdminDb() {
    if (!getApps().length) {
        initializeApp(firebaseAdminConfig);
    } else {
        // Double check if the existing app has the same config or just return it
        // Usually getApp() is enough if already initialized
        getApp();
    }
    return getFirestore();
}
