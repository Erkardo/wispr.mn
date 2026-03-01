import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence } from 'framer-motion';

const KINDNESS_QUOTES = [
  "Таны энэ үгс хэн нэгний өдрийг гэрэлтүүлнэ. ✨",
  "Сайхан үг сэтгэлийн эм болдог. 💛",
  "Та гайхалтай байлаа! 🌟",
  "Баярлалаа, таны wispr хэн нэгнийг маш их инээлгэх болно. 😊",
  "Positive vibes only! 🌈",
  "Тэр энэ үгсийг сонсоод ямар их баярлах бол доо. 😌"
];

export function ComplimentSentSuccess() {
  const [quote, setQuote] = useState("");
  const [showPlane, setShowPlane] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    setQuote(KINDNESS_QUOTES[Math.floor(Math.random() * KINDNESS_QUOTES.length)]);

    // Initial plane swoosh vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Sequence: show plane drawing -> fade plane -> big pop success
    const planeTimer = setTimeout(() => {
      setShowPlane(false);
      setShowConfetti(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 100, 30, 200, 100]); // Success pattern vibrations
      }
    }, 1800);

    return () => clearTimeout(planeTimer);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-1000">

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.15}
            colors={['#8b5cf6', '#a78bfa', '#fcd34d', '#ffffff']}
          />
        </div>
      )}

      <div className="relative w-full max-w-sm aspect-square flex items-center justify-center mb-4">

        {/* The Paper Plane Throw */}
        <AnimatePresence>
          {showPlane && (
            <motion.div
              key="plane"
              initial={{ x: -150, y: 150, scale: 0.1, rotate: -45, opacity: 0 }}
              animate={{
                x: [null, 0, 100, 250],
                y: [null, -50, -100, -300],
                scale: [null, 1.2, 1.5, 0.5],
                rotate: [null, 0, 30, 60],
                opacity: [0, 1, 1, 0]
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute z-20"
            >
              {/* Using a custom sleek plane icon or just Lucide Send but huge */}
              <div className="bg-primary p-6 rounded-full shadow-[0_20px_40px_rgba(139,92,246,0.6)]">
                <Send className="w-16 h-16 text-white translate-x-1 -translate-y-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Success Pop - appears after plane leaves */}
        <AnimatePresence>
          {!showPlane && (
            <motion.div
              key="success"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                <h2 className="text-6xl md:text-7xl">💛</h2>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground drop-shadow-sm">Амжилттай нислээ!</h1>
              <p className="text-lg font-medium text-muted-foreground !leading-relaxed px-4 text-balance">
                {quote}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The Viral Loop (Invite sender) */}
      <AnimatePresence>
        {!showPlane && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="w-full max-w-sm mt-8 space-y-4"
          >
            {/* Massive CTA */}
            <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/20 dark:border-white/5 shadow-2xl space-y-5 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />

              <h3 className="font-extrabold text-xl text-foreground text-balance relative z-10">Тан руу ч гэсэн гоё үгс ирэх болно! 👀</h3>
              <p className="text-sm text-foreground/70 font-medium relative z-10 px-2 text-balance">
                Өөрийн Wispr линкийг хуваалцаад хүмүүс таны юунд хамгийн их дуртай байдгийг олж мэдээрэй.
              </p>

              <Button asChild className="w-full h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_8px_30px_rgba(139,92,246,0.4)] hover:-translate-y-1 transition-all active:scale-95 group relative z-10">
                <Link href="/create">
                  Өөрийн линк үүсгэх <Sparkles className="ml-2 w-5 h-5 text-yellow-300 group-hover:rotate-12 transition-transform" />
                </Link>
              </Button>
            </div>

            <Button variant="ghost" onClick={() => window.location.reload()} className="w-full h-12 rounded-xl font-bold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all">
              Дахиад нэгийг бичих
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
