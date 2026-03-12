import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[background,color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[linear-gradient(180deg,#20242a_0%,#12161b_100%)] text-white dark:text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_rgba(10,13,17,0.24)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#272c33_0%,#171c22_100%)] dark:hover:text-white',
        prominent: 'bg-[linear-gradient(180deg,#20242a_0%,#12161b_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_rgba(10,13,17,0.24)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#272c33_0%,#171c22_100%)] dark:border dark:border-white/45 dark:bg-[linear-gradient(180deg,rgba(248,250,252,0.99)_0%,rgba(222,229,237,0.97)_100%)] dark:text-slate-950 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_34px_rgba(0,0,0,0.34)] dark:hover:bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(232,238,244,1)_100%)] dark:hover:text-slate-950',
        destructive: 'bg-[linear-gradient(180deg,#d5736b_0%,#b24f48_100%)] text-white dark:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_24px_rgba(144,49,43,0.24)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#dc8078_0%,#bc5952_100%)]',
        outline: 'metal-pill bg-transparent text-foreground dark:text-slate-100 hover:-translate-y-0.5 hover:text-[#12161b] dark:hover:bg-slate-800/80 dark:hover:text-slate-100',
        secondary: 'bg-[linear-gradient(180deg,rgba(233,237,241,0.98)_0%,rgba(210,216,224,0.98)_100%)] text-secondary-foreground dark:bg-[linear-gradient(180deg,rgba(59,70,82,0.96)_0%,rgba(37,45,55,0.96)_100%)] dark:text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_22px_rgba(18,22,27,0.07)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(0,0,0,0.24)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(242,245,248,1)_0%,rgba(218,224,231,1)_100%)] dark:hover:bg-[linear-gradient(180deg,rgba(73,84,97,0.98)_0%,rgba(44,52,63,0.98)_100%)]',
        ghost: 'text-[#5d6671] dark:text-slate-300 hover:bg-white/55 hover:text-[#161a20] dark:hover:bg-slate-800 dark:hover:text-slate-100',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
