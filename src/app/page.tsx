'use client';

import { useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Gem, Inbox, Send, Heart, Archive } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/PullToRefresh';

function AnonymousLoginPrompt() {
  return (
    <Card className="text-center border-none shadow-sm bg-primary/5 mt-8 rounded-3xl overflow-hidden">
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

function LoadingSkeletons() {
  return (
    <div className="space-y-6">
      <div className="w-full min-h-[350px] bg-muted/40 animate-pulse rounded-[3rem] border border-white/5 shadow-inner" />
      <div className="w-full min-h-[350px] bg-muted/30 animate-pulse rounded-[3rem] border border-white/5" />
      <div className="w-full min-h-[350px] bg-muted/20 animate-pulse rounded-[3rem] border border-white/5" />
    </div>
  );
}

export default function HomePage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const complimentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'complimentOwners', user.uid, 'compliments'));
  }, [user, firestore]);

  const ownerRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'complimentOwners', user.uid);
  }, [user, firestore]);

  const { data: compliments, isLoading: complimentsLoading } = useCollection<Compliment>(complimentsQuery);
  const { data: ownerData, isLoading: ownerLoading } = useDoc<ComplimentOwner>(ownerRef);

  const sortedCompliments = useMemo(() => {
    if (!compliments) return [];
    return [...compliments].sort((a, b) => {
      const aRead = a.isRead ?? false;
      const bRead = b.isRead ?? false;
      if (aRead !== bRead) return aRead ? 1 : -1;
      const aTime = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate().getTime() : 0;
      const bTime = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate().getTime() : 0;
      return bTime - aTime;
    });
  }, [compliments]);

  // Derived filtered lists
  const receivedCompliments = useMemo(() =>
    sortedCompliments.filter(c => !c.isArchived), [sortedCompliments]);

  const likedCompliments = useMemo(() =>
    sortedCompliments.filter(c => !c.isArchived && (c.reactions?.['❤️'] ?? 0) > 0), [sortedCompliments]);

  const archivedCompliments = useMemo(() =>
    sortedCompliments.filter(c => c.isArchived === true), [sortedCompliments]);

  const activeTab = searchParams.get('tab') || 'received';

  useEffect(() => {
    const complimentId = searchParams.get('complimentId');
    if (complimentId && !complimentsLoading && (sortedCompliments.length > 0 || activeTab === 'sent')) {
      // Need a tiny delay to ensure the tab content has rendered the element
      setTimeout(() => {
        const element = document.getElementById(`compliment-card-${complimentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-card');
          setTimeout(() => element.classList.remove('highlight-card'), 2000);
        }
      }, 200);
    }
  }, [searchParams, complimentsLoading, sortedCompliments, activeTab]);

  const isLoading = userLoading || ownerLoading;

  return (
    <>
      <Header title="Wispr-үүд" />
      <Suspense fallback={<div className="container mx-auto max-w-2xl p-4 pt-6"><LoadingSkeletons /></div>}>
        <Tabs defaultValue={activeTab} className="w-full pt-4">
          <div className="flex justify-center px-4 mb-4">
            <div className="w-full overflow-x-auto no-scrollbar pb-2 -mb-2">
              <TabsList className="h-auto flex flex-nowrap justify-start sm:justify-center min-w-max mx-auto gap-1">
                <TabsTrigger value="received">
                  <Inbox className="w-4 h-4" />Ирсэн
                </TabsTrigger>
                <TabsTrigger value="sent">
                  <Send className="w-4 h-4" />Илгээсэн
                </TabsTrigger>
                <TabsTrigger value="liked">
                  <Heart className="w-4 h-4" />Таалагдсан
                </TabsTrigger>
                <TabsTrigger value="archived">
                  <Archive className="w-4 h-4" />Архив
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* ── ИРСЭН ── */}
          <TabsContent value="received" className="animate-in fade-in duration-300 m-0">
            <div className="container mx-auto max-w-2xl p-4 py-6">
              {isLoading ? <LoadingSkeletons /> : user?.isAnonymous ? <AnonymousLoginPrompt /> : (
                <PullToRefresh onRefresh={async () => window.location.reload()}>
                  <ComplimentList
                    compliments={receivedCompliments}
                    isLoading={complimentsLoading}
                    ownerData={ownerData}
                    ownerLoading={ownerLoading}
                  />
                </PullToRefresh>
              )}
            </div>
          </TabsContent>

          {/* ── ИЛГЭЭСЭН ── */}
          <TabsContent value="sent" className="animate-in fade-in duration-300 m-0">
            <div className="container mx-auto max-w-2xl p-4 py-2">
              <SentList />
            </div>
          </TabsContent>

          {/* ── ТААЛАГДСАН ── */}
          <TabsContent value="liked" className="animate-in fade-in duration-300 m-0">
            <div className="container mx-auto max-w-2xl p-4 py-6">
              {isLoading ? <LoadingSkeletons /> : user?.isAnonymous ? <AnonymousLoginPrompt /> : (
                likedCompliments.length === 0 ? (
                  <div className="text-center py-20 space-y-3">
                    <div className="text-5xl">❤️</div>
                    <h3 className="font-black text-xl">Таалагдсан wispr байхгүй</h3>
                    <p className="text-muted-foreground text-sm">Wispr-үүдээ ❤️ дарж таалагдсан руу нэмж болно</p>
                  </div>
                ) : (
                  <ComplimentList
                    compliments={likedCompliments}
                    isLoading={complimentsLoading}
                    ownerData={ownerData}
                    ownerLoading={ownerLoading}
                  />
                )
              )}
            </div>
          </TabsContent>

          {/* ── АРХИВ ── */}
          <TabsContent value="archived" className="animate-in fade-in duration-300 m-0">
            <div className="container mx-auto max-w-2xl p-4 py-6">
              {isLoading ? <LoadingSkeletons /> : user?.isAnonymous ? <AnonymousLoginPrompt /> : (
                archivedCompliments.length === 0 ? (
                  <div className="text-center py-20 space-y-3">
                    <div className="text-5xl">📁</div>
                    <h3 className="font-black text-xl">Архив хоосон байна</h3>
                    <p className="text-muted-foreground text-sm">Wispr-ийг ⋯ цэснээс архивлах боломжтой</p>
                  </div>
                ) : (
                  <ComplimentList
                    compliments={archivedCompliments}
                    isLoading={complimentsLoading}
                    ownerData={ownerData}
                    ownerLoading={ownerLoading}
                    isArchiveView
                  />
                )
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Suspense>

      <footer className="w-full py-8 px-4 mt-8 border-t bg-muted/30">
        <div className="container mx-auto max-w-2xl flex flex-col items-center gap-4">
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary transition-colors">Нууцлалын бодлого</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Үйлчилгээний нөхцөл</Link>
            <Link href="/feedback" className="hover:text-primary transition-colors">Санал хүсэлт</Link>
          </div>
          <p className="text-xs text-muted-foreground opacity-50">© {new Date().getFullYear()} Wispr.mn</p>
        </div>
      </footer>
    </>
  );
}
