import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmailRaw = process.env.FIREBASE_CLIENT_EMAIL;
// Clean email: remove quotes and whitespace
const clientEmail = clientEmailRaw ? clientEmailRaw.replace(/^"|"$/g, '').trim() : undefined;
// Helper to clean and format the private key
const formatPrivateKey = (key: string | undefined) => {
    if (!key) return undefined;

    // 1. Remove any surrounding double quotes
    let cleanKey = key.replace(/^"|"$/g, '');

    // 2. Handle escaped newlines
    if (cleanKey.includes('\\n')) {
        cleanKey = cleanKey.replace(/\\n/g, '\n');
    }

    cleanKey = cleanKey.trim();

    // 3. Ensure headers are on their own lines (crucial for OpenSSL)
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';

    if (cleanKey.includes(header) && !cleanKey.includes(`${header}\n`)) {
        cleanKey = cleanKey.replace(header, `${header}\n`);
    }

    if (cleanKey.includes(footer) && !cleanKey.includes(`\n${footer}`)) {
        cleanKey = cleanKey.replace(footer, `\n${footer}`);
    }

    return cleanKey;
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
