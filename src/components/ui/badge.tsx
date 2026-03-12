import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
  {
    variants: {
      variant: {
        default: 'border-[#3e4752] bg-[linear-gradient(180deg,#20242a_0%,#14181c_100%)] text-primary-foreground',
        secondary: 'border-[#c6ccd4] bg-[linear-gradient(180deg,#eff2f5_0%,#d9dee5_100%)] text-secondary-foreground',
        destructive: 'border-[#c6665f] bg-[linear-gradient(180deg,#d5736b_0%,#b24f48_100%)] text-destructive-foreground',
        outline: 'border-[#c1c8d0] bg-white/45 text-foreground dark:border-slate-600 dark:bg-none dark:bg-slate-700/60 dark:text-slate-200',
        success: 'border-[#7b9c8a] bg-[linear-gradient(180deg,#7c9f8d_0%,#5f816f_100%)] text-white',
        warning: 'border-[#bf9360] bg-[linear-gradient(180deg,#c69b67_0%,#a97b45_100%)] text-white',
        info: 'border-[#7b97ae] bg-[linear-gradient(180deg,#88a4bb_0%,#667f95_100%)] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
