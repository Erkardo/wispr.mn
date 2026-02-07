import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, WalletCards, Sparkles } from 'lucide-react';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

const KINDNESS_QUOTES = [
  "Таны энэ үгс хэн нэгний өдрийг гэрэлтүүлнэ. ✨",
  "Сайхан үг сэтгэлийн эм. 💛",
  "Та гайхалтай байлаа! 🌟",
  "Баярлалаа, таны wispr хэн нэгнийг инээлгэх болно. 😊",
  "Positive vibes only! 🌈"
];

export function ComplimentSentSuccess() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    setQuote(KINDNESS_QUOTES[Math.floor(Math.random() * KINDNESS_QUOTES.length)]);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="text-center p-8 bg-green-50 dark:bg-green-900/10 rounded-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500 border-2 border-green-100 dark:border-green-900/50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-green-200 blur-xl opacity-50 rounded-full animate-pulse" />
          <CheckCircle className="w-20 h-20 text-green-500 relative z-10" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-green-800 dark:text-green-300 tracking-tight">Амжилттай!</h3>
          <p className="text-green-700 dark:text-green-400 mt-2 font-medium text-lg">{quote}</p>
        </div>
      </div>

      <div className="w-full space-y-3 pt-4">
        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">Та ч бас өөрийн гэсэн wispr линкээ үүсгээд, найзуудаасаа сэтгэлийн үгсийг нь сонсоорой.</p>
          <Button asChild className="w-full font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5" size="lg">
            <Link href={`/create`}>
              <Sparkles className="mr-2 h-4 w-4 text-yellow-300" />
              Өөрийн wispr линк авах <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Button variant="ghost" onClick={() => window.location.reload()} className="w-full text-muted-foreground hover:text-foreground">
          Ахин wispr илгээх
        </Button>
      </div>
    </div>
  );
}
