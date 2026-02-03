import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

export function Header({
  title,
  className,
  showBackButton = true,
}: {
  title: string;
  className?: string;
  showBackButton?: boolean;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75',
        className
      )}
    >
      <div className="container flex h-16 max-w-2xl items-center justify-between px-4">
        <Link href="/" passHref>
          <Logo className="w-24 text-primary" />
        </Link>
        
        <h1 className="text-lg font-bold truncate">
          {title}
        </h1>
      </div>
    </header>
  );
}
