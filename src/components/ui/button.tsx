import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-white shadow-md hover:shadow-glow hover:scale-[1.03] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg hover:scale-[1.02]",
        outline:
          "border backdrop-blur-xl shadow-inner-glass hover:shadow-glow hover:scale-[1.02] hover:border-accent/40",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md hover:scale-[1.02]",
        ghost:
          "hover:scale-[1.02] rounded-xl",
        link:
          "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDefault = variant === "default" || variant === undefined;
    const isOutline = variant === "outline";
    const isGhost = variant === "ghost";

    const glassStyles: React.CSSProperties = isDefault
      ? {
          background: "linear-gradient(135deg, #C59DD9 0%, #7A3F91 100%)",
          ...style,
        }
      : isOutline
      ? {
          background: "var(--glass-bg-medium)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "var(--glass-border-strong)",
          ...style,
        }
      : isGhost
      ? {
          background: "transparent",
          ...style,
        }
      : style || {};

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={glassStyles}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
