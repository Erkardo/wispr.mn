"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-[42px] items-center justify-center rounded-full bg-muted/40 p-1 text-muted-foreground shadow-inner border border-border/40 backdrop-blur-md relative",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative z-10 w-full",
        "data-[state=active]:text-foreground text-muted-foreground hover:text-foreground/80",
        className
      )}
      {...props}
    >
      {/* 
        Radix Tabs uses data-[state=active] on the Trigger when it is selected. 
        We use CSS to only show the motion.div when this trigger is active.
        This provides a seamless sliding pill effect across all tabs using the same layoutId string.
      */}
      <div className="absolute inset-0 hidden data-[state=active]:block">
        <motion.div
          layoutId="activeTabBadge"
          className="absolute inset-0 bg-background rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-border/50"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>
      <span className="relative z-20 flex items-center justify-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  );
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
