import { useCallback, useId, useRef, useState } from 'react';
import { Upload, X, FileIcon, Loader2, ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { useGetUploadUrl, uploadFileToR2 } from '@/hooks/useUploads';

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
      if (file.type.startsWith('image/')) {
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
          toast.error(
            err instanceof Error ? err.message : `Failed to upload ${rawFile.name}`,
          );
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

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

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

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.fileKey}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
            >
              {isImage(file.fileName) ? (
                <ImageIcon className="h-5 w-5 text-blue-500" />
              ) : (
                <FileIcon className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="flex-1 truncate text-sm">{file.fileName}</span>
              {file.isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeFile(file.fileKey)}
                  aria-label={`Remove ${file.fileName}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
