import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, ChevronRight, ChevronLeft, Copy, Check, Instagram, Link as LinkIcon } from 'lucide-react';
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
      // Generate the image blob from the HIDDEN clean version
      const blob = await htmlToImage.toBlob(elementToCapture, {
        cacheBust: true,
        pixelRatio: 3, // High quality for stories
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
    <div className="space-y-6">

      {/* HEADER & CONTROLS */}
      <div className="px-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">🚀 Story үүсгэх</h2>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
          {activeDesignIndex + 1} / {STORY_DESIGNS.length}
        </span>
      </div>

      {/* PREVIEW AREA (Visible, Instructional Mode) */}
      <div className="relative group max-w-sm mx-auto">
        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur shadow-sm hover:bg-white rounded-full h-8 w-8 md:h-10 md:w-10 md:left-[-20px]"
          onClick={handlePrevDesign}
        >
          <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
        </Button>

        {/* User Visible Preview */}
        <StoryPreview
          ref={previewRef}
          mode="preview"
          design={activeDesign}
        />

        {/* Right Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur shadow-sm hover:bg-white rounded-full h-8 w-8 md:h-10 md:w-10 md:right-[-20px]"
          onClick={handleNextDesign}
        >
          <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
        </Button>
      </div>

      {/* HIDDEN CAPTURE AREA (Off-screen, Clean Mode) */}
      {/* We use absolute positioning off-screen instead of display:none so it can render for capture */}
      <div className="absolute top-0 left-[-9999px] w-[600px] h-[1067px] pointer-events-none opacity-0">
        {/* Fixed width/height for consistent high-res output */}
        <StoryPreview
          ref={hiddenRef}
          mode="capture"
          design={activeDesign}
        />
      </div>

      {/* ACTIONS */}
      <div className="space-y-4 px-2">
        <Button onClick={handleShare} disabled={isGenerating || !ownerData} className="w-full font-bold h-12 text-base shadow-lg animate-pulse hover:animate-none" size="lg">
          {isGenerating ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Instagram className="mr-2 h-5 w-5" />
          )}
          Story үүсгэх & Хуваалцах
        </Button>

        {/* Manual Copy Fallback */}
        <Button variant="outline" onClick={copyLink} className="w-full text-muted-foreground text-xs h-8">
          {isCopied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {isCopied ? 'Линк хуулагдсан' : 'Линкийг гараар хуулах'}
        </Button>
      </div>


      {/* INSTRUCTIONS */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-blue-900 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs">?</span>
          Яаж Story хийх вэ?
        </h3>

        <div className="grid gap-4">
          <div className="flex gap-3 items-start">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-50 text-pink-500">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">1. Зураг үүсгэх</p>
              <p className="text-xs text-gray-500 leading-relaxed">"Story үүсгэх" товчийг дарахад Wispr автоматаар таны линкийг хуулж, зургийг таны утсанд хадгалах эсвэл Instagram руу шэйрлэнэ.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-50 text-blue-500">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">2. Линк наах</p>
              <p className="text-xs text-gray-500 leading-relaxed">Story дээрээ <b>Stickers</b> цэснээс <b>LINK</b> стикерийг сонгоод Paste хийгээрэй.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-50 text-indigo-500">
              <div className="h-5 w-5 flex items-center justify-center font-bold text-xs border-2 border-current rounded">Aa</div>
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">3. Байршуулах</p>
              <p className="text-xs text-gray-500 leading-relaxed">"Линкээ энд наана" гэсэн сумтай хэсэг дээр стикерээ тааруулж тавиарай.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
