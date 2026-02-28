'use client';

import type { Compliment, ComplimentOwner } from '@/types';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Gift, Loader2, Share2, UserX, KeyRound, ShoppingCart, MessageSquareIcon, Send, X, ArrowRight, ShieldAlert, MoreVertical, Trash2, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import * as htmlToImage from 'html-to-image';
import { doc, updateDoc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { useFirestore, type WithId, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { generateHintAction, addReactionToComplimentAction, reportComplimentAction } from '@/app/compliments/actions';
import { replyToComplimentAction } from '@/app/compliments/reply-action';
import { Textarea } from '@/components/ui/textarea';

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
import { AudioPlayer } from '../ui/AudioPlayer';


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
  index,
  isArchiveView = false,
}: {
  compliment: WithId<Compliment>,
  ownerData: WithId<ComplimentOwner> | null,
  ownerLoading: boolean,
  index: number,
  isArchiveView?: boolean,
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

  const [totalHints, setTotalHints] = useState(1);
  const [dailyHintsAvailable, setDailyHintsAvailable] = useState(1);

  const [localReactions, setLocalReactions] = useState(compliment.reactions || {});
  const [isReacting, setIsReacting] = useState<string | null>(null);

  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [qpayData, setQpayData] = useState<{ qrImage: string, deeplinks: any[], invoiceId: string } | null>(null);

  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [localReplyStatus, setLocalReplyStatus] = useState<string | null>(compliment.replyText || null);
  const [isReporting, setIsReporting] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [isArchived, setIsArchived] = useState(compliment.isArchived ?? false);
  const [isDeleted, setIsDeleted] = useState(false);


  const getFontSizeClass = (text: string) => {
    const length = text.length;
    if (length < 50) return 'text-3xl sm:text-4xl';
    if (length < 100) return 'text-2xl sm:text-3xl';
    if (length < 150) return 'text-xl sm:text-2xl';
    return 'text-lg sm:text-xl';
  };

  useEffect(() => {
    if (ownerLoading) {
      setDailyHintsAvailable(1);
      setTotalHints(1 + (ownerData?.bonusHints || 0));
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


      const daily = 1;
      const bonus = ownerData.bonusHints || 0;

      setDailyHintsAvailable(daily - dailyUsed);
      setTotalHints(Math.max(0, daily - dailyUsed) + bonus);
    } else {
      setDailyHintsAvailable(1);
      setTotalHints(1);
    }
  }, [ownerData, ownerLoading]);


  useEffect(() => {
    const styles = [
      // Soft Rose Aurora
      { bg: 'radial-gradient(ellipse at top left, #ff85b3 0%, #a855f7 50%, #7c3aed 100%)', emoji: '💜' },
      // Lavender Haze
      { bg: 'radial-gradient(ellipse at top right, #c084fc 0%, #818cf8 50%, #6366f1 100%)', emoji: '✨' },
      // Warm Sunset
      { bg: 'radial-gradient(ellipse at center top, #fbbf24 0%, #f97316 50%, #ef4444 100%)', emoji: '🔥' },
      // Sky Blue
      { bg: 'radial-gradient(ellipse at bottom left, #38bdf8 0%, #3b82f6 50%, #6366f1 100%)', emoji: '🌊' },
      // Emerald Mint
      { bg: 'radial-gradient(ellipse at top left, #34d399 0%, #10b981 50%, #059669 100%)', emoji: '🌿' },
      // Rose Pink
      { bg: 'radial-gradient(ellipse at center, #fb7185 0%, #f43f5e 50%, #e11d48 100%)', emoji: '🌸' },
      // Golden Amber
      { bg: 'radial-gradient(ellipse at top right, #fde68a 0%, #fbbf24 50%, #f59e0b 100%)', emoji: '🌟' },
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

      // Trigger confetti
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      });

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

    // Haptic feedback for micro-interaction
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

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

  const handleReplySubmit = async () => {
    if (!replyText.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);

    try {
      const result = await replyToComplimentAction(compliment.ownerId, compliment.id, replyText);
      if (result.success) {
        setLocalReplyStatus(replyText);
        setIsReplying(false);
        toast({ title: 'Хариу илгээгдлээ!', description: 'Энэ мессежийг бичсэн хүнд таны хариу очсон.' });
      } else {
        toast({ title: 'Алдаа', description: result.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Алдаа', description: 'Хариу үлдээхэд алдаа гарлаа.', variant: 'destructive' });
    } finally {
      setIsSubmittingReply(false);
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

  const handleReport = async () => {
    if (isReporting || isReported) return;
    if (!confirm('Энэ Wispr-ийг зохисгүй контент гэж мэдээлэх үү?')) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(60);
    setIsReporting(true);
    try {
      const result = await reportComplimentAction(compliment.ownerId, compliment.id);
      if (result.success) {
        setIsReported(true);
        toast({ title: 'Мэдээлэл хүлээн авлаа', description: 'Бид удахгүй шалгаж шийдвэрлэх болно.' });
      } else {
        toast({ title: 'Алдаа', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Алдаа', description: 'Report илгээхэд алдаа гарлаа.', variant: 'destructive' });
    } finally { setIsReporting(false); }
  };

  const handleArchive = async () => {
    if (!firestore) return;
    try {
      const ref = doc(firestore, 'complimentOwners', compliment.ownerId, 'compliments', compliment.id);
      await updateDoc(ref, { isArchived: true });
      setIsArchived(true);
      toast({ title: 'Архивлагдлаа', description: 'Wispr архивт хадгалагдлаа.' });
    } catch {
      toast({ title: 'Алдаа', description: 'Архивлахад алдаа гарлаа.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!firestore) return;
    if (!confirm('Энэ Wispr-ийг устгах уу? Буцаах боломжгүй.')) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const ref = doc(firestore, 'complimentOwners', compliment.ownerId, 'compliments', compliment.id);
      await deleteDoc(ref);
      setIsDeleted(true);
      toast({ title: 'Устгагдлаа', description: 'Wispr устгагдлаа.' });
    } catch {
      toast({ title: 'Алдаа', description: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
    }
  };

  const getDateBadge = () => {
    if (!compliment.createdAt) return null;
    const date = (typeof compliment.createdAt.toDate === 'function') ? compliment.createdAt.toDate() : (compliment.createdAt as unknown as Date);
    if (!compliment.isRead) return <Badge className="border-none bg-white text-primary font-bold shadow-lg animate-pulse">Шинэ</Badge>;
    if (isToday(date)) return <Badge variant="secondary" className="border-none bg-black/20 text-white/70 backdrop-blur-sm font-medium">Өнөөдөр</Badge>;
    if (isYesterday(date)) return <Badge variant="secondary" className="border-none bg-black/20 text-white/70 backdrop-blur-sm font-medium">Өчигдөр</Badge>;
    return <Badge variant="secondary" className="border-none bg-black/20 text-white/70 backdrop-blur-sm font-medium">{format(date, 'MMM d')}</Badge>;
  }


  if (!selectedStyle) return <Skeleton className="w-full aspect-[16/10] rounded-2xl" />;
  // In archive view, always render. In normal view, hide archived/deleted cards.
  if (!isArchiveView && (isDeleted || isArchived)) return null;
  if (isArchiveView && isDeleted) return null;

  const mainCard = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.005 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full relative px-4 sm:px-0"
    >
      <div
        id={`compliment-card-${compliment.id}`}
        className="w-full relative overflow-hidden text-white rounded-[3rem]"
        style={{
          background: selectedStyle.bg,
          boxShadow: '0 2px 0 0 rgba(255,255,255,0.15) inset, 0 -2px 0 0 rgba(0,0,0,0.2) inset, 0 50px 100px -20px rgba(0,0,0,0.6), 0 20px 40px -10px rgba(0,0,0,0.3)'
        }}
      >
        {/* Layered Light Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,_rgba(255,255,255,0.2)_0%,_transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_85%,_rgba(0,0,0,0.25)_0%,_transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 border border-white/10 rounded-[3rem] pointer-events-none" />

        {/* Noise texture for depth */}
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        />

        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-7 pt-7 pb-0 relative z-10">
          <div className="flex items-center gap-2">
            {getDateBadge()}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.88 }}
                className="h-10 w-10 rounded-2xl flex items-center justify-center bg-black/20 hover:bg-black/30 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl">
              {/* Like */}
              <DropdownMenuItem
                onClick={() => handleReaction('❤️')}
                disabled={!!isReacting}
                className="flex items-center gap-3 rounded-xl cursor-pointer py-3 font-semibold"
              >
                <motion.span
                  animate={isReacting === '❤️' ? { scale: [1, 1.6, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  className="text-base leading-none"
                >
                  ❤️
                </motion.span>
                <span>Таалагдлаа</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleShareClick}
                disabled={isSharing}
                className="flex items-center gap-3 rounded-xl cursor-pointer py-3 font-semibold"
              >
                {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4 text-blue-500" />}
                Хуваалцах
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isArchiveView ? (
                <DropdownMenuItem
                  onClick={async () => {
                    if (!firestore) return;
                    try {
                      await updateDoc(doc(firestore, 'complimentOwners', compliment.ownerId, 'compliments', compliment.id), { isArchived: false });
                      setIsDeleted(true); // Remove from archive view
                      toast({ title: 'Архиваас гаргалаа', description: 'Wispr ирсэн хэсэгт буцлаа.' });
                    } catch { toast({ title: 'Алдаа', variant: 'destructive' }); }
                  }}
                  className="flex items-center gap-3 rounded-xl cursor-pointer py-3 font-semibold"
                >
                  <Archive className="h-4 w-4 text-amber-500" />
                  Архиваас гаргах
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={handleArchive}
                  className="flex items-center gap-3 rounded-xl cursor-pointer py-3 font-semibold"
                >
                  <Archive className="h-4 w-4 text-amber-500" />
                  Архивлах
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleReport}
                disabled={isReporting || isReported}
                className="flex items-center gap-3 rounded-xl cursor-pointer py-3 font-semibold"
              >
                {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4 text-orange-500" />}
                {isReported ? 'Мэдээлэгдсэн' : 'Мэдэгдэх'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="flex items-center gap-3 rounded-xl cursor-pointer py-3 font-semibold text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Устгах
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main Content Area */}
        <div className="relative flex flex-col px-8 pt-6 pb-6 text-center min-h-[52vw] sm:min-h-[260px] justify-center">
          {/* Watermark Emoji */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem] opacity-[0.08] select-none pointer-events-none leading-none"
            style={{ transform: 'translate(-50%, -50%) rotate(-15deg)' }}
          >
            {selectedStyle?.emoji}
          </div>

          {/* Message Text — centered, always visible */}
          <div className="flex items-center justify-center relative z-10 py-4">
            <p
              className={cn(
                "font-black leading-[1.1] text-white w-full",
                getFontSizeClass(compliment.text)
              )}
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)',
                letterSpacing: '-0.03em'
              }}
            >
              {compliment.text}
            </p>
          </div>

          {compliment.audioUrl && (
            <div className="relative z-10 mx-auto w-full max-w-[280px] bg-black/20 backdrop-blur-2xl rounded-[2rem] border border-white/10 p-1.5 shadow-2xl mt-4">
              <AudioPlayer src={compliment.audioUrl} duration={compliment.duration} className="bg-transparent text-white" />
            </div>
          )}
        </div>

        {/* Bottom Bar: Metadata + Reactions + Actions — all in one row */}
        <div className="relative z-10 px-5 pb-5 space-y-3">
          {/* Bottom info row — sender badge only */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/50 bg-black/10 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10">
              <UserX className="h-3 w-3 shrink-0" />
              <span>Нэрээ нууцласан</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest border-2 transition-all backdrop-blur-xl",
                localReplyStatus
                  ? "bg-white/10 text-white/40 border-white/10 cursor-default"
                  : isReplying
                    ? "bg-white text-gray-900 border-white shadow-[0_6px_20px_rgba(255,255,255,0.3)]"
                    : "bg-white/10 text-white border-white/25 hover:bg-white/20 hover:border-white/40"
              )}
              onClick={() => !localReplyStatus && setIsReplying(!isReplying)}
              disabled={!!localReplyStatus}
            >
              <MessageSquareIcon className={cn("h-4 w-4 shrink-0", isReplying ? "text-gray-900" : "text-white")} />
              <span>{localReplyStatus ? "Хариулсан" : "Хариулах"}</span>
            </motion.button>

            {/* Hint button — styled with glow + hint count badge */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setIsHintDialogOpen(true)}
              className="relative flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest overflow-hidden transition-all"
              style={{
                background: 'rgba(255,255,255,0.92)',
                boxShadow: revealedHints.length > 0
                  ? '0 6px 20px rgba(139,92,246,0.35), 0 0 0 1.5px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.8)'
                  : '0 6px_20px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
            >
              {/* Purple shimmer overlay when hints already revealed */}
              {revealedHints.length > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-primary/15 to-purple-500/10 pointer-events-none" />
              )}
              <KeyRound className={cn("h-4 w-4 shrink-0 relative z-10", revealedHints.length > 0 ? 'text-primary' : 'text-gray-900')} />
              <span className={cn('relative z-10', revealedHints.length > 0 ? 'text-primary' : 'text-gray-900')}>Hint</span>
              {revealedHints.length > 0 && (
                <span className="relative z-10 ml-0.5 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {revealedHints.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (!isRevealed) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full relative px-4 sm:px-0"
      >
        <div
          className="w-full relative overflow-hidden rounded-[3rem] flex flex-col items-center justify-center min-h-[52vw] sm:min-h-[320px] group cursor-pointer"
          onClick={!isRevealing ? handleReveal : undefined}
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, #2d1b69 0%, #0f0a1e 60%, #070510 100%)',
            boxShadow: '0 2px 0 0 rgba(255,255,255,0.08) inset, 0 50px 100px -20px rgba(0,0,0,0.8)'
          }}
        >
          {/* Star field */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.7 + 0.1,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${Math.random() * 2 + 2}s`
                }}
              />
            ))}
          </div>

          {/* Orbital glow rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full border border-primary/10 animate-spin" style={{ animationDuration: '12s' }} />
            <div className="absolute w-48 h-48 rounded-full border border-primary/15 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
          </div>

          {/* Main gift icon */}
          <div className="relative z-10 flex flex-col items-center gap-6 p-10">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="absolute inset-0 -m-4 bg-primary/30 rounded-full blur-2xl animate-pulse" />
              <Gift className="w-20 h-20 text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.8)] relative z-10" />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full"
              />
            </motion.div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">Шинэ wispr ирлээ!</h3>
              <p className="text-white/50 font-medium text-sm max-w-[180px] leading-relaxed">Хэн нэгэн танд сэтгэлийн үг илгээсэн байна</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleReveal}
              disabled={isRevealing}
              className="mt-2 px-10 h-14 rounded-2xl bg-white text-gray-900 font-black text-base uppercase tracking-widest shadow-[0_10px_40px_rgba(255,255,255,0.25)] hover:shadow-[0_15px_50px_rgba(255,255,255,0.35)] transition-all"
            >
              {isRevealing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Нээж байна...</span>
                </div>
              ) : '🎁  Нээх'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full relative px-4 sm:px-0">
      {mainCard}

      {/* Reply Input Area - Floating Bottom Sheet */}
      <AnimatePresence>
        {isReplying && !localReplyStatus && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
              onClick={() => !isSubmittingReply && setIsReplying(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-background border-t shadow-[0_-20px_50px_rgba(0,0,0,0.3)] rounded-t-[3rem] p-6 pb-12 md:max-w-2xl md:mx-auto md:bottom-6 md:rounded-[3rem]"
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <h4 className="text-sm font-black text-primary flex items-center gap-2 uppercase tracking-widest">
                  <MessageSquareIcon className="w-5 h-5" />
                  Риплай бичих
                </h4>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary/80 hover:bg-secondary" onClick={() => !isSubmittingReply && setIsReplying(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <Textarea
                  placeholder="Таны хариу (Зөвхөн бичсэн хүнд л харагдана)..."
                  className="resize-none min-h-[140px] bg-secondary/50 border-none shadow-inner rounded-[2rem] pt-6 px-6 text-lg font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
                />
                <div className="absolute bottom-4 right-4 group">
                  <Button
                    size="lg"
                    className="rounded-full shadow-2xl font-black px-8 h-12 hover:scale-105 transition-transform"
                    onClick={handleReplySubmit}
                    disabled={isSubmittingReply || !replyText.trim()}
                  >
                    {isSubmittingReply ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    Илгээх
                  </Button>
                </div>
              </div>
              {!compliment.senderId && (
                <p className="text-xs text-muted-foreground mt-6 mx-4 opacity-70 flex items-start gap-2">
                  <span className="text-orange-500 font-bold">⚠️</span>
                  Уучлаарай, илгээгч зочин бол таны хариуг унших боломжгүй байж магадгүй.
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Visual Indicator of a Reply existing */}
      {localReplyStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-primary/5 border border-primary/10 rounded-[2rem] p-6 shadow-sm relative overflow-hidden backdrop-blur-sm"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
          <span className="text-[11px] font-black text-primary mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Таны хариу
          </span>
          <p className="text-base text-foreground/90 leading-relaxed font-bold pl-4 border-l-4 border-primary/40">"{localReplyStatus}"</p>
        </motion.div>
      )}

      {/* Share Image Ref (Hidden) */}
      {isPreparingShareImage && <ComplimentShareImage ref={shareImageRef} compliment={compliment} style={selectedStyle} />}

      {/* Hint Dialogs */}
      <Dialog open={isHintDialogOpen} onOpenChange={setIsHintDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">🤔 Хэн байж болох бол?</DialogTitle>
            <DialogDescription className="font-medium">
              {revealedHints.length > 0
                ? 'Та өмнөх Hint-үүдээ харж, эсвэл шинийг авах боломжтой.'
                : 'Энэ wispr-ийн талаарх анхны Hint-ээ аваарай.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="text-center bg-secondary/50 p-6 rounded-[2rem] my-4 border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1)_0%,_transparent_100%)]" />
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1 relative z-10">Нийт Hint эрх</p>
            <p className="text-5xl font-black text-primary relative z-10 drop-shadow-sm">{totalHints}</p>
          </div>

          <div className="space-y-4">
            {revealedHints.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Мэдэгдэж буй Hint-үүд ({revealedHints.length})</p>
                <ul className="space-y-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {revealedHints.map((hint, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-4 p-4 bg-secondary/30 rounded-2xl border border-white/5"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">{idx + 1}</div>
                      <p className="text-sm font-bold text-foreground leading-snug">{hint}</p>
                    </motion.li>
                  ))}

                  {compliment.senderOS && (
                    <li className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl shadow-inner">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white shrink-0">P</div>
                      <div className="flex-1">
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Үйлдлийн систем</p>
                        <p className="text-sm font-black text-foreground">{compliment.senderOS}</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {isHintRevealing && (
              <div className="text-center py-6 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-xs font-black uppercase text-muted-foreground animate-pulse">Hint боловсруулж байна...</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-3 !space-x-0 pt-6">
            {totalHints > 0 ? (
              <Button
                className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20"
                onClick={handleRevealHint}
                disabled={isHintRevealing || ownerLoading}
              >
                {(isHintRevealing || ownerLoading) && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                Шинэ Hint авах
              </Button>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <Button
                  className="w-full h-14 rounded-2xl text-lg font-black shadow-2xl shadow-primary/30"
                  onClick={handleSingleHintPurchase}
                  disabled={isCreatingInvoice}
                >
                  {isCreatingInvoice ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <KeyRound className="mr-3 h-5 w-5" />}
                  1 Hint авах (1,900₮)
                </Button>
                <Button variant="outline" asChild className="w-full h-14 rounded-2xl font-bold border-2">
                  <Link href="/profile">
                    <ShoppingCart className="mr-3 h-5 w-5" />
                    Багц худалдаж авах
                  </Link>
                </Button>
              </div>
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
    </div>
  );
}

export function ComplimentList({
  compliments,
  isLoading,
  ownerData,
  ownerLoading,
  isArchiveView = false,
}: {
  compliments: WithId<Compliment>[];
  isLoading: boolean;
  ownerData: WithId<ComplimentOwner> | null;
  ownerLoading: boolean;
  isArchiveView?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-8 px-4 sm:px-0">
        <div className="w-full aspect-[16/11] bg-muted/40 animate-pulse rounded-[3.5rem] border border-white/10 shadow-inner" />
        <div className="w-full aspect-[16/11] bg-muted/30 animate-pulse rounded-[3.5rem] border border-white/10" />
      </div>
    );
  }

  if (compliments.length === 0) {
    return (
      <div className="px-4 sm:px-0">
        <div className="text-center py-20 px-8 rounded-[3.5rem] mt-8 bg-gradient-to-b from-secondary/40 to-background border border-border/40 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-40"></div>

          <div className="relative z-10 space-y-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative w-56 h-56 mx-auto"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
              <Image
                src="/images/empty-inbox.png"
                alt="Empty Inbox"
                width={224}
                height={224}
                className="relative z-10 object-contain drop-shadow-2xl brightness-110"
              />
            </motion.div>

            <div className="space-y-4">
              <h3 className="text-4xl font-black text-foreground tracking-tighter">Энд одоогоор чимээгүй...</h3>
              <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed font-bold">
                Линкээ найзуудтайгаа хуваалцаж, тэдний сэтгэлийн үгсийг хүлээгээрэй. 🤫
              </p>
            </div>

            <Button asChild size="lg" className="rounded-[2rem] shadow-2xl shadow-primary/20 h-20 px-12 font-black text-xl hover:scale-105 active:scale-95 transition-all bg-primary text-primary-foreground group">
              <Link href="/create" className="flex items-center gap-3">
                Линкээ хуваалцах
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {compliments.map((comp, index) => (
        <ComplimentCard key={comp.id} compliment={comp} ownerData={ownerData} ownerLoading={ownerLoading} index={index} isArchiveView={isArchiveView} />
      ))}
      <div className="py-12 text-center relative">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-white/5 z-0" />
        <div className="relative z-10 bg-background/50 backdrop-blur-sm inline-block px-8 py-2">
          <p className="text-muted-foreground font-bold mb-3 tracking-wide">➕ Илүү олон wispr хүсч байна уу?</p>
          <Button asChild variant="ghost" className="text-lg font-black text-primary hover:bg-primary/10 rounded-full h-12 px-8">
            <Link href="/create">Линкээ дахин хуваалцаарай</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

