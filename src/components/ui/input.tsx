import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder:text-white/30 transition-all duration-150 focus:border-white/20 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
