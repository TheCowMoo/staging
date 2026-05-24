import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#2B343F] via-[#1F262F] to-[#171C22] border border-border text-white shadow-[0_12px_24px_-10px_rgba(0,0,0,0.55)] hover:from-[#343d4a] hover:to-[#202833] focus-visible:ring-white/15 focus-visible:border-white/10",
        destructive:
          "bg-[#8B0000] text-white hover:bg-[#a90000] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-border bg-white/5 text-white shadow-[inset_0_0_0_1px_rgba(225,228,230,0.08)] hover:bg-white/10",
        secondary:
          "bg-[#2F3741] text-white hover:bg-[#333f4d]",
        ghost:
          "bg-transparent text-white hover:bg-white/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
