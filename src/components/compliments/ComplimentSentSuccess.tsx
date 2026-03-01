import Link from 'next/link';
import { Sparkles, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/firebase';

export function ComplimentSentSuccess() {
  const [showContent, setShowContent] = useState(false);
  const { user } = useUser();
  const isUserLoggedIn = user && !user.isAnonymous;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 80, 30]);
    }
    const t = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-4">

      {/* Animated Check */}
      <div className="relative mb-8">
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
            transform: 'scale(2)',
            filter: 'blur(16px)',
          }}
        />
        {/* Circle with animated checkmark */}
        <div
          className="relative z-10 flex items-center justify-center"
          style={{
            width: '88px', height: '88px',
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            borderRadius: '50%',
            boxShadow: '0 12px 32px rgba(124,58,237,0.4)',
          }}
        >
          <svg viewBox="0 0 52 52" fill="none" className="w-11 h-11">
            <motion.path
              d="M14 27 L22 35 L38 17"
              stroke="white"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
        </div>
      </div>

      <AnimatePresence>
        {showContent && (
          <motion.div
            key="content"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 22, stiffness: 120 }}
            className="flex flex-col items-center text-center w-full"
          >
            <h1
              className="font-black tracking-tight mb-2"
              style={{ fontSize: '30px', color: '#18181b' }}
            >
              Илгээгдлээ ✨
            </h1>
            <p className="text-[15px] text-zinc-500 leading-relaxed mb-9" style={{ maxWidth: '240px' }}>
              Таны мессеж нэргүйгээр хүрч очно. Баяр хүргэе!
            </p>

            {/* Upsell card */}
            <div
              className="w-full p-6 text-center mb-3"
              style={{
                background: 'rgba(255,255,255,0.85)',
                border: '1.5px solid rgba(139,92,246,0.18)',
                borderRadius: '24px',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(139,92,246,0.1)',
              }}
            >
              {/* Shimmer top */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }}
              />
              <h3 className="font-black text-[18px] text-zinc-900 mb-1.5">
                {isUserLoggedIn ? 'Линкээ хуваалц' : 'Өөрийн линк аваарай'}
              </h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed mb-5 px-1">
                {isUserLoggedIn
                  ? 'Өөрийн линкийг стори дээрээ тавиад бусдын санааг сонс.'
                  : 'Өөрийн линктэй болоод та ч ийм гоё зурвас хүлээн авах боломжтой.'}
              </p>
              <Link
                href={isUserLoggedIn ? '/profile' : '/create'}
                className="flex items-center justify-center gap-2.5 font-black text-white w-full transition-all active:scale-[0.97]"
                style={{
                  height: '52px',
                  borderRadius: '16px',
                  fontSize: '16px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
                  boxShadow: '0 6px 20px rgba(124,58,237,0.35)',
                }}
              >
                {isUserLoggedIn
                  ? <><Share2 className="w-4 h-4" />Линкээ хуулах</>
                  : <><Sparkles className="w-4 h-4" />Өөрийнхийгөө нэзх</>
                }
              </Link>
            </div>

            {/* Send again */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full h-12 font-bold text-[15px] transition-all active:scale-[0.98]"
              style={{ color: '#8b5cf6', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Шинээр зурвас бичих
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
