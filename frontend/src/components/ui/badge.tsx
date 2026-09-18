import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-bold tracking-wide transition-colors uppercase select-none",
  {
    variants: {
      variant: {
        default: "border-[#003366] bg-[#003366]/10 text-[#003366] dark:border-sky-400/50 dark:bg-sky-950/50 dark:text-sky-300",
        secondary:
          "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
        destructive:
          "border-[#800000] bg-[#800000]/10 text-[#800000] dark:border-red-500/50 dark:bg-red-950/50 dark:text-red-300",
        outline: "border-slate-300 dark:border-slate-700 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

