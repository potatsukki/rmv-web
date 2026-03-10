import { useEffect, useState } from 'react';
import { useAuthenticatedUrl, openAuthenticatedFile } from '@/hooks/useUploads';

interface AuthImageProps {
  fileKey: string;
  alt?: string;
  className?: string;
  /** Wrap in clickable link that opens the file in a new tab */
  clickable?: boolean;
  /** Extra className for the wrapping <a> / <button> when clickable */
  wrapperClassName?: string;
  /** Content to render on top of the image (overlays) */
  children?: React.ReactNode;
  /** Fallback when image can't be loaded */
  fallback?: React.ReactNode;
  /** Called when image fails to load */
  onError?: () => void;
}

/**
 * Renders an image fetched through the authenticated API (blob URL).
 * Solves the 401 problem with plain `<img src="/api/v1/uploads/view?key=...">`.
 */
export function AuthImage({
  fileKey,
  alt = 'Image',
  className = '',
  clickable = false,
  wrapperClassName = '',
  children,
  fallback,
  onError,
}: AuthImageProps) {
  const { url, isLoading, error } = useAuthenticatedUrl(fileKey);
  const [hasRenderError, setHasRenderError] = useState(false);

  useEffect(() => {
    setHasRenderError(false);
  }, [fileKey, url]);

  if (error || hasRenderError) {
    onError?.();
    return fallback ? <>{fallback}</> : null;
  }

  if (isLoading || !url) {
    return (
      <div className={`animate-pulse bg-gray-100 ${className}`} />
    );
  }

  const img = (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setHasRenderError(true)}
    />
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => openAuthenticatedFile(fileKey)}
        className={wrapperClassName}
      >
        {img}
        {children}
      </button>
    );
  }

  return (
    <>
      {img}
      {children}
    </>
  );
}
