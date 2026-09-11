"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold " +
    "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none " +
    "disabled:opacity-50 active:scale-[0.98] [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-moss text-white shadow-soft hover:bg-moss-dark hover:shadow-lift",
        forest: "bg-forest text-white shadow-soft hover:bg-forest-light hover:shadow-lift",
        accent: "bg-teal text-white shadow-soft hover:bg-teal-dark hover:shadow-lift",
        outline: "border-2 border-forest/20 bg-transparent text-forest hover:border-forest/40 hover:bg-white",
        secondary: "bg-white text-forest shadow-soft hover:bg-cream-100",
        ghost: "text-forest hover:bg-forest/[0.06]",
        link: "text-moss underline-offset-4 hover:underline",
        danger: "bg-clay text-white shadow-soft hover:bg-clay-dark",
        whatsapp: "bg-[#25D366] text-white shadow-soft hover:bg-[#1EBE5A]",
      },
      size: {
        // Every size clears the 48px minimum tap target except `xs`, which is
        // only used inside rows that already have a large parent target.
        sm: "h-11 px-4 text-[13px]",
        md: "h-12 px-6",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-12 w-12",
        xs: "h-9 px-3 text-xs",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, block, asChild = false, loading, loadingText, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, block, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, block, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
