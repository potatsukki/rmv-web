import { useMutation } from '@tanstack/react-query';
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
