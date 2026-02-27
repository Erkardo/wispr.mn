import { forwardRef } from "react"
import { Link2, MousePointerClick, ArrowUp, Link as LinkIcon, Smile, Type, Sparkles, X, MoreHorizontal } from "lucide-react"
import { Logo } from "@/components/Logo"
import { type StoryDesign } from "./story-designs"
import { cn } from "@/lib/utils"

interface StoryPreviewProps {
    mode: 'preview' | 'capture';
    design: StoryDesign;
}

export const StoryPreview = forwardRef<HTMLDivElement, StoryPreviewProps>(({ mode, design }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "relative flex-1 aspect-[9/16] w-full h-full overflow-hidden flex flex-col justify-between items-center text-center shadow-inner",
                "bg-gradient-to-br transition-colors duration-500",
                design.gradient,
                design.textColor
            )}
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
        >
            {/* Background elements - Subtle texture or shapes */}
            <div className="absolute inset-0 bg-black/5 mix-blend-overlay"></div>
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

            {/* Simulated Instagram Top Bar (Static for Capture, Animated overlay in Preview) */}
            <div className="absolute top-4 left-0 right-0 px-4 flex justify-between items-center z-20 text-white opacity-90 w-full">
                <X className="w-6 h-6 drop-shadow-md" />
                <div className="flex gap-4">
                    <div className="relative">
                        <Type className="w-5 h-5 drop-shadow-md" />
                    </div>
                    <div className="relative">
                        <Smile className="w-5 h-5 drop-shadow-md" />

                        {/* INSTRUCTION STEP 1: Cursor pulsing on Sticker Icon */}
                        {mode === 'preview' && (
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in duration-500 delay-300 fill-mode-forwards" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                                <div className="w-2.5 h-2.5 bg-white/50 rounded-full animate-ping absolute inset-0"></div>
                                <div className="w-2.5 h-2.5 bg-white rounded-full relative shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                            </div>
                        )}
                    </div>
                    <Sparkles className="w-5 h-5 drop-shadow-md" />
                    <MoreHorizontal className="w-5 h-5 drop-shadow-md" />
                </div>
            </div>


            {/* INSTRUCTIONAL OVERLAY (Only in preview mode) */}
            {mode === 'preview' && (
                <div className="absolute inset-0 z-50 pointer-events-none font-sans flex flex-col items-center justify-center">

                    {/* Step 2: Link Sticker Selection Simulation */}
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-1000" style={{ animationFillMode: 'forwards', animationDelay: '1.2s' }}>
                        <div className="relative group">
                            <div className="bg-white text-[#0095F6] p-2 rounded-lg shadow-2xl border-2 border-white scale-110 flex items-center gap-1.5">
                                <LinkIcon className="w-4 h-4" />
                                <span className="text-[10px] font-bold text-black/80">LINK</span>
                            </div>
                            {/* Cursor clicking the link */}
                            <div className="absolute -bottom-3 right-0 text-white drop-shadow-lg animate-bounce duration-1000">
                                <MousePointerClick className="w-5 h-5 fill-white text-black" />
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Paste Tooltip - Positioned exactly over the center sticker */}
                    <div className="absolute z-50 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-2000" style={{ animationFillMode: 'forwards', animationDelay: '2.5s', top: 'calc(50% - 40px)' }}>
                        <div className="relative flex flex-col items-center">
                            <div className="bg-[#18181b]/95 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] shadow-2xl border border-white/20 mb-1 whitespace-nowrap transform scale-110">
                                Paste Link here
                            </div>
                            {/* The little drop triangle pointing down to the sticker */}
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-[#18181b]/95 border-r-[6px] border-r-transparent mx-auto"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Text (Adjusting sizing for 360px container to perfectly scale up 3x) */}
            <div className="relative z-10 w-full pt-20 px-4 mt-8">
                <h3 className="font-extrabold text-[36px] tracking-tight drop-shadow-xl leading-none">
                    Сэтгэлийн үгээ
                </h3>
                <h3 className="font-extrabold text-[36px] tracking-tight drop-shadow-xl leading-none mt-0.5">
                    надад шивнээч
                </h3>
                <p className={cn("mt-4 font-semibold text-[15px] opacity-90 drop-shadow-md", design.textColor)}>
                    Нэрээ мэдэгдэлгүйгээр 💛
                </p>
            </div>


            {/* Center Link Sticker Placeholder (Where user places the Instagram LINK sticker) */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
                {/* Visual target area to help user place the sticker */}
                <div className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 rounded-[12px] shadow-2xl transform scale-125",
                    design.stickerStyle === 'glass' && "bg-white/20 backdrop-blur-md border border-white/40 text-inherit",
                    design.stickerStyle === 'solid' && (design.stickerColor || "bg-white text-black"),
                    design.stickerStyle === 'outline' && "border-2 border-white bg-transparent text-white drop-shadow-lg"
                )}>
                    <div className="bg-[#0095F6] rounded-full p-1 opacity-90 shadow-inner">
                        <LinkIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="font-bold text-[11px] opacity-90 tracking-wide">wispr.mn</span>
                </div>
            </div>

            {/* Bottom Logo */}
            <div className="relative z-10 pb-8 flex flex-col items-center gap-1.5 opacity-90 w-full">
                <Logo className="w-20 text-current drop-shadow-md" />
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-70 drop-shadow-sm">wispr.mn</span>
            </div>
        </div>
    )
});
StoryPreview.displayName = "StoryPreview";
