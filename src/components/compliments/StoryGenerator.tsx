import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, ChevronLeft, Copy, Check, Instagram, Link as LinkIcon, Facebook, Info, Smartphone, Upload, Square, Smile } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { StoryPreview } from './StoryPreview';
import { type WithId } from '@/firebase';
import { type ComplimentOwner } from '@/types';
import { STORY_DESIGNS } from './story-designs';

export function StoryGenerator({ ownerData }: { ownerData: WithId<ComplimentOwner> | null }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDesignIndex, setActiveDesignIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const activeDesign = STORY_DESIGNS[activeDesignIndex];

  const handleNextDesign = () => {
    setActiveDesignIndex((prev) => (prev + 1) % STORY_DESIGNS.length);
  };

  const handlePrevDesign = () => {
    setActiveDesignIndex((prev) => (prev - 1 + STORY_DESIGNS.length) % STORY_DESIGNS.length);
  };

  const copyLink = async () => {
    if (ownerData?.shareUrl) {
      try {
        await navigator.clipboard.writeText(ownerData.shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
          title: 'Линк хуулагдлаа! 🔗',
          description: 'Story дээрээ "Link" стикерт наахад бэлэн.',
        });
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  const handleShare = async () => {
    // Determine which element to capture. We prefer the hidden one for a "clean" look.
    const elementToCapture = hiddenRef.current;
    if (!elementToCapture) return;

    setIsGenerating(true);

    // Auto-copy link if not done yet
    if (!isCopied) await copyLink();

    try {
      // Create high-res image from mobile-sized container (360x640 * 3 = 1080x1920)
      const blob = await htmlToImage.toBlob(elementToCapture, {
        cacheBust: true,
        pixelRatio: 3,
        skipFonts: false,
        style: { display: 'flex' } // Force display flex for proper capture even if hidden
      });

      if (!blob) throw new Error("Blob generation failed");

      const file = new File([blob], "wispr-story.png", { type: "image/png" });

      // Share the file
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            // title: 'Wispr Story', // Some platforms ignore this or double it
            // text: 'Надад нэг нэргүй wispr үлдээгээрэй! 💛',
          });
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
            setIsGenerating(false);
            return;
          }
          throw shareError;
        }
      } else {
        // Fallback download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'wispr-story.png';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Зураг татагдлаа!',
          description: 'Story дээрээ зургаа оруулаад, хуулагдсан линкээ стикер болгон нэмээрэй.',
        });
      }
    } catch (error) {
      console.error('Story generation error:', error);
      toast({
        title: 'Зураг үүсгэхэд алдаа гарлаа',
        description: 'Түр хүлээгээд дахин оролдоно уу.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* HEADER & CONTROLS */}
      <div className="px-2 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Story үүсгэх ✨</h2>
        <span className="text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">
          {activeDesignIndex + 1} / {STORY_DESIGNS.length}
        </span>
      </div>

      {/* PREVIEW AREA (Visible, Instructional Mode) */}
      <div className="relative group max-w-sm mx-auto p-1">
        {/* Decorative Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-xl opacity-50 rounded-3xl -z-10"></div>

        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-[-10px] top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-md shadow-lg hover:bg-background border border-border/50 rounded-full h-10 w-10 md:left-[-20px] transition-all hover:scale-110 text-foreground"
          onClick={handlePrevDesign}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* User Visible Preview */}
        <div className="rounded-[2rem] overflow-hidden border-[6px] border-background/50 shadow-2xl relative bg-black">
          {/* Phone Notch/Island Simulation */}
          <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-30 pointer-events-none">
            <div className="w-1/3 h-5 bg-black rounded-b-2xl opacity-50 backdrop-blur-md"></div>
          </div>

          <StoryPreview
            ref={previewRef}
            mode="preview"
            design={activeDesign}
          />
        </div>

        {/* Right Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-[-10px] top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-md shadow-lg hover:bg-background border border-border/50 rounded-full h-10 w-10 md:right-[-20px] transition-all hover:scale-110 text-foreground"
          onClick={handleNextDesign}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* HIDDEN CAPTURE AREA (Off-screen, Clean Mode) */}
      {/* We use standard mobile proportions (360x640).
          html-to-image with pixelRatio: 3 will output exactly 1080x1920.
          This ensures all relative sizes (rem, proportions) scale perfectly from generic UI size to HD. */}
      <div className="fixed top-0 left-[-9999px] w-[360px] h-[640px] pointer-events-none opacity-0">
        <StoryPreview
          ref={hiddenRef}
          mode="capture"
          design={activeDesign}
        />
      </div>

      {/* ACTIONS */}
      <div className="space-y-4 px-2 max-w-sm mx-auto">
        <Button onClick={handleShare} disabled={isGenerating || !ownerData} className="w-full font-bold h-14 text-base shadow-xl hover:shadow-primary/25 transition-all overflow-hidden relative group" size="lg">
          {/* Button Shine Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>

          {isGenerating ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <div className="flex items-center gap-1.5 mr-3">
              <Instagram className="h-5 w-5" />
              <span className="opacity-50 text-xs">/</span>
              <Facebook className="h-5 w-5" />
            </div>
          )}
          <span>Story шэйрлэх</span>
        </Button>

        {/* Manual Copy Fallback */}
        <Button variant="ghost" onClick={copyLink} className="w-full text-muted-foreground text-sm hover:text-foreground">
          {isCopied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
          {isCopied ? 'Хуулагдсан' : 'Линкийг хуулах'}
        </Button>
      </div>


      {/* PREMIUM INSTRUCTIONS UI */}
      <div className="max-w-sm mx-auto">
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50"></div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Яаж оруулах вэ?</h3>
            </div>

            <div className="space-y-4 px-1">
              {/* Step 1 */}
              <div className="flex gap-4 items-start relative pb-4">
                <div className="absolute top-8 left-4 bottom-0 w-px bg-gradient-to-b from-primary/30 to-border/30"></div>
                <div className="bg-background relative z-10 w-8 h-8 rounded-full border-2 border-primary/30 shadow-sm flex items-center justify-center shrink-0 mt-0.5 group-hover:border-primary transition-colors">
                  <Smartphone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-[14px] leading-none mb-1.5">1. Зураг оруулах</p>
                  <p className="text-[13px] text-muted-foreground/90 leading-relaxed">Story шэйрлэх товчийг дарангуут <b>линк хуулагдаж</b>, Facebook/Instagram-ийн Story цонх нээгдэнэ.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start relative pb-4">
                <div className="absolute top-8 left-4 bottom-0 w-px bg-gradient-to-b from-border/30 to-border/10"></div>
                <div className="bg-background relative z-10 w-8 h-8 rounded-full border-2 border-border/50 shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                  <div className="relative">
                    <Square className="w-4 h-4 text-foreground/70" />
                    <Smile className="w-2.5 h-2.5 absolute bottom-0 right-0 text-foreground/70 bg-background rounded-full" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-[14px] leading-none mb-1.5">2. Стикер (Stickers) цэс</p>
                  <p className="text-[13px] text-muted-foreground/90 leading-relaxed">Story дэлгэцийн дээд хэсэгт байрлах <b>Стикер</b> (инээмсэглэсэн дөрвөлжин) дүрсийг дарна.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start relative">
                <div className="bg-background relative z-10 w-8 h-8 rounded-full border-2 border-border/50 shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                  <LinkIcon className="w-4 h-4 text-foreground/70" />
                </div>
                <div>
                  <p className="font-bold text-[14px] leading-none mb-1.5">3. Линкээ наах</p>
                  <p className="text-[13px] text-muted-foreground/90 leading-relaxed">Цэснээс ээр <b>LINK</b> (Холбоос) стикерийг сонгоод, бидний хуулж өгсөн линкийг <span className="px-1 py-0.5 bg-muted rounded font-mono text-foreground/80">Paste</span> хийгээрэй! 🎉</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

