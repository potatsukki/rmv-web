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
      <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden border-[#d2d2d7]/50 bg-white/90 backdrop-blur-xl shadow-xl">
        {/* Header accent */}
        <div className="h-1.5 bg-gradient-to-r from-[#1d1d1f] via-[#6e6e73] to-[#c8c8cd]" />

        <div className="p-6 pt-5">
          <DialogHeader className="text-center sm:text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f0f5] ring-4 ring-[#d2d2d7]/30">
                <LogOut className="h-6 w-6 text-[#1d1d1f]" />
              </div>
            </div>
            <DialogTitle className="text-lg font-bold text-[#1d1d1f]">
              Sign out of your account?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#86868b] mt-1.5">
              You'll need to sign in again to access your dashboard and manage your account.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl border-[#d2d2d7] text-[#3a3a3e] hover:bg-[#f0f0f5] font-medium transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 h-11 rounded-xl bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white font-medium shadow-sm transition-all duration-200"
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
