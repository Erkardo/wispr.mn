'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(getApp());
  }

  let firebaseApp;

  // Firebase App Hosting automatically provides configuration if we call initializeApp() without arguments.
  // However, in other environments (local dev, Vercel, etc.), this will throw an error.
  // We check for evidence of Firebase Hosting environment (like FIREBASE_CONFIG) or if we are on the server.
  const isAppHosting = typeof process !== 'undefined' && (!!process.env.FIREBASE_CONFIG || !!process.env.X_FIREBASE_APP_HOSTING);

  if (isAppHosting) {
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      // If auto-init fails even on App Hosting, fall back to the config object
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    // Regular environment (Vercel, Local, etc.) - use the explicit config
    firebaseApp = initializeApp(firebaseConfig);
  }

  return getSdks(firebaseApp);
}


export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export { useUser } from './auth/use-user';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
