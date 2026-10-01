import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "glass" | "ghost" | "danger" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-[12px] text-xs font-medium tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.98]";

    const variants = {
      // Primary: Apple / Linear signature crisp white on black
      primary:
        "bg-white text-black font-semibold hover:bg-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)]",
      // Secondary / Glass: subtle elevated dark surface
      secondary:
        "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08] shadow-sm",
      glass:
        "bg-white/[0.035] backdrop-blur-md text-white/90 hover:bg-white/[0.07] border border-white/[0.08]",
      outline:
        "border border-white/[0.1] bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white",
      ghost:
        "text-white/60 hover:text-white hover:bg-white/[0.04]",
      danger:
        "bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25",
    };

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 px-3 text-[11px]",
      lg: "h-11 px-6 text-sm font-semibold",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
