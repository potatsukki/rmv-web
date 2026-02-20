import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export function BrandLogo({ className, alt = 'RMV Stainless logo' }: BrandLogoProps) {
  return (
    <img
      src="/1.jpg"
      alt={alt}
      className={cn('shrink-0 rounded-full object-cover', className)}
      decoding="async"
    />
  );
}
