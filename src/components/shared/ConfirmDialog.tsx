import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  destructive?: boolean;
  isLoading?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant,
  destructive = false,
  isLoading,
  loading,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'destructive' || destructive;
  const busy = isLoading ?? loading ?? false;

  const handleClose = (v: boolean) => {
    if (!v) {
      onCancel?.();
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {isDestructive && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            )}
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={busy}
            className="border-gray-200"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
