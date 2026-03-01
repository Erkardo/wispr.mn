import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/firebase';

export function ComplimentSentSuccess() {
  const [showCheck, setShowCheck] = useState(false);
  const { user } = useUser();
  const isUserLoggedIn = user && !user.isAnonymous;

  useEffect(() => {
    // Elegant tiny haptic pop
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 100, 30]);
    }

    // Very quick delay before drawing checkmark
    const t = setTimeout(() => {
      setShowCheck(true);
    }, 150);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in duration-700">

      {/* Sleek Animated Success Icon (Checkmark inside a circle) */}
      <div className="relative mb-10 mt-6">
        <div className="absolute inset-0 bg-green-500/10 dark:bg-green-400/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-white dark:bg-zinc-900 shadow-xl border border-zinc-100 dark:border-zinc-800 rounded-full p-6 z-10">
          <svg
            className="w-16 h-16 text-zinc-900 dark:text-white"
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.circle
              cx="26" cy="26" r="24"
              stroke="currentColor"
              strokeWidth="3.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
            {showCheck && (
              <motion.path
                d="M14 27 L22 35 L38 17"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              />
            )}
          </svg>
        </div>
      </div>

      <AnimatePresence>
        {showCheck && (
          <motion.div
            key="success-text"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.4 }}
            className="flex flex-col items-center text-center space-y-3 w-full max-w-sm mb-12"
          >
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Илгээгдлээ
            </h1>
            <p className="text-[15px] font-medium text-zinc-500 max-w-[260px] mx-auto leading-relaxed text-balance">
              Бид үүнийг нууцаар, мөн найдвартай хүргэж өгөх болно.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheck && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", damping: 20 }}
            className="w-full max-w-sm flex flex-col gap-3"
          >
            {/* Extremely Clean Viral Loop Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center relative overflow-hidden">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-2">
                {isUserLoggedIn ? 'Таны линк бэлэн байна' : 'Одоо таны ээлж'}
              </h3>
              <p className="text-[14px] text-zinc-500 font-medium mb-6 leading-relaxed px-2">
                {isUserLoggedIn
                  ? 'Та өөрийн линкээ стори дээрээ тавиад хүмүүс таны юунд хамгийн их дуртайг олж мэдээрэй.'
                  : 'Өөрийн линктэй болоод бусдаас бас ийм гоё үгс сонсоорой.'}
              </p>

              <Button asChild className="w-full h-14 rounded-2xl font-bold text-[16px] bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md active:scale-[0.98] transition-all">
                <Link href={isUserLoggedIn ? "/profile" : "/create"}>
                  {isUserLoggedIn ? 'Линкээ хуулах' : 'Өөрийнхийгөө нээх'}
                  {!isUserLoggedIn && <Sparkles className="ml-2 w-4 h-4 text-zinc-400 dark:text-zinc-600" />}
                </Link>
              </Button>
            </div>

            <Button variant="ghost" onClick={() => window.location.reload()} className="w-full h-12 rounded-[14px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white dark:hover:bg-zinc-800 active:scale-[0.98] transition-all">
              Шинээр зурвас бичих
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
