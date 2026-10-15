'use client'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 active:scale-[.97]',
  {
    variants: {
      variant: {
        default: 'bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]',
        secondary: 'bg-[var(--bg-muted)] text-[var(--ink)] hover:bg-[var(--bg-subtle)]',
        ghost: 'text-[var(--ink-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
        danger: 'bg-[var(--danger)] text-white hover:opacity-90',
        outline: 'border border-[var(--border)] bg-transparent text-[var(--ink)] hover:bg-[var(--bg-muted)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = 'Button'
export { buttonVariants }
