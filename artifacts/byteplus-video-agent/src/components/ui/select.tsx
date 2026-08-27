import * as React from "react"
import { Select as BaseSelect } from "@radix-ui/react-select"

// Since we are mocking some complex radix UI for speed, we will use native select or a simple controlled select 
// for the intense cinematic UI to avoid missing parts and stay fast.
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`flex h-10 w-full items-center justify-between rounded-sm border border-border bg-black/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-background text-foreground">
            {opt.label}
          </option>
        ))}
      </select>
    )
  }
)
Select.displayName = "Select"
