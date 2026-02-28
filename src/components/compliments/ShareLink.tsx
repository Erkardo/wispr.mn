'use client';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Share2, Loader2, Link as LinkIcon } from 'lucide-react';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError, WithId } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { ComplimentOwner } from '@/types';
import { Skeleton } from '../ui/skeleton';
import { useState } from 'react';

export function ShareLink({ ownerData, ownerLoading }: { ownerData: WithId<ComplimentOwner> | null; ownerLoading: boolean; }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [isCreating, setIsCreating] = useState(false);

  const shareUrl = ownerData?.shareUrl || '';
  const shareText = `Надад нэргүйгээр wispr үлдээгээрэй 💛\n\n${shareUrl}`;

  const handleCreateLink = async () => {
    if (!user || !firestore) return;
    setIsCreating(true);

    try {
      const shortId = Math.random().toString(36).slice(2, 10);
      const appUrl = window.location.origin;
      const newShareUrl = `${appUrl}/c/${shortId}`;

      const ownerRef = doc(firestore, 'complimentOwners', user.uid);
      const shortLinkRef = doc(firestore, 'shortLinks', shortId);
      const batch = writeBatch(firestore);

      const ownerDocData: any = {
        ownerId: user.uid,
        shortId: shortId,
        shareUrl: newShareUrl,
      };

      if (!ownerData?.displayName && user.displayName) {
        ownerDocData.displayName = user.displayName;
      }
      if (!ownerData?.photoURL && user.photoURL) {
        ownerDocData.photoURL = user.photoURL;
      }
      batch.set(ownerRef, ownerDocData, { merge: true });

      const shortLinkDocData = {
        ownerId: user.uid
      };
      batch.set(shortLinkRef, shortLinkDocData);

      await batch.commit();

      toast({
        title: 'Амжилттай!',
        description: 'Таны хувийн линк үүслээ.',
      });
      setIsCreating(false);

    } catch (error: any) {
      if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: `batch write for ${user.uid}`,
          operation: 'write',
          requestResourceData: { from: 'handleCreateLink' },
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.error("Error creating share link:", error);
        toast({
          title: 'Алдаа гарлаа',
          description: 'Линк үүсгэхэд алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.',
          variant: 'destructive',
        });
        setIsCreating(false);
      }
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Линк хуулагдлаа!',
      description: 'Найзууддаа илгээж, wispr-үүдийг хүлээж аваарай.',
    });
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Надад нэг wispr үлдээгээрэй!',
          text: 'Wispr-аар дамжуулан надад нэргүйгээр wispr-үүд илгээгээрэй. Хэн болохыг тань хэн ч мэдэхгүй.',
          url: shareUrl,
        });
      } catch (error) {
        if (!(error instanceof Error && error.name === 'NotAllowedError')) {
          navigator.clipboard.writeText(shareText);
          toast({ title: "Хуулагдлаа!", description: "Түгээх боломжгүй тул текстийг хууллаа." })
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Хуулагдлаа!", description: "Текст хуулагдлаа. Найзуудтайгаа хуваалцахад бэлэн." })
    }
  };

  if (ownerLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!ownerData) {
    return (
      <Card className="border-primary/20 bg-primary/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        <CardHeader className="relative">
          <CardTitle className="font-bold text-xl">Таны хувийн линк</CardTitle>
          <CardDescription>
            Найзууддаа илгээж, тэдний wispr-үүдийг энд хүлээж авахын тулд өөрийн хувийн линкээ үүсгэнэ үү.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <Button onClick={handleCreateLink} disabled={isCreating} className="w-full relative overflow-hidden group" size="lg">
            <span className="relative z-10 flex items-center justify-center font-bold">
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Миний линкийг үүсгэх
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold text-xl">Таны хувийн линк</CardTitle>
        <CardDescription>
          Энэ линкээ найзууддаа илгээж, тэдний wispr-үүдийг энд хүлээж аваарай.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex w-full items-center gap-2 rounded-lg bg-secondary p-4 border">
            <p className="text-sm text-muted-foreground overflow-x-auto whitespace-nowrap flex-1">
              {shareUrl}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleShare} className="w-full">
              <Share2 className="mr-2 h-4 w-4" />
              Түгээх
            </Button>
            <Button onClick={handleCopyLink} variant="secondary" className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              Линк хуулах
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
