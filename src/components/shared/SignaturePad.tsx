import { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Check, RotateCcw, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { useGetUploadUrl, uploadFileToR2, useAuthenticatedUrl } from '@/hooks/useUploads';

interface SignaturePadProps {
  /** Called with the R2 file key after upload completes */
  onSave: (signatureKey: string) => void;
  /** Called when the user confirms deletion */
  onDelete?: () => void;
  /** Whether the delete action is in progress */
  isDeleting?: boolean;
  /** Optional existing signature key to display */
  existingKey?: string | null;
  /** Whether the pad is in loading/saving state */
  isSaving?: boolean;
  /** Width of the canvas */
  width?: number;
  /** Height of the canvas */
  height?: number;
  /** Hide the Save button (parent will handle saving via ref) */
  hideSaveButton?: boolean;
}

export function SignaturePad({
  onSave,
  onDelete,
  isDeleting = false,
  existingKey,
  isSaving = false,
  width = 500,
  height = 200,
  hideSaveButton = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const getUploadUrl = useGetUploadUrl();
  const isDrawingRef = useRef(false);

  // Fetch existing signature through authenticated API
  const { url: previewUrl, isLoading: sigImgLoading, error: sigImgError } = useAuthenticatedUrl(existingKey);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx;
  }, []);

  // Initialize canvas
  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const canvas = canvasRef.current!;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [getCtx, width, height]);

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0]!;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e.nativeEvent);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e.nativeEvent);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    isDrawingRef.current = false;
  };

  // Native touch event listeners with { passive: false } to avoid
  // "Unable to preventDefault inside passive event listener" warning
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
      isDrawingRef.current = true;
      setHasDrawn(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const handleTouchEnd = () => {
      setIsDrawing(false);
      isDrawingRef.current = false;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [getCtx]);

  const clearCanvas = () => {
    const ctx = getCtx();
    if (!ctx) return;
    const canvas = canvasRef.current!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a1a';
    setHasDrawn(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      toast.error('Please draw your signature first');
      return;
    }

    setIsUploading(true);
    try {
      // Export canvas as PNG blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to export canvas'));
        }, 'image/png');
      });

      const fileName = `signature-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Get presigned upload URL
      const { uploadUrl, fileKey } = await getUploadUrl.mutateAsync({
        folder: 'signatures',
        fileName,
        contentType: 'image/png',
      });

      // Upload to R2
      await uploadFileToR2(uploadUrl, file);

      onSave(fileKey);
      toast.success('Signature saved');
    } catch {
      toast.error('Failed to save signature');
    } finally {
      setIsUploading(false);
    }
  };

  const busy = isSaving || isUploading || isDeleting;

  return (
    <div className="space-y-3">
      {/* Existing Signature Preview */}
      {existingKey && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Current Signature
          </p>
          {sigImgLoading ? (
            <div className="border border-gray-200 rounded-xl p-2 bg-white inline-block">
              <div className="h-20 w-40 animate-pulse rounded bg-gray-100" />
            </div>
          ) : sigImgError ? (
            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 inline-flex items-center gap-2 text-xs text-[#86868b]">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Signature could not be loaded. You can draw a new one below.
            </div>
          ) : previewUrl ? (
            <div className="border border-gray-200 rounded-xl p-2 bg-white inline-block">
              <img
                src={previewUrl}
                alt="Current signature"
                className="max-h-20 object-contain"
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Drawing Area */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {existingKey ? 'Draw New Signature' : 'Draw Your Signature'}
        </p>
        <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair touch-none"
            style={{ aspectRatio: `${width}/${height}` }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
        <p className="text-xs text-gray-400 text-center">
          Use your mouse or finger to draw your signature above
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          disabled={busy || !hasDrawn}
          className="border-gray-200 rounded-lg"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
        {!hideSaveButton && (
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={busy || !hasDrawn}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
        >
          {busy && isUploading ? (
            <Eraser className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          {busy && isUploading ? 'Saving...' : 'Save Signature'}
        </Button>
        )}
        {onDelete && existingKey && (
          confirmDelete ? (
            <>
              <span className="text-xs text-red-500 self-center">Are you sure?</span>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => { setConfirmDelete(false); onDelete(); }}
                className="rounded-lg"
              >
                {isDeleting ? <Eraser className="mr-1.5 h-3.5 w-3.5 animate-pulse" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                {isDeleting ? 'Removing...' : 'Yes, remove'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
                className="border-gray-200 rounded-lg"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg ml-auto"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )
        )}
      </div>
    </div>
  );
}
