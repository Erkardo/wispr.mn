'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export function Header({
  title,
  className,
  showBackButton = true,
}: {
  title: string;
  className?: string;
  showBackButton?: boolean;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75',
        className
      )}
    >
      <div className="container flex h-16 max-w-2xl items-center gap-4 px-4">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-9 w-9"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" passHref className="flex items-center shrink-0">
            <Logo className="w-24 text-primary" />
          </Link>

        </div>

        <h1 className="flex-1 text-lg font-bold truncate text-right">
          {title}
        </h1>
      </div>
    </header>
  );
}

