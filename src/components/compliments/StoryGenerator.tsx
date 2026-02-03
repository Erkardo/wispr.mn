'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Camera } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { StoryPreview } from './StoryPreview';
import { type WithId } from '@/firebase';
import { type ComplimentOwner } from '@/types';

export function StoryGenerator({ ownerData }: { ownerData: WithId<ComplimentOwner> | null }) {
  const storyRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    if (!storyRef.current) return;
    setIsGenerating(true);

    // 1. Copy link to clipboard first (important for the user to have it ready)
    if (ownerData?.shareUrl) {
      try {
        await navigator.clipboard.writeText(ownerData.shareUrl);
        toast({
          title: 'Линк хуулагдлаа! 🔗',
          description: 'Instagram Story дээрээ "Link" стикерт наахад бэлэн.',
        });
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }

    try {
      // 2. Generate the image blob directly
      const blob = await htmlToImage.toBlob(storyRef.current, {
        cacheBust: true,
        pixelRatio: 3, // High quality for stories
        skipFonts: false,
      });

      if (!blob) throw new Error("Blob generation failed");

      const file = new File([blob], "wispr-story.png", { type: "image/png" });

      // 3. Share the file
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Wispr Story',
            text: 'Надад нэг нэргүй wispr үлдээгээрэй! 💛',
          });
        } catch (shareError: any) {
          // If the user cancelled, we dont show an error
          if (shareError.name === 'AbortError') {
            setIsGenerating(false);
            return;
          }
          throw shareError;
        }
      } else {
        // Fallback for browsers that don't support file sharing
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
        description: 'Түр хүлээгээд дахин оролдоно уу эсвэл хөтчөө дахин ачаална уу.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold px-2">🚀 Story үүсгэж, хуваалцах</h2>
      <StoryPreview ref={storyRef} />
      <div className="p-2 space-y-4">
        <div className="text-sm text-muted-foreground rounded-lg border bg-secondary/30 p-4 space-y-2">
          <h3 className="font-bold text-foreground">Яаж хуваалцах вэ?</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>"Story-ны зураг үүсгэх" товчийг дарж зургийг хадгална.</li>
            <li>Story дээрээ зургийг байршуулсны дараа "Link" стикерийг нэмнэ.</li>
            <li>Хуулагдсан линкээ стикер дээрээ наана.</li>
          </ol>
        </div>
        <Button onClick={handleShare} disabled={isGenerating || !ownerData} className="w-full font-bold" size="lg">
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-2 h-4 w-4" />
          )}
          Story-ны зураг үүсгэх
        </Button>
      </div>
    </div>
  );
}
