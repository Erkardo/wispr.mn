'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Wispr-үүд', icon: Home },
  { href: '/create', label: 'Үүсгэх', icon: PlusCircle },
  { href: '/activity', label: 'Идэвх', icon: Bell },
  { href: '/profile', label: 'Профайл', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 mx-auto max-w-sm px-4">
      <nav className="flex h-16 items-center justify-around rounded-full border bg-background/80 p-2 backdrop-blur-lg shadow-2xl shadow-primary/10">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/' && pathname.startsWith('/confessions'));
          const finalHref = item.href === '/' && pathname.startsWith('/confessions') ? '/confessions' : item.href;

          return (
            <Link
              key={item.href}
              href={finalHref}
              className={cn(
                'relative flex items-center justify-center rounded-full transition-all duration-300 ease-in-out',
                'active:scale-95',
                isActive ? 'h-12 w-32 bg-primary text-primary-foreground shadow-lg' : 'h-12 w-12 text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-6 w-6 shrink-0" />
              <span className={cn(
                "ml-2 text-sm font-medium transition-all duration-300",
                isActive ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0 truncate'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
