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
      <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden">
        {/* Header accent */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-red-400 to-orange-400" />

        <div className="p-6 pt-5">
          <DialogHeader className="text-center sm:text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-4 ring-red-50/50">
                <LogOut className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Sign out of your account?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1.5">
              You'll need to sign in again to access your dashboard and manage your account.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl border-gray-200 font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 font-medium"
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
