import { LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LogoutConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({ open, onOpenChange, onConfirm }: LogoutConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] overflow-hidden rounded-2xl border border-[#d6d9df] bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(246,248,251,1)_100%)] p-0 shadow-[0_28px_70px_rgba(15,23,42,0.18)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(9,14,22,1)_0%,rgba(6,10,17,1)_100%)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.52)]">
        {/* Header accent */}
        <div className="h-1.5 bg-gradient-to-r from-[#1d1d1f] via-[#6e6e73] to-[#c8c8cd] dark:from-[#2e4761] dark:via-[#6887a5] dark:to-[#c8d7e6]" />

        <div className="p-6 pt-5">
          <DialogHeader className="text-center sm:text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f0f5] ring-4 ring-[#d2d2d7]/30 dark:bg-[#121b28] dark:ring-white/8">
                <LogOut className="h-6 w-6 text-[#1d1d1f] dark:text-slate-100" />
              </div>
            </div>
            <DialogTitle className="text-lg font-bold text-[#1d1d1f] dark:text-slate-100">
              Sign out of your account?
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm text-[#86868b] dark:text-slate-400">
              You'll need to sign in again to access your dashboard and manage your account.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 flex-1 rounded-xl border-[#d2d2d7] bg-[#f7f8fa] text-[#3a3a3e] font-medium transition-all duration-200 hover:bg-[#eef1f5] dark:border-white/12 dark:bg-[#182230] dark:text-slate-100 dark:hover:bg-[#202c3d]"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="h-11 flex-1 rounded-xl bg-[linear-gradient(180deg,#d77770_0%,#bc544c_100%)] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_26px_rgba(144,49,43,0.24)] transition-all duration-200 hover:bg-[linear-gradient(180deg,#de837c_0%,#c6625b_100%)] dark:bg-[linear-gradient(180deg,#cf6d66_0%,#a9413c_100%)] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_14px_28px_rgba(99,31,27,0.34)] dark:hover:bg-[linear-gradient(180deg,#d87b73_0%,#b54d47_100%)]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
