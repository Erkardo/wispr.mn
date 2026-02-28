import { Header } from '@/components/Header';
import { ConfessionsFeed } from '@/components/confessions/ConfessionsFeed';
import { getConfessions } from '@/lib/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ConfessionsPage() {
  return (
    <>
      <Header title="Сэтгэлийн үгс" />
      <Tabs defaultValue="confessions" className="w-full pt-4">
        <div className="flex justify-center px-4">
          <div className="w-full overflow-x-auto no-scrollbar pb-1">
            <TabsList className="h-auto flex flex-nowrap justify-start sm:justify-center min-w-max mx-auto gap-1">
              <TabsTrigger value="compliments" asChild>
                <Link href="/">Wispr-үүд</Link>
              </TabsTrigger>
              <TabsTrigger value="confessions">Сэтгэлийн үгс</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <TabsContent value="confessions">
          <div className="container mx-auto max-w-2xl p-4 py-8">
            <div className="text-center py-20 px-4 border-2 border-dashed rounded-2xl mt-8 bg-card/50">
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Тун удахгүй...</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Энэ хэсэг одоогоор хөгжүүлэлтийн шатанд байна.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
