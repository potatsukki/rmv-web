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
  confirmClassName?: string;
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
  confirmClassName,
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
      <DialogContent className="metal-panel-strong max-w-md gap-5 overflow-hidden rounded-[1.9rem] border border-[color:var(--metal-panel-strong-border)] p-0 shadow-[0_28px_72px_rgba(12,16,21,0.18)] dark:shadow-[0_34px_84px_rgba(0,0,0,0.52)]">
        <DialogHeader>
          <div className="flex items-start gap-4 px-7 pt-7">
            {isDestructive && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#efb1aa]/70 bg-[linear-gradient(180deg,rgba(255,247,245,0.96)_0%,rgba(247,224,220,0.94)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_14px_28px_rgba(144,49,43,0.12)] dark:border-[#7f3834]/70 dark:bg-[linear-gradient(180deg,rgba(85,34,31,0.92)_0%,rgba(56,19,18,0.96)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_30px_rgba(0,0,0,0.26)]">
                <AlertTriangle className="h-5 w-5 text-[#d2574f] dark:text-[#ff8a80]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold tracking-[-0.02em] text-[#181d23] dark:text-slate-50">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="mt-2 max-w-[34ch] text-sm leading-relaxed text-[#5b6672] dark:text-slate-300/90">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        {children ? (
          <div className="px-7">
            <div className="metal-panel rounded-[1.45rem] border border-[color:var(--metal-panel-border)] px-4 py-4">
              {children}
            </div>
          </div>
        ) : null}
        <DialogFooter className="mt-1 gap-2 border-t border-[color:var(--metal-divider-color)]/70 px-7 pb-7 pt-5 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={busy}
            className="min-w-[5.75rem] border-[color:var(--metal-pill-border)] text-[color:var(--text-metal-color)] hover:text-[#12161b] dark:text-slate-100 dark:hover:text-slate-100"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={busy}
            className={confirmClassName ?? 'min-w-[8.5rem]'}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
