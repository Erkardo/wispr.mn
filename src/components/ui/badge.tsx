import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)]",
        secondary:
          "border-transparent bg-secondary/50 backdrop-blur-md text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline: "border-primary/20 text-primary bg-primary/5",
        premium: "border-none bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
