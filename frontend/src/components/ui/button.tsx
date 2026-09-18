import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-[#003366] text-white hover:bg-[#002244] border border-[#002244]",
        destructive: "bg-[#800000] text-white hover:bg-[#660000] border border-[#660000]",
        outline:
          "border border-slate-300 dark:border-slate-700 bg-background text-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
        secondary: "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700",
        ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground",
        link: "text-[#003366] dark:text-sky-400 underline-offset-4 hover:underline normal-case",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 rounded-[2px] px-2.5 text-[11px]",
        lg: "h-9 rounded-[2px] px-5 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

