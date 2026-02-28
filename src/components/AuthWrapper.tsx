'use client';

import { useUser, useAuth, useFirestore } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { PageTransition } from '@/components/PageTransition';
import { NotificationManager } from '@/components/NotificationManager';

export function AuthWrapper({ children }: { children: React.ReactNode }) {

  const { user, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = pathname === '/login' || pathname.startsWith('/c/');

  useEffect(() => {
    if (loading || !auth) return;

    // Use a small timeout to let's Google Auth "settle" and detect existing sessions
    // before forcing an anonymous one. This reduces redundant guest accounts.
    const timer = setTimeout(() => {
      if (!user && !isPublicPage) {
        signInAnonymously(auth).catch(error => {
          console.error("Anonymous sign-in failed:", error);
        });
      }
    }, 500);

    if (user && !user.isAnonymous && pathname === '/login') {
      router.replace('/');
    }

    return () => clearTimeout(timer);
  }, [user, loading, auth, router, pathname]);

  useEffect(() => {
    const checkAndUpdateUrl = async () => {
      if (!user || user.isAnonymous || !firestore) {
        return;
      }

      const ownerRef = doc(firestore, 'complimentOwners', user.uid);

      try {
        const docSnap = await getDoc(ownerRef);

        // Only proceed if the document already exists
        if (docSnap.exists()) {
          const appUrl = window.location.origin;
          const data = docSnap.data();

          // Check if the shareUrl needs to be updated because the domain has changed
          const needsUpdate = !data.shareUrl || !data.shareUrl.startsWith(appUrl);
          const updates: any = {};

          if (needsUpdate && data.shortId) {
            updates.shareUrl = `${appUrl}/c/${data.shortId}`;
          }

          if (!data.photoURL && user.photoURL) {
            updates.photoURL = user.photoURL;
          }

          if (!data.displayName && user.displayName) {
            updates.displayName = user.displayName;
          }

          if (Object.keys(updates).length > 0) {
            await updateDoc(ownerRef, updates);
          }
        }
      } catch (error) {
        // This might happen due to permissions, but we don't want to crash the app
        console.error("Error checking and updating share URL:", error);
      }
    };

    if (!loading && user) {
      checkAndUpdateUrl();
    }
  }, [user, loading, firestore]);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not public page and no user, wait (or show cleaner redirect/loader)
  if (!user && !isPublicPage) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isPublicPage) {
    return (
      <>
        <NotificationManager />
        <PageTransition>{children}</PageTransition>
      </>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[430px] flex-col bg-background shadow-lg animate-fade-in">
      <main className="flex-1 pb-20">
        <NotificationManager />
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}

