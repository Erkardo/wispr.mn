import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[120px] w-full rounded-3xl border-none bg-secondary/50 px-6 py-4 text-base ring-offset-background transition-all placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-inner resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
