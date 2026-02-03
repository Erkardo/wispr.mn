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

    // Auto-copy the link
    if (ownerData?.shareUrl) {
        navigator.clipboard.writeText(ownerData.shareUrl);
        toast({
          title: 'Линк хуулагдлаа!',
          description: 'Story дээрээ "Link" стикерт наахад бэлэн.',
        });
    } else {
        toast({
            title: 'Линк олдсонгүй',
            description: 'Story-ны зургийг үүсгэж байна. Та линкээ гараар хуулна уу.',
            variant: 'default'
        });
    }

    try {
      const dataUrl = await htmlToImage.toPng(storyRef.current, {
        cacheBust: true,
        pixelRatio: 2, // for better quality
      });

      const blob = await fetch(dataUrl).then(res => res.blob());
      const file = new File([blob], "wispr-story.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Надад нэг сайхан үг үлдээгээрэй!',
        });
      } else {
        const link = document.createElement('a');
        link.download = 'wispr-story.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: 'Зураг татагдлаа!',
          description: 'Story дээрээ хуваалцаарай.',
        });
      }
    } catch (error) {
      console.error('Зураг үүсгэхэд алдаа гарлаа:', error);
      toast({
        title: 'Алдаа гарлаа',
        description: 'Зураг үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.',
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
