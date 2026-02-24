import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { Upload, X, FileIcon, Loader2, ImageIcon, Play, ExternalLink } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { useGetUploadUrl, uploadFileToR2 } from '@/hooks/useUploads';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/lib/types';

interface FileUploadProps {
  folder: string;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  onUploadComplete: (fileKeys: string[]) => void;
  existingKeys?: string[];
  label?: string;
}

interface UploadedFile {
  fileKey: string;
  fileName: string;
  isUploading: boolean;
}

const COMPRESSIBLE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export function FileUpload({
  folder,
  accept = 'image/*,.pdf',
  maxSizeMB = 5,
  maxFiles = 5,
  onUploadComplete,
  existingKeys = [],
  label = 'Upload files',
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(
    existingKeys.map((key) => ({
      fileKey: key,
      fileName: key.split('/').pop() || key,
      isUploading: false,
    })),
  );
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const getUploadUrl = useGetUploadUrl();

  const processFile = useCallback(
    async (file: File): Promise<File> => {
      // Compress images
      if (COMPRESSIBLE_IMAGE_TYPES.has(file.type.toLowerCase())) {
        return await imageCompression(file, {
          maxSizeMB: Math.min(maxSizeMB, 2),
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      }

      // Check size for non-images
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File ${file.name} exceeds ${maxSizeMB}MB limit`);
      }

      return file;
    },
    [maxSizeMB],
  );

  const handleFiles = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const remaining = maxFiles - files.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const filesToProcess = Array.from(selectedFiles).slice(0, remaining);
      const newUploadedFiles: UploadedFile[] = [];

      for (const rawFile of filesToProcess) {
        const tempId = `temp-${Date.now()}-${rawFile.name}`;
        setFiles((prev) => [
          ...prev,
          { fileKey: tempId, fileName: rawFile.name, isUploading: true },
        ]);

        try {
          const processed = await processFile(rawFile);

          const { uploadUrl, fileKey } = await getUploadUrl.mutateAsync({
            folder,
            fileName: rawFile.name,
            contentType: processed.type,
          });

          await uploadFileToR2(uploadUrl, processed);

          setFiles((prev) =>
            prev.map((f) =>
              f.fileKey === tempId
                ? { fileKey, fileName: rawFile.name, isUploading: false }
                : f,
            ),
          );

          newUploadedFiles.push({ fileKey, fileName: rawFile.name, isUploading: false });
        } catch (err) {
          setFiles((prev) => prev.filter((f) => f.fileKey !== tempId));
          if (err instanceof AxiosError) {
            const apiMessage =
              (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
              || err.message;
            toast.error(apiMessage || `Failed to upload ${rawFile.name}`);
          } else {
            toast.error(
              err instanceof Error ? err.message : `Failed to upload ${rawFile.name}`,
            );
          }
        }
      }

      if (newUploadedFiles.length > 0) {
        const allKeys = [
          ...files.filter((f) => !f.isUploading).map((f) => f.fileKey),
          ...newUploadedFiles.map((f) => f.fileKey),
        ];
        onUploadComplete(allKeys);
      }
    },
    [files, maxFiles, folder, processFile, getUploadUrl, onUploadComplete],
  );

  const removeFile = (fileKey: string) => {
    setFiles((prev) => prev.filter((f) => f.fileKey !== fileKey));
    const remaining = files
      .filter((f) => f.fileKey !== fileKey && !f.isUploading)
      .map((f) => f.fileKey);
    onUploadComplete(remaining);
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|tif|tiff|svg)$/i.test(name);
  const isVideo = (name: string) => /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(name);

  // ── Thumbnail URL cache ──
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Fetch signed download URLs for completed files so we can show thumbnails
  useEffect(() => {
    const keysNeedingUrl = files
      .filter((f) => !f.isUploading && !previewUrls[f.fileKey])
      .map((f) => f.fileKey);

    if (keysNeedingUrl.length === 0) return;

    let cancelled = false;

    (async () => {
      for (const key of keysNeedingUrl) {
        if (cancelled) break;
        try {
          const { data } = await api.post<ApiResponse<{ downloadUrl: string }>>(
            '/uploads/signed-download-url',
            { key },
          );
          if (!cancelled) {
            setPreviewUrls((prev) => ({ ...prev, [key]: data.data.downloadUrl }));
          }
        } catch {
          // silently ignore – file will just show the icon
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map((f) => f.fileKey).join(',')]);

  return (
    <div className="space-y-3">
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50"
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag & drop or click to browse (max {maxSizeMB}MB each, {maxFiles} files)
        </p>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          className="hidden"
          aria-label={label}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list with previews */}
      {files.length > 0 && (
        <div className="grid gap-2">
          {files.map((file) => {
            const url = previewUrls[file.fileKey];
            const imageFile = isImage(file.fileName);
            const videoFile = isVideo(file.fileName);

            return (
              <div
                key={file.fileKey}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
              >
                {/* Thumbnail / icon */}
                {file.isUploading ? (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : imageFile && url ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-200 hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer"
                    title="Click to view full size"
                  >
                    <img
                      src={url}
                      alt={file.fileName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ) : videoFile && url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gray-900 hover:bg-gray-800 transition-colors"
                    title="Click to play video"
                  >
                    <Play className="h-5 w-5 text-white" fill="white" />
                  </a>
                ) : imageFile ? (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                    <ImageIcon className="h-5 w-5 text-blue-500" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* File name + open link */}
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {file.fileName}
                  </span>
                  {!file.isUploading && url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {videoFile ? 'Play' : 'View full size'}
                    </a>
                  )}
                </div>

                {/* Remove button */}
                {!file.isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeFile(file.fileKey)}
                    aria-label={`Remove ${file.fileName}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Full-size preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
