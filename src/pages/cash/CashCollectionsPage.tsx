import { useState } from 'react';
import { format } from 'date-fns';
import { Wallet, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageError } from '@/components/shared/PageError';
import {
  useCashCollections,
  useCashDiscrepancies,
  useReceiveCash,
  useResolveDiscrepancy,
} from '@/hooks/useCash';
import { useAuthStore } from '@/stores/auth.store';
import { Role, CashCollectionStatus } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

export function CashCollectionsPage() {
  const { user } = useAuthStore();
  const [receiveDialog, setReceiveDialog] = useState({ open: false, id: '', amount: '' });
  const [resolveDialog, setResolveDialog] = useState({ open: false, id: '' });
  const [resolution, setResolution] = useState('');

  const { data: collections, isLoading, isError, refetch } = useCashCollections();
  const { data: discrepancies } = useCashDiscrepancies();
  const receiveMutation = useReceiveCash();
  const resolveMutation = useResolveDiscrepancy();

  const isCashier = user?.roles.some((r) => [Role.CASHIER, Role.ADMIN].includes(r));
  const isAdmin = user?.roles.some((r) => [Role.ADMIN].includes(r));

  const handleReceive = async () => {
    const amt = parseFloat(receiveDialog.amount);
    if (isNaN(amt) || amt < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await receiveMutation.mutateAsync({ id: receiveDialog.id, amountReceived: amt });
      toast.success('Cash received');
      setReceiveDialog({ open: false, id: '', amount: '' });
    } catch {
      toast.error('Failed to receive cash');
    }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) {
      toast.error('Enter a resolution');
      return;
    }
    try {
      await resolveMutation.mutateAsync({ id: resolveDialog.id, resolutionNotes: resolution });
      toast.success('Discrepancy resolved');
      setResolveDialog({ open: false, id: '' });
      setResolution('');
    } catch {
      toast.error('Failed to resolve');
    }
  };

  if (isError) return <PageError onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cash Collections</h1>
        <p className="text-gray-500 text-sm">Track cash payments from sales staff</p>
      </div>

      {/* Collections */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-xl border-gray-100">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !collections?.length ? (
        <EmptyState
          icon={<Wallet className="h-16 w-16" />}
          title="No cash collections"
          description="Cash collections will appear here when sales staff record cash payments."
        />
      ) : (
        <Card className="rounded-xl border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {collections.map((c) => (
                <div
                  key={String(c._id)}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50/30 hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(Number(c.amountCollected))}
                      </p>
                      <StatusBadge status={String(c.status)} />
                    </div>
                    {c.amountReceived != null && (
                      <p className="text-sm text-gray-500">
                        Received: {formatCurrency(Number(c.amountReceived))}
                      </p>
                    )}
                    {c.salesStaffName ? (
                      <p className="text-xs text-gray-400">From {String(c.salesStaffName)}</p>
                    ) : null}
                    <p className="text-xs text-gray-400">
                      {c.createdAt
                        ? format(new Date(String(c.createdAt)), 'MMM d, yyyy h:mm a')
                        : ''}
                    </p>
                  </div>
                  {isCashier && c.status === CashCollectionStatus.COLLECTED && (
                    <Button
                      size="sm"
                      className="bg-gray-900 hover:bg-gray-800 rounded-lg"
                      onClick={() => setReceiveDialog({ open: true, id: String(c._id), amount: String(c.amountCollected) })}
                    >
                      Receive Cash
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discrepancies */}
      {isAdmin && discrepancies && discrepancies.length > 0 && (
        <Card className="rounded-xl border-red-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              Discrepancies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {discrepancies.map((d) => (
                <div
                  key={String(d._id)}
                  className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-red-600">
                      Difference: {formatCurrency(Number(d.difference))}
                    </p>
                    <p className="text-sm text-gray-500">
                      Collected: {formatCurrency(Number(d.amountCollected))} · Received:{' '}
                      {formatCurrency(Number(d.amountReceived))}
                    </p>
                    {d.resolutionNotes ? (
                      <p className="text-sm text-emerald-600">
                        Resolved: {String(d.resolutionNotes)}
                      </p>
                    ) : null}
                  </div>
                  {!d.resolvedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-200 rounded-lg"
                      onClick={() => setResolveDialog({ open: true, id: String(d._id) })}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receive Dialog */}
      <Dialog
        open={receiveDialog.open}
        onOpenChange={(open) => {
          if (!open) setReceiveDialog({ open: false, id: '', amount: '' });
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Receive Cash</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-gray-700 text-[13px] font-medium">Amount Received</Label>
            <Input
              type="number"
              step="0.01"
              value={receiveDialog.amount}
              onChange={(e) => setReceiveDialog({ ...receiveDialog, amount: e.target.value })}
              placeholder="Enter actual amount received"
              className="h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 rounded-lg"
              onClick={() => setReceiveDialog({ open: false, id: '', amount: '' })}
            >
              Cancel
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 rounded-lg"
              onClick={handleReceive}
              disabled={receiveMutation.isPending}
            >
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog
        open={resolveDialog.open}
        onOpenChange={(open) => {
          setResolveDialog({ open, id: open ? resolveDialog.id : '' });
          if (!open) setResolution('');
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Resolve Discrepancy</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-gray-700 text-[13px] font-medium">Resolution Notes</Label>
            <Input
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="How was this discrepancy resolved?"
              className="h-11 bg-gray-50/50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 rounded-lg"
              onClick={() => setResolveDialog({ open: false, id: '' })}
            >
              Cancel
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 rounded-lg"
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
            >
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
