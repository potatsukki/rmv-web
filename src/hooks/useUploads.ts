import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/lib/types';

interface SignedUrlResponse {
  uploadUrl: string;
  key: string;
}

interface DownloadUrlResponse {
  downloadUrl: string;
}

export function useGetUploadUrl() {
  return useMutation({
    mutationFn: async (body: {
      folder: string;
      fileName: string;
      contentType: string;
    }) => {
      const { data } = await api.post<ApiResponse<SignedUrlResponse>>(
        '/uploads/signed-upload-url',
        {
          folder: body.folder,
          filename: body.fileName,
          contentType: body.contentType,
        },
      );
      return {
        uploadUrl: data.data.uploadUrl,
        fileKey: data.data.key,
      };
    },
  });
}

export function useGetDownloadUrl() {
  return useMutation({
    mutationFn: async (fileKey: string) => {
      const { data } = await api.post<ApiResponse<DownloadUrlResponse>>(
        '/uploads/signed-download-url',
        { key: fileKey },
      );
      return data.data;
    },
  });
}

/**
 * Upload a file to R2 using a pre-signed URL
 */
export async function uploadFileToR2(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }
}

/**
 * Hook that gets a signed download URL for a file through the authenticated API.
 * Returns the R2 signed URL directly — safe for `<img src>` (no CORS redirect issue).
 */
export function useAuthenticatedUrl(fileKey: string | null | undefined): {
  url: string | null;
  isLoading: boolean;
  error: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileKey) {
      setUrl(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(false);

    api
      .post<ApiResponse<DownloadUrlResponse>>('/uploads/signed-download-url', { key: fileKey })
      .then((res) => {
        if (!cancelled) setUrl(res.data.data.downloadUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileKey]);

  return { url, isLoading, error };
}

/**
 * Open a file in a new tab via authenticated signed URL.
 */
export async function openAuthenticatedFile(fileKey: string): Promise<void> {
  const { data } = await api.post<ApiResponse<DownloadUrlResponse>>(
    '/uploads/signed-download-url',
    { key: fileKey },
  );
  window.open(data.data.downloadUrl, '_blank');
}
