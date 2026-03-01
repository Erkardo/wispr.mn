'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Bell } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Compliment } from '@/types';

export function Header({
  title,
  className,
  showBackButton = true,
}: {
  title: string;
  className?: string;
  showBackButton?: boolean;
}) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  // Query unread wisprs
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !firestore) return;

    // Listen to changes in unread compliments
    import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
      const complimentsRef = collection(firestore, 'complimentOwners', user.uid, 'compliments');
      const unreadQuery = query(complimentsRef, where('isRead', '==', false), where('isArchived', 'in', [false, null]));

      const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
        setUnreadCount(snapshot.docs.length);
      });

      return () => unsubscribe();
    });
  }, [user, firestore]);

  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isPublicProfile = pathname.startsWith('/c/');

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container relative flex h-16 max-w-2xl items-center justify-between px-4">

        {/* Left Section: Back Button (and Icon on Child Pages) */}
        <div className="flex z-10 w-1/3 items-center gap-1.5">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-10 w-10 rounded-full hover:bg-muted/50 active:scale-95 transition-transform shrink-0"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-6 w-6 text-foreground/80" />
            </Button>
          )}
          {!isHomePage && (
            <Link href="/" passHref className="flex items-center shrink-0">
              <Logo iconOnly className="w-11 md:w-12 text-primary transition-all" />
            </Link>
          )}
        </div>

        {/* Center Section: Animated Title or Home Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 mx-auto w-1/3">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex w-full items-center justify-center pointer-events-auto"
          >
            {isHomePage ? (
              <Link href="/" passHref className="flex items-center shrink-0">
                <Logo className="w-[100px] text-primary" />
              </Link>
            ) : (
              <h1 className="text-[17px] font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent truncate text-center">
                {title}
              </h1>
            )}
          </motion.div>
        </div>

        {/* Right Section: Notification Bell (Hidden on Public Profiles) */}
        <div className="flex z-10 w-1/3 justify-end">
          {!isPublicProfile && (
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-full hover:bg-muted/50 active:scale-95 transition-transform"
              onClick={() => router.push('/activity')}
            >
              <Bell className="h-[22px] w-[22px] text-foreground/80" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 flex h-[9px] w-[9px] items-center justify-center"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-[9px] w-[9px] bg-red-500 border-2 border-background"></span>
                </motion.span>
              )}
            </Button>
          )}
        </div>

      </div>
    </header>
  );
}

