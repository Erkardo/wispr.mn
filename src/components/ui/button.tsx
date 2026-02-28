import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_10px_20px_-5px_rgba(139,92,246,0.3)] hover:shadow-[0_15px_25px_-5px_rgba(139,92,246,0.4)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg",
        outline:
          "border-2 border-primary/20 bg-background hover:bg-primary/5 text-primary hover:border-primary/40",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5",
        ghost: "hover:bg-primary/5 text-muted-foreground hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md",
        premium: "bg-gradient-to-br from-primary via-primary to-purple-700 text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:brightness-110",
        glass: "bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-xl hover:bg-white/20",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-10 rounded-xl px-4",
        lg: "h-16 rounded-[2rem] px-10 text-base font-black tracking-wide",
        icon: "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
