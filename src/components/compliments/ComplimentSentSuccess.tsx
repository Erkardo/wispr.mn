import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Sparkles, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const KINDNESS_QUOTES = [
  "Таны энэ үгс хэн нэгний өдрийг гэрэлтүүлнэ. ✨",
  "Сайхан үг сэтгэлийн эм. 💛",
  "Та гайхалтай байлаа! 🌟",
  "Баярлалаа, таны wispr хэн нэгнийг инээлгэх болно. 😊",
  "Positive vibes only! 🌈"
];

export function ComplimentSentSuccess() {
  const [quote, setQuote] = useState("");
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    setQuote(KINDNESS_QUOTES[Math.floor(Math.random() * KINDNESS_QUOTES.length)]);

    // Animate plane for 800ms, then show check and confetti
    const timer = setTimeout(() => {
      setShowCheck(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]); // success haptic pattern
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center p-8 bg-green-50 dark:bg-green-900/10 rounded-[2rem] flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500 border border-green-200 dark:border-green-900/50 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 to-transparent dark:from-green-900/20" />

      <div className="flex flex-col items-center gap-4 h-32 justify-center relative z-10 w-full">
        <AnimatePresence mode="wait">
          {!showCheck ? (
            <motion.div
              key="plane"
              initial={{ x: -200, y: 150, scale: 0.2, opacity: 0, rotate: -45 }}
              animate={{
                x: [null, 0, 250],
                y: [null, 0, -200],
                scale: [null, 1.5, 0.2],
                opacity: [0, 1, 0],
                rotate: [null, 0, 45]
              }}
              transition={{
                duration: 1,
                ease: "easeInOut",
                times: [0, 0.5, 1]
              }}
              className="absolute"
            >
              <Send className="w-16 h-16 text-primary drop-shadow-[0_10px_20px_rgba(0,0,0,0.2)]" />
            </motion.div>
          ) : (
            <motion.div
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.6, damping: 12 }}
              className="relative flex flex-col items-center"
            >
              <div className="absolute inset-0 bg-green-200 dark:bg-green-800 blur-2xl opacity-60 rounded-full animate-pulse" />
              <CheckCircle className="w-20 h-20 text-green-500 relative z-10 drop-shadow-md" />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 w-full"
              >
                <h3 className="text-2xl font-black text-green-800 dark:text-green-300 tracking-tight">Амжилттай!</h3>
                <p className="text-green-700 dark:text-green-400 mt-2 font-medium text-lg leading-relaxed">{quote}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="w-full space-y-4 pt-8 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: showCheck ? 1 : 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="bg-white/60 dark:bg-black/40 p-5 rounded-2xl backdrop-blur-sm border border-white/20">
          <p className="text-sm text-foreground/80 mb-4 font-medium">Та ч бас өөрийн гэсэн wispr линкээ үүсгээд, найзуудаасаа сэтгэлийн үгсийг нь сонсоорой.</p>
          <Button asChild className="w-full font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all h-14 text-base rounded-xl">
            <Link href={`/create`}>
              <Sparkles className="mr-2 h-5 w-5 text-yellow-300" />
              Өөрийн wispr линк авах <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        <Button variant="ghost" onClick={() => window.location.reload()} className="w-full font-bold text-muted-foreground hover:text-foreground h-12">
          Ахин wispr илгээх
        </Button>
      </motion.div>
    </div>
  );
}
