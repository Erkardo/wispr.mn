import { forwardRef } from "react"
import { Link2 } from "lucide-react"
import { Logo } from "@/components/Logo"

export const StoryPreview = forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <div

            ref={ref}
            className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-purple-400 to-indigo-600 p-6 flex flex-col justify-between items-center text-white text-center"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
        >
            {/* Background elements */}
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2"></div>

            {/* Top Text */}
            <div className="relative z-10 w-full pt-16">
                <h3 className="font-black text-4xl tracking-tighter drop-shadow-lg">Сэтгэлийн үгээ</h3>
                <h3 className="font-black text-4xl tracking-tighter drop-shadow-lg -mt-2">надад шивнээч</h3>
                <p className="text-white/80 mt-2 font-medium">Нэрээ мэдэгдэлгүйгээр 💛</p>
            </div>


            {/* Center Link Sticker Placeholder */}
            <div className="relative z-10 my-auto flex flex-col items-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-1 text-sm font-medium shadow-md border border-white/30">
                    <Link2 className="w-3.5 h-3.5 opacity-80" />
                    <span>Линкээ энд...</span>
                </div>
            </div>

            {/* Bottom Logo */}
            <div className="relative z-10 pb-4">
                <Logo className="w-24 text-white/80" />
            </div>
        </div>
    )
});
StoryPreview.displayName = "StoryPreview";
