import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/firebase';

const KINDNESS_QUOTES = [
  "Таны энэ үгс хэн нэгний өдрийг гэрэлтүүлнэ. ✨",
  "Сайхан үг сэтгэлийн эм болдог. 💛",
  "Та гайхалтай байлаа! 🌟",
  "Баярлалаа, таны wispr хэн нэгнийг маш их инээлгэх болно. 😊",
  "Positive vibes only! 🌈",
  "Тэр энэ үгсийг сонсоод ямар их баярлах бол доо. 😌"
];

// Premium SVG Paper Plane (Custom colorful design)
const PremiumPaperPlane = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 20px 30px rgba(139, 92, 246, 0.6))" }}>
    {/* Left Fold */}
    <path d="M10 40 L90 10 L45 55 Z" fill="#E0E7FF" />
    <path d="M10 40 L45 55 L40 65 Z" fill="#C7D2FE" />

    {/* Right Fold */}
    <path d="M90 10 L45 55 L40 65 Z" fill="#A5B4FC" />
    <path d="M90 10 L40 65 L70 90 Z" fill="#818CF8" />

    {/* Darker underbelly / shadow */}
    <path d="M70 90 L40 65 L60 80 Z" fill="#6366F1" />

    {/* Main right wing */}
    <path d="M90 10 L60 80 L70 90 Z" fill="#4F46E5" />

    {/* Highlights */}
    <path d="M90 10 L10 40" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
    <path d="M90 10 L70 90" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    <path d="M90 10 L45 55" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    <path d="M90 10 L40 65" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
  </svg>
);

export function ComplimentSentSuccess() {
  const [quote, setQuote] = useState("");
  const [showPlane, setShowPlane] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const { user } = useUser();

  const isUserLoggedIn = user && !user.isAnonymous;

  useEffect(() => {
    setQuote(KINDNESS_QUOTES[Math.floor(Math.random() * KINDNESS_QUOTES.length)]);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 50, 20]);
    }

    const planeTimer = setTimeout(() => {
      setShowPlane(false);
      setShowConfetti(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 100, 30, 200, 100]);
      }
    }, 2800);

    return () => clearTimeout(planeTimer);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[75vh] px-4 animate-in fade-in duration-1000 overflow-hidden relative">

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={600}
            gravity={0.12}
            colors={['#8B5CF6', '#EC4899', '#FCD34D', '#10B981', '#3B82F6', '#FFFFFF']}
          />
        </div>
      )}

      {/* Majestic Flight Path Backdrop */}
      <AnimatePresence>
        {showPlane && (
          <motion.svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 400 600"
            preserveAspectRatio="none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <defs>
              <linearGradient id="flightGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                <stop offset="50%" stopColor="#ec4899" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
              </linearGradient>
            </defs>
            <motion.path
              d="M 50,550 C 150,450 50,250 350,50"
              fill="none"
              stroke="url(#flightGradient)"
              strokeWidth="4"
              strokeDasharray="10 12"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 1] }}
              transition={{ duration: 2.2, ease: "easeInOut" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>

      <div className="relative w-full max-w-sm aspect-square flex items-center justify-center mb-6">

        {/* The Premium Paper Plane Fly-out */}
        <AnimatePresence>
          {showPlane && (
            <motion.div
              key="plane"
              initial={{ x: -180, y: 250, scale: 0.2, rotate: -35, opacity: 0 }}
              animate={{
                x: [-180, -50, 50, 200, 300],
                y: [250, 100, -50, -200, -350],
                scale: [0.2, 1, 1.3, 0.8, 0.2],
                rotate: [-35, 10, 30, 50, 60],
                opacity: [0, 1, 1, 1, 0],
              }}
              transition={{
                duration: 2.5,
                ease: [0.22, 1, 0.36, 1], // Custom bouncy ease
                times: [0, 0.3, 0.6, 0.8, 1]
              }}
              className="absolute z-20"
            >
              <PremiumPaperPlane className="w-28 h-28" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Success State Typography - Appears elegantly */}
        <AnimatePresence>
          {!showPlane && (
            <motion.div
              key="success"
              initial={{ scale: 0.5, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 150, delay: 0.1 }}
              className="flex flex-col items-center text-center space-y-6 w-full"
            >
              <div className="relative mb-2">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-accent/30 rounded-full blur-[40px] animate-pulse" />
                <motion.h2
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="text-7xl md:text-8xl relative z-10"
                >
                  ✨
                </motion.h2>
              </div>

              <div className="space-y-3 px-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground drop-shadow-sm bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                  Гайхалтай!
                </h1>
                <p className="text-xl font-semibold text-muted-foreground/90 leading-snug px-4 text-balance max-w-[280px] mx-auto">
                  Таны илгээсэн онгоц амжилттай нислээ.
                </p>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                  className="text-base text-primary/80 font-medium italic mt-2"
                >
                  "{quote}"
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The Viral Loop Box (Smart State checking) */}
      <AnimatePresence>
        {!showPlane && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", damping: 16 }}
            className="w-full max-w-sm mt-4 space-y-4"
          >
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl p-6 rounded-[2rem] border-2 border-primary/10 dark:border-white/5 shadow-2xl relative overflow-hidden text-center group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-[50px] transition-transform duration-1000 group-hover:scale-150" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent/20 rounded-full blur-[50px] transition-transform duration-1000 group-hover:scale-150" />

              <h3 className="font-extrabold text-2xl text-foreground text-balance relative z-10 tracking-tight leading-tight mb-2">
                {isUserLoggedIn ? 'Таны линк бэлэн байна! 👀' : 'Тан руу ч гэсэн гоё үгс ирэх болно! 👀'}
              </h3>
              <p className="text-sm text-foreground/70 font-medium relative z-10 px-1 text-balance mb-6">
                {isUserLoggedIn
                  ? 'Та өөрийн линкээ стори дээрээ тавиад хүмүүс таны юунд хамгийн их дуртайг олж мэдээрэй.'
                  : 'Өөрийн Wispr линкийг хуваалцаад хүмүүс таны юунд хамгийн их дуртай байдгийг олж мэдээрэй.'}
              </p>

              <Button asChild className="w-full h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-primary to-accent hover:opacity-[0.85] shadow-[0_8px_30px_rgba(139,92,246,0.3)] hover:-translate-y-1 transition-all active:scale-[0.97] relative z-10 overflow-hidden">
                <Link href={isUserLoggedIn ? "/profile" : "/create"}>
                  <span className="relative z-10 flex items-center">
                    {isUserLoggedIn ? 'Линкээ хуулах' : 'Өөрийн линк үүсгэх'}
                    {isUserLoggedIn ? <ArrowRight className="ml-2 w-5 h-5" /> : <Sparkles className="ml-2 w-5 h-5 text-yellow-300 group-hover:rotate-12 transition-transform" />}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Link>
              </Button>
            </div>

            <Button variant="ghost" onClick={() => window.location.reload()} className="w-full h-12 rounded-xl font-bold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all outline-none">
              Дахиад нэгийг бичих
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
