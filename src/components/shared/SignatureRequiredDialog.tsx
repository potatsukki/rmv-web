import { Link } from 'react-router';
import { PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Shown instead of the Verify/Approve Payment dialog when the cashier has no
// saved e-signature yet — blocks the action until one is set up in Profile.
export function SignatureRequiredDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signature Required
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You need to set up your cashier signature before you can verify or approve payments.
          It will be used on every receipt from then on.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button asChild onClick={() => onOpenChange(false)}>
            <Link to="/account/profile">Set Up Signature</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
