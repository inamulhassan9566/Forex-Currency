import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-11 w-full rounded-[12px] border border-white/[0.08] bg-[#0E0E10] px-3.5 py-2 text-xs text-white/90 transition-all duration-150 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer appearance-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
