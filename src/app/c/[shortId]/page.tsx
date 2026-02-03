'use client';
import { ComplimentForm } from '@/components/compliments/ComplimentForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heart, Loader2, Frown } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Header } from '@/components/Header';
import { useState, useEffect } from 'react';

function ComplimentPageContent({ shortId }: { shortId: string }) {
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore || !shortId) {
      setIsLoading(false);
      return;
    }

    const fetchOwnerId = async () => {
      const shortLinkRef = doc(firestore, 'shortLinks', shortId);
      try {
        const docSnap = await getDoc(shortLinkRef);
        if (docSnap.exists()) {
          setOwnerId(docSnap.data().ownerId);
        }
      } catch (e: any) {
        console.error("Failed to fetch short link:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOwnerId();
  }, [firestore, shortId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Хэрэглэгчийг хайж байна...</p>
      </div>
    );
  }

  const isNotFound = error || !ownerId;

  if (isNotFound) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Frown className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-bold">Хэрэглэгч олдсонгүй</h2>
          <p className="mt-2 text-muted-foreground">Таны хайсан линк буруу эсвэл устгагдсан байж магадгүй.</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background dark:from-background dark:via-accent/10 dark:to-background p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-lg border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4 ring-8 ring-primary/5">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-bold text-2xl">Wispr илгээгээрэй</CardTitle>
          <CardDescription>Хэн болохыг тань хэн ч мэдэхгүй. Сэтгэлийнхээ дулаан үгсийг wispr болгон үлдээгээрэй.</CardDescription>
        </CardHeader>
        <CardContent>
          {ownerId && <ComplimentForm ownerId={ownerId} />}
        </CardContent>
      </Card>
    </div>
  );
}


export default function SubmitComplimentShortIdPage({ params }: { params: { shortId: string } }) {
  return (
    <>
      <Header title="Wispr үлдээх" showBackButton={false} />
      <main>
        <ComplimentPageContent shortId={params.shortId} />
      </main>
    </>
  );
}
