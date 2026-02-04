import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Helper to clean and format the private key
const formatPrivateKey = (key: string | undefined) => {
    if (!key) return undefined;

    // 1. Remove any surrounding double quotes if they exist (sometimes introduced by copy-pasting)
    let cleanKey = key.replace(/^"|"$/g, '');

    // 2. Handle escaped newlines (common in Vercel/env vars)
    if (cleanKey.includes('\\n')) {
        cleanKey = cleanKey.replace(/\\n/g, '\n');
    }

    // 3. Ensure correct headers are present (re-add if stripped or malformed, though usually they are there)
    // This is a basic check. If the key is totally messed up, it will still fail, but this handles common env var issues.

    return cleanKey.trim();
};

const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (!projectId || !clientEmail || !privateKey) {
    if (process.env.NODE_ENV === 'production') {
        console.warn("[Admin SDK] Missing credentials. Webhooks will fail.");
    }
} else {
    // Basic validation log (masked)
    try {
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            console.error("[Admin SDK] Invalid Private Key format: Missing header");
        }
    } catch (e) {
        console.error("[Admin SDK] Error validating key format", e);
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
