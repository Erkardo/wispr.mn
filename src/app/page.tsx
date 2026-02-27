'use client';

import { useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ComplimentList } from '@/components/compliments/ComplimentList';
import { SentList } from '@/components/compliments/SentList';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Compliment, ComplimentOwner } from '@/types';
import { Header } from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Gem } from 'lucide-react';
import { PollManager } from '@/components/polls/PollManager';

function AnonymousLoginPrompt() {
  return (
    <Card className="text-center border-primary/20 bg-primary/5 mt-8">
      <CardHeader>
        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4 ring-8 ring-primary/5">
          <Gem className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Ирсэн Wispr-үүдээ хараарай</CardTitle>
        <CardDescription>
          Танд ирсэн wispr-үүдийг харахын тулд бүртгэлээрээ нэвтэрнэ үү. Түр хэрэглэгчийн wispr-үүд хадгалагдахгүй тул таны ирээдүйн wispr-үүд алдагдаж болзошгүйг анхаарна уу.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full font-bold" size="lg">
          <Link href="/login">Google-ээр үргэлжлүүлэх</Link>
        </Button>
      </CardContent>
    </Card>
  );
}


export default function HomePage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const complimentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'complimentOwners', user.uid, 'compliments')
    );
  }, [user, firestore]);

  const ownerRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'complimentOwners', user.uid);
  }, [user, firestore]);

  const { data: compliments, isLoading: complimentsLoading } = useCollection<Compliment>(complimentsQuery);
  const { data: ownerData, isLoading: ownerLoading } = useDoc<ComplimentOwner>(ownerRef);

  const sortedCompliments = useMemo(() => {
    if (!compliments) return [];
    // sort by isRead first (unread on top), then by date
    return [...compliments].sort((a, b) => {
      const aRead = a.isRead ?? false;
      const bRead = b.isRead ?? false;
      if (aRead !== bRead) {
        return aRead ? 1 : -1;
      }
      // Defensive checks for createdAt and safer timestamp conversion
      const aTime = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate().getTime() : 0;
      const bTime = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate().getTime() : 0;
      return bTime - aTime; // Sorts descending by time
    });
  }, [compliments]);

  useEffect(() => {
    const complimentId = searchParams.get('complimentId');
    if (complimentId && !complimentsLoading && sortedCompliments.length > 0) {
      const element = document.getElementById(`compliment-card-${complimentId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-card');
        setTimeout(() => {
          element.classList.remove('highlight-card');
        }, 2000);
      }
    }
  }, [searchParams, complimentsLoading, sortedCompliments]);

  const handleTabChange = (value: string) => {
    // Tab changes handled by state automatically
  };

  const pageContent = useMemo(() => {
    const isLoading = userLoading || ownerLoading;
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      );
    }

    if (user?.isAnonymous) {
      return <AnonymousLoginPrompt />;
    }

    return (
      <ComplimentList
        compliments={sortedCompliments}
        isLoading={complimentsLoading}
        ownerData={ownerData}
        ownerLoading={ownerLoading}
      />
    );
  }, [user, userLoading, ownerData, ownerLoading, sortedCompliments, complimentsLoading]);

  return (
    <>
      <Header title="Wispr-үүд" />
      <Tabs defaultValue="compliments" onValueChange={handleTabChange} className="w-full pt-4">
        <div className="flex justify-center px-4">
          <TabsList>
            <TabsTrigger value="compliments">Wispr-үүд</TabsTrigger>
            <TabsTrigger value="sent">Миний бичсэн</TabsTrigger>
            <TabsTrigger value="polls">Санал асуулга</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="compliments">
          <div className="container mx-auto max-w-2xl p-4 py-8">
            {pageContent}
          </div>
        </TabsContent>
        <TabsContent value="sent">
          <div className="container mx-auto max-w-2xl p-4 py-2">
            <SentList />
          </div>
        </TabsContent>
        <TabsContent value="polls">
          <div className="container mx-auto max-w-2xl p-4 py-8">
            <PollManager />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
