import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'glass';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          {
            "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg": variant === 'default',
            "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900": variant === 'outline',
            "hover:bg-slate-100 hover:text-slate-900 text-slate-600": variant === 'ghost',
            "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]": variant === 'glass',
            "h-11 px-6 py-2": size === 'default',
            "h-9 rounded-md px-3": size === 'sm',
            "h-14 rounded-2xl px-8 text-base": size === 'lg',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
