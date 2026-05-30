
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-secondary hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        tcg: "relative p-[12px_36px] text-[0.9rem] font-extrabold uppercase tracking-[2px] text-white bg-black/30 backdrop-blur-md cursor-pointer overflow-hidden transition-all duration-300 flex items-center justify-center min-w-[200px] isolate border border-border/50 hover:shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:text-[#fbbf24] hover:border-transparent before:content-[''] before:absolute before:inset-0 before:-z-10 before:p-[2px] before:rounded-xl before:transition-all before:duration-300 before:bg-transparent before:tcg-mask hover:before:animate-border-spin after:content-[''] after:absolute after:top-0 after:left-[-100%] after:-z-10 after:w-1/2 after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:skew-x-[-20deg] after:transition-none hover:after:animate-shine hover:shadow-yellow-500/30 hover:shadow-lg hover:before:bg-[conic-gradient(from_var(--border-angle),#b45309,#f59e0b,#ffffff,#b45309)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    if (variant === 'tcg') {
        return (
          <Comp
            className={cn(buttonVariants({ variant, size, className }), 'rounded-xl')}
            ref={ref}
            {...props}
          />
        )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
