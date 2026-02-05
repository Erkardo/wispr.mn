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
                "relative aspect-[9/16] w-full overflow-hidden flex flex-col justify-between items-center text-center shadow-2xl",
                mode === 'preview' ? "max-w-sm mx-auto rounded-2xl" : "rounded-none",
                `bg-gradient-to-br ${design.gradient}`,
                design.textColor
            )}
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
        >
            {/* Background elements - Subtle texture or shapes */}
            <div className="absolute inset-0 bg-black/5"></div>
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

            {/* Simulated Instagram Top Bar (Static for Capture, Animated overlay in Preview) */}
            <div className="absolute top-4 left-0 right-0 px-4 flex justify-between items-center z-20 text-white opacity-90">
                <X className="w-7 h-7" />
                <div className="flex gap-4">
                    <div className="relative">
                        <Type className="w-6 h-6" />
                    </div>
                    <div className="relative">
                        <Smile className="w-6 h-6" />

                        {/* INSTRUCTION STEP 1: Cursor pulsing on Sticker Icon */}
                        {mode === 'preview' && (
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in duration-500 delay-300 fill-mode-forwards" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                                <div className="w-3 h-3 bg-white/50 rounded-full animate-ping absolute inset-0"></div>
                                <div className="w-3 h-3 bg-white rounded-full relative shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                            </div>
                        )}
                    </div>
                    <Sparkles className="w-6 h-6" />
                    <MoreHorizontal className="w-6 h-6" />
                </div>
            </div>


            {/* INSTRUCTIONAL OVERLAY (Only in preview mode) */}
            {mode === 'preview' && (
                <div className="absolute inset-0 z-50 pointer-events-none font-sans">

                    {/* Step 2: Link Sticker Selection Simulation */}
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-1000" style={{ animationFillMode: 'forwards', animationDelay: '1.2s' }}>
                        <div className="relative group">
                            <div className="bg-white text-[#0095F6] p-2.5 rounded-lg shadow-2xl border-2 border-white scale-110 flex items-center gap-2">
                                <LinkIcon className="w-5 h-5" />
                                <span className="text-xs font-bold text-black/80">LINK</span>
                            </div>
                            {/* Cursor clicking the link */}
                            <div className="absolute -bottom-4 right-0 text-white drop-shadow-lg animate-bounce duration-1000">
                                <MousePointerClick className="w-6 h-6 fill-white text-black" />
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Paste Tooltip */}
                    <div className="absolute top-[48%] left-1/2 -translate-x-1/2 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-2000" style={{ animationFillMode: 'forwards', animationDelay: '2.5s' }}>
                        <div className="relative">
                            <div className="bg-gray-800/90 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-white/20 mb-2 whitespace-nowrap">
                                Paste Link here
                            </div>
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-gray-800/90 border-r-[6px] border-r-transparent mx-auto"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Text */}
            <div className="relative z-10 w-full pt-20 px-6 mt-8">
                <h3 className="font-black text-5xl tracking-tighter drop-shadow-lg leading-[0.9]">
                    Сэтгэлийн үгээ
                </h3>
                <h3 className="font-black text-5xl tracking-tighter drop-shadow-lg leading-[0.9] mt-1">
                    надад шивнээч
                </h3>
                <p className={cn("mt-4 font-medium text-lg opacity-90", design.textColor)}>
                    Нэрээ мэдэгдэлгүйгээр 💛
                </p>
            </div>


            {/* Center Link Sticker Placeholder */}
            <div className="relative z-10 my-auto flex flex-col items-center transform scale-110">
                <div className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-transform",
                    design.stickerStyle === 'glass' && "bg-white/20 backdrop-blur-md border border-white/40 text-inherit",
                    design.stickerStyle === 'solid' && (design.stickerColor || "bg-white text-black"),
                    design.stickerStyle === 'outline' && "border-2 border-white bg-transparent text-white"
                )}>
                    <div className="bg-blue-500 rounded-full p-1">
                        <LinkIcon className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-semibold text-sm opacity-90">wispr.mn</span>
                </div>

                {/* Fake NGL "Send me a generic message" look */}
                {mode === 'preview' && (
                    <div className="mt-4 bg-white/90 text-black px-6 py-4 rounded-xl shadow-xl max-w-[80%] backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🤫</span>
                            <span className="font-bold">Надад wispr илгээгээрэй!</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Logo */}
            <div className="relative z-10 pb-8 flex flex-col items-center gap-2 opacity-80">
                <Logo className="w-24 text-current" />
                <span className="text-[10px] font-medium tracking-widest uppercase opacity-70">wispr.mn</span>
            </div>
        </div>
    )
});
StoryPreview.displayName = "StoryPreview";
