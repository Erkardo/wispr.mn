'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';

export function ComplimentSentSuccess() {
  return (
    <div className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-lg flex flex-col items-center gap-6 animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <div>
          <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Wispr амжилттай илгээгдлээ.</h3>
          <p className="text-green-700 dark:text-green-400 mt-1">Та ч бас өөрийн wispr-үүдийг хүлээж авч болно.</p>
        </div>
      </div>
      
      <div className="w-full space-y-2">
          <Button asChild className="w-full font-bold" size="lg">
              <Link href={`/create`}>
                  Өөрийн wispr линк авах <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
          </Button>
           <Button variant="ghost" onClick={() => window.location.reload()} className="w-full">
                Ахин wispr илгээх
           </Button>
      </div>
    </div>
  );
}
