'use client';

import type { Compliment, ComplimentOwner } from '@/types';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Gift, Loader2, Share2, UserX, KeyRound, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import * as htmlToImage from 'html-to-image';
import { doc, updateDoc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { useFirestore, type WithId, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { generateHintAction, addReactionToComplimentAction } from '@/app/compliments/actions';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/Logo';
import { createQpayInvoiceAction } from '@/app/payments/actions';
import { QPayDialog } from '../payments/QpayDialog';


const reactionEmojis = ['💛', '😄', '✨'];

const ComplimentShareImage = forwardRef<HTMLDivElement, { compliment: WithId<Compliment>; style: { bg: string; emoji: string; } | null }>(({ compliment, style }, ref) => {
  if (!style) return null;

  const getShareImageFontSize = (text: string) => {
    const length = text.length;
    if (length < 50) return '2.5rem';
    if (length < 100) return '2rem';
    if (length < 150) return '1.75rem';
    if (length < 200) return '1.5rem';
    return '1.25rem';
  };

  const systemFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

  return (
    <div
      ref={ref}
      className="fixed top-[-9999px] left-[-9999px] p-8 flex flex-col justify-between items-center"
      style={{
        fontFamily: systemFontStack,
        backgroundImage: style.bg,
        width: 400,
        height: 711, // 9:16 aspect ratio
      }}
    >
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-0 left-0 w-60 h-60 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2"></div>

      <div />

      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14rem] opacity-20 select-none -rotate-12">{style.emoji}</div>
        <p
          className="leading-tight my-auto z-10 text-white"
          style={{
            fontFamily: systemFontStack,
            fontWeight: 900,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontSize: getShareImageFontSize(compliment.text),
          }}
        >
          {compliment.text}
        </p>
        <div
          className="mt-8 text-base text-white/70 z-10 select-none"
          style={{
            fontFamily: systemFontStack,
            fontWeight: 500,
          }}
        >
          Нэрээ нууцалсан
        </div>
      </div>

      <Logo className="w-24 text-white/80 relative z-10" />
    </div>
  );
});
ComplimentShareImage.displayName = 'ComplimentShareImage';


function ComplimentCard({
  compliment,
  ownerData,
  ownerLoading,
  index
}: {
  compliment: WithId<Compliment>,
  ownerData: WithId<ComplimentOwner> | null,
  ownerLoading: boolean,
  index: number
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const shareImageRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(compliment.isRead ?? false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPreparingShareImage, setIsPreparingShareImage] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<{ bg: string; emoji: string } | null>(null);

  const [isHintDialogOpen, setIsHintDialogOpen] = useState(false);
  const [isHintRevealing, setIsHintRevealing] = useState(false);
  const [revealedHints, setRevealedHints] = useState<string[]>(compliment.hints || []);

  const [totalHints, setTotalHints] = useState(5);
  const [dailyHintsAvailable, setDailyHintsAvailable] = useState(5);

  const [localReactions, setLocalReactions] = useState(compliment.reactions || {});
  const [isReacting, setIsReacting] = useState<string | null>(null);

  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [qpayData, setQpayData] = useState<{ qrImage: string, deeplinks: any[], invoiceId: string } | null>(null);


  const getFontSizeClass = (text: string) => {
    const length = text.length;
    if (length < 50) return 'text-3xl sm:text-4xl';
    if (length < 100) return 'text-2xl sm:text-3xl';
    if (length < 150) return 'text-xl sm:text-2xl';
    return 'text-lg sm:text-xl';
  };

  useEffect(() => {
    if (ownerLoading) {
      setDailyHintsAvailable(5);
      setTotalHints(5 + (ownerData?.bonusHints || 0));
      return;
    }
    if (ownerData) {
      let dailyUsed = 0;
      const resetDate = (ownerData.lastHintResetAt && typeof ownerData.lastHintResetAt.toDate === 'function')
        ? ownerData.lastHintResetAt.toDate()
        : null;
      if (resetDate && isToday(resetDate)) {
        dailyUsed = ownerData.hintsUsedToday || 0;
      }


      const daily = 5 - dailyUsed;
      const bonus = ownerData.bonusHints || 0;

      setDailyHintsAvailable(daily);
      setTotalHints(daily + bonus);
    } else {
      setDailyHintsAvailable(5);
      setTotalHints(5);
    }
  }, [ownerData, ownerLoading]);


  useEffect(() => {
    const styles = [
      { bg: 'linear-gradient(to bottom right, #f9a8d4, #f472b6)', emoji: '💖' },
      { bg: 'linear-gradient(to bottom right, #a78bfa, #8b5cf6)', emoji: '💜' },
      { bg: 'linear-gradient(to bottom right, #fde047, #facc15)', emoji: '🌟' },
      { bg: 'linear-gradient(to bottom right, #6ee7b7, #34d399)', emoji: '🌿' },
      { bg: 'linear-gradient(to bottom right, #fdba74, #fb923c)', emoji: '🔥' },
      { bg: 'linear-gradient(to bottom right, #7dd3fc, #38bdf8)', emoji: '💧' },
      { bg: 'linear-gradient(to bottom right, #fca5a5, #f87171)', emoji: '❤️' },
    ];
    const hash = (compliment.id || '').split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    setSelectedStyle(styles[Math.abs(hash) % styles.length]);
  }, [compliment.id]);

  const handleReveal = () => {
    if (isRevealing) return;
    setIsRevealing(true);

    setTimeout(() => {
      setIsRevealed(true);
      setIsRevealing(false);
      if (!firestore || !compliment.id) {
        console.warn("handleReveal: Firestore not available or compliment ID missing");
        return;
      }
      if (!compliment.isRead) {
        const complimentRef = doc(firestore, 'complimentOwners', compliment.ownerId, 'compliments', compliment.id);
        const updateData = { isRead: true };
        updateDoc(complimentRef, updateData).catch(error => {
          if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: complimentRef.path,
              operation: 'update',
              requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
          } else {
            console.error("Error marking compliment as read:", error);
          }
        });
      }
    }, 1200);
  };

  const handleRevealHint = async () => {
    if (isHintRevealing || !firestore || ownerLoading) return;

    if (totalHints <= 0) {
      toast({
        title: 'Hint-ийн эрх дууссан байна.',
        description: 'Найзуудаа урьж нэмэлт эрх аваарай.',
      });
      return;
    }

    setIsHintRevealing(true);

    try {
      const result = await generateHintAction(compliment.text, compliment.hintContext, revealedHints);

      if (result.success && result.hint) {
        const newHints = [...revealedHints, result.hint];
        const complimentRef = doc(firestore, 'complimentOwners', compliment.ownerId, 'compliments', compliment.id);
        const ownerRef = doc(firestore, 'complimentOwners', compliment.ownerId);
        const batch = writeBatch(firestore);

        const complimentUpdate = { hints: newHints };
        batch.update(complimentRef, complimentUpdate);

        if (dailyHintsAvailable > 0) {
          const resetDate = ownerData?.lastHintResetAt?.toDate();
          if (ownerData && resetDate && isToday(resetDate)) {
            batch.update(ownerRef, { hintsUsedToday: increment(1) });
          } else {
            batch.set(ownerRef, {
              hintsUsedToday: 1,
              lastHintResetAt: serverTimestamp(),
            }, { merge: true });
          }
        } else {
          batch.update(ownerRef, { bonusHints: increment(-1) });
        }

        await batch.commit();
        setRevealedHints(newHints);
        setIsHintRevealing(false);
      } else {
        toast({ title: 'Алдаа', description: result.message || 'Hint үүсгэж чадсангүй.', variant: 'destructive' });
        setIsHintRevealing(false);
      }
    } catch (error: any) {
      if (error.name === 'FirebaseError' && error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: `batch write in handleRevealHint for user ${compliment.ownerId}`,
          operation: 'write',
          requestResourceData: { hintContext: compliment.hintContext },
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.error('Hint үүсгэхэд алдаа гарлаа:', error);
        const errorMessage = error instanceof Error ? error.message : 'Тодорхойгүй алдаа.';
        toast({ title: 'Алдаа', description: `Дотоод алдаа: ${errorMessage}`, variant: 'destructive' });
        setIsHintRevealing(false);
      }
    }
  };


  const handleSingleHintPurchase = async () => {
    if (!user || isCreatingInvoice) return;

    setIsCreatingInvoice(true);
    const singleHintPackage = { name: "1 удаагийн Hint", numHints: 1, amount: 1900 };

    try {
      const result = await createQpayInvoiceAction(singleHintPackage, user.uid);
      if (result.error) {
        toast({
          title: "Алдаа гарлаа",
          description: result.error,
          variant: "destructive",
        });
      } else {
        setQpayData({
          qrImage: result.qrImage,
          deeplinks: result.deeplinks,
          invoiceId: result.invoiceId
        });
        setIsHintDialogOpen(false); // Close the current dialog
      }

    } catch (error) {
      console.error("Single hint purchase failed:", error);
      toast({
        title: "Алдаа гарлаа",
        description: "Нэхэмжлэл үүсгэхэд алдаа гарлаа.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleReaction = async (reaction: string) => {
    if (isReacting) return;
    setIsReacting(reaction);

    setLocalReactions(prev => ({ ...prev, [reaction]: (prev[reaction] || 0) + 1 }));

    try {
      await addReactionToComplimentAction(compliment.id, compliment.ownerId, reaction);
    } catch (error) {
      setLocalReactions(prev => ({ ...prev, [reaction]: (prev[reaction] || 1) - 1 }));
      toast({ title: 'Алдаа', description: 'Түр хүлээгээд дахин оролдоно уу', variant: 'destructive' });
    } finally {
      setTimeout(() => setIsReacting(null), 500);
    }
  };

  const generateAndShareImage = useCallback(async () => {
    if (!shareImageRef.current) {
      toast({
        title: "Алдаа гарлаа",
        description: "Зургийг одоогоор үүсгэх боломжгүй байна.",
        variant: "destructive"
      });
      setIsSharing(false);
      setIsPreparingShareImage(false);
      return;
    }

    try {
      // 1. Generate Blob
      const blob = await htmlToImage.toBlob(shareImageRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#000000', // Ensure background is solid
      });

      if (!blob) throw new Error("Зураг үүсгэхэд алдаа гарлаа.");

      const file = new File([blob], "wispr-received.png", { type: "image/png" });
      const shareText = `Надад ирсэн wispr! 🔥 Та ч бас өөрийн линкээ үүсгээрэй.`;

      // 2. Share
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Wispr Received',
            text: shareText,
          });
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') throw shareError;
          throw new Error("Sharing failed");
        }
      } else {
        // Fallback: Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'wispr-received.png';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Зураг татагдлаа!',
          description: 'Story дээрээ хуваалцаарай.',
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setIsSharing(false);
        setIsPreparingShareImage(false);
        return;
      }
      console.error('Image generation/sharing error:', error);
      toast({
        title: 'Алдаа гарлаа',
        description: 'Зураг үүсгэхэд алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
      setIsPreparingShareImage(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isPreparingShareImage) {
      const timer = setTimeout(() => {
        generateAndShareImage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPreparingShareImage, generateAndShareImage]);

  const handleShareClick = () => {
    if (isSharing) return;
    setIsSharing(true);
    setIsPreparingShareImage(true);
  };

  const getDateBadge = () => {
    if (!compliment.createdAt) return null;
    const date = (typeof compliment.createdAt.toDate === 'function') ? compliment.createdAt.toDate() : (compliment.createdAt as unknown as Date);
    if (!compliment.isRead) return <Badge className="border-none bg-white text-primary font-bold shadow-lg animate-pulse">Шинэ</Badge>;
    if (isToday(date)) return <Badge variant="secondary" className="border-none bg-black/20 text-white/80 backdrop-blur-sm">Өнөөдөр</Badge>;
    if (isYesterday(date)) return <Badge variant="secondary" className="border-none bg-black/20 text-white/80 backdrop-blur-sm">Өчигдөр</Badge>;
    return <Badge variant="secondary" className="border-none bg-black/20 text-white/80 backdrop-blur-sm">{format(date, 'MMM d')}</Badge>;
  }


  if (!selectedStyle) {
    return <Skeleton className="w-full aspect-[16/10] rounded-2xl" />;
  }

  const mainCard = (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card
        id={`compliment-card-${compliment.id}`}
        className="w-full relative overflow-hidden text-white rounded-3xl border-none shadow-2xl transition-all duration-500"
        style={{ backgroundImage: selectedStyle.bg }}
      >
        <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
          {getDateBadge()}
          <Button variant="ghost" size="icon" onClick={handleShareClick} className="h-9 w-9 rounded-full bg-black/20 hover:bg-black/30 text-white/90 backdrop-blur-sm" disabled={isSharing}>
            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent className="relative flex flex-col items-center justify-center p-10 text-center aspect-[16/10] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_rgba(255,255,255,0)_50%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14rem] opacity-10 select-none -rotate-12">{selectedStyle?.emoji}</div>

          <p className={cn(
            "font-black leading-tight my-auto z-10 text-white",
            getFontSizeClass(compliment.text)
          )} style={{ textShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            {compliment.text}
          </p>

          <div className="absolute bottom-4 flex items-center gap-2 text-sm opacity-80 font-medium z-10 select-none text-white/90">
            <UserX className="h-4 w-4" />
            Нэрээ нууцалсан
          </div>
        </CardContent>
        <CardFooter className="bg-black/10 dark:bg-black/20 flex items-center justify-between gap-3 p-3 backdrop-blur-sm">
          <div className="flex gap-1">
            {reactionEmojis.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(emoji)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 text-sm rounded-full bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 hover:scale-110 transition-all transform-gpu text-white",
                  isReacting === emoji && 'animate-pulse scale-125'
                )}
                disabled={!!isReacting}
              >
                <span className="opacity-90">{emoji}</span>
                <span className="font-mono text-xs min-w-[1ch] opacity-70">{localReactions[emoji] || 0}</span>
              </Button>
            ))}
          </div>

          <Button
            className="font-bold bg-white text-primary rounded-full px-4 transition-all duration-300 transform active:translate-y-px active:scale-100 hover:scale-[1.03] shadow-lg border-b-4 border-primary/20"
            onClick={() => setIsHintDialogOpen(true)}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Hint харах {revealedHints.length > 0 ? `(${revealedHints.length})` : ''}</span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );

  if (!isRevealed) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="w-full"
      >
        <Card
          id={`compliment-card-${compliment.id}`}
          className="hover:soft-shadow transition-shadow overflow-hidden"
        >
          <CardContent className="p-8 text-center flex flex-col items-center justify-center aspect-[16/10] bg-gradient-to-br from-primary/5 via-background to-background">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative mb-4"
            >
              <Gift className="w-20 h-20 text-primary drop-shadow-[0_4px_10px_hsl(var(--primary)/0.4)]" />
              <div className="w-5 h-5 absolute top-0 right-0 bg-primary rounded-full animate-ping" />
            </motion.div>
            <p className="text-xl font-bold text-foreground mt-4">
              🎁 Шинэ нэргүй wispr ирлээ!
            </p>
            <p className="text-muted-foreground text-sm">Таны сэтгэлийг дулаацуулах wispr хүлээж байна.</p>
            <div className="mt-8 flex gap-4">
              <Button onClick={handleReveal} disabled={isRevealing} size="lg">
                {isRevealing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Нээх
              </Button>
              <Button variant="ghost" onClick={() => toast({ title: 'Дараа уншихаар хадгаллаа!' })}>Дараа унших</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }



  return (
    <>
      {mainCard}
      {isPreparingShareImage && <ComplimentShareImage ref={shareImageRef} compliment={compliment} style={selectedStyle} />}
      <Dialog open={isHintDialogOpen} onOpenChange={setIsHintDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🤔 Хэн байж болох бол?</DialogTitle>
            <DialogDescription>
              {revealedHints.length > 0
                ? 'Та өмнөх Hint-үүдээ харж, эсвэл шинийг авах боломжтой.'
                : 'Энэ wispr-ийн талаарх анхны Hint-ээ аваарай.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="text-center bg-secondary p-4 rounded-lg my-2 border">
            <p className="text-sm font-medium text-muted-foreground">Таны үлдсэн нийт Hint</p>
            <p className="text-4xl font-bold text-primary">{totalHints}</p>
          </div>

          {isHintRevealing && revealedHints.length === 0 ? (
            <div className="text-center space-y-2 text-sm text-muted-foreground py-8">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p>Hint боловсруулж байна...</p>
            </div>
          ) : revealedHints.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">Энэ wispr-ийн Hint-үүд ({revealedHints.length})</p>
              <ul className="space-y-3 max-h-48 overflow-y-auto pr-2 rounded-lg border bg-secondary p-3">
                {revealedHints.map((hint, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                    <div className="text-sm font-bold text-primary">#{index + 1}</div>
                    <p className="text-sm text-foreground flex-1">{hint}</p>
                  </li>
                ))}
                {isHintRevealing && (
                  <li className="flex items-start gap-3 p-3">
                    <div className="text-sm font-bold text-primary">#{revealedHints.length + 1}</div>
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </li>
                )}
              </ul>
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 !space-x-0 pt-4">
            {totalHints > 0 ? (
              <Button
                className="w-full"
                onClick={handleRevealHint}
                disabled={isHintRevealing || ownerLoading}
              >
                {(isHintRevealing || ownerLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Шинэ hint авах
              </Button>
            ) : (
              <>
                <Button
                  className="w-full"
                  onClick={handleSingleHintPurchase}
                  disabled={isCreatingInvoice}
                >
                  {isCreatingInvoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  1 Hint авах (1,900₮)
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  asChild
                >
                  <Link href="/profile">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Багц худалдаж авах
                  </Link>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {qpayData && (
        <QPayDialog
          isOpen={!!qpayData}
          onClose={() => setQpayData(null)}
          qrImage={qpayData.qrImage}
          deeplinks={qpayData.deeplinks}
          invoiceId={qpayData.invoiceId}
          onSuccess={() => {
            toast({ title: "Баяр хүргэе!", description: "Hint-ийн эрх амжилттай нэмэгдлээ." });
          }}
        />
      )}

    </>
  );
}

export function ComplimentList({
  compliments,
  isLoading,
  ownerData,
  ownerLoading
}: {
  compliments: WithId<Compliment>[];
  isLoading: boolean;
  ownerData: WithId<ComplimentOwner> | null;
  ownerLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-full aspect-[16/10] rounded-2xl" />
        <Skeleton className="w-full aspect-[16/10] rounded-2xl" />
      </div>
    );
  }

  if (compliments.length === 0) {
    return (
      <div className="text-center py-20 px-4 border-2 border-dashed rounded-2xl mt-8 bg-card/50">
        <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium text-foreground">Одоогоор энд чимээгүй байна...</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Wispr-үүд ирэхэд заримдаа хугацаа ордог. Линкээ найзуудтайгаа хуваалцаж, тэдний сэтгэлийн үгсийг хүлээгээрэй. Хэн нэгэн таны тухай аль хэдийн бодож байж магадгүй шүү.
        </p>
        <Button asChild className="mt-6">
          <Link href="/create">🔗 Линкээ хуваалцах</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {compliments.map((comp, index) => (
        <div key={comp.id}>
          <ComplimentCard compliment={comp} ownerData={ownerData} ownerLoading={ownerLoading} index={index} />
        </div>
      ))}
      <div className="py-8 text-center">
        <p className="text-muted-foreground">➕ Илүү олон wispr хүсч байна уу?</p>
        <Button asChild variant="link" className="text-base">
          <Link href="/create">Линкээ дахин хуваалцаарай</Link>
        </Button>
      </div>
    </div>
  );
}
