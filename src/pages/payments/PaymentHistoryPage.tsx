import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Receipt, CreditCard, MapPin, AlertCircle, Search, Calendar, Hash, Tag } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMyPaymentHistory, type PaymentHistoryItem } from '@/hooks/usePayments';
import { cn } from '@/lib/utils';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

const statusConfig: Record<string, { label: string; className: string }> = {
  verified: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  proof_submitted: { label: 'Under Review', className: 'bg-blue-100 text-blue-700' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
};

export function PaymentHistoryPage() {
  const { data: history, isLoading } = useMyPaymentHistory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (!searchQuery.trim()) return history;
    
    const query = searchQuery.toLowerCase();
    return history.filter((item) => {
      const searchStr = `
        ${item.description} 
        ${item.amount} 
        ${item.status} 
        ${item.method || ''} 
        ${item.receiptNumber || ''} 
        ${format(new Date(item.date), 'MMM d, yyyy h:mm a')}
      `.toLowerCase();
      return searchStr.includes(query);
    });
  }, [history, searchQuery]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
          <p className="text-muted-foreground text-sm mt-1">All your payments in one place</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="p-0 divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredHistory.length === 0 && (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title={searchQuery ? "No results found" : "No payments yet"}
          description={
            searchQuery 
              ? "Try adjusting your search keywords." 
              : "Your payment history will appear here once you make a payment."
          }
        />
      )}

      {/* Payment list */}
      {!isLoading && filteredHistory.length > 0 && (
        <Card className="overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100">
            {filteredHistory.map((item) => {
              const cfg = statusConfig[item.status] ?? {
                label: item.status,
                className: 'bg-gray-100 text-gray-700',
              };
              const isOcular = item.type === 'ocular_fee';

              return (
                <div 
                  key={item._id} 
                  onClick={() => setSelectedPayment(item)}
                  className="p-4 sm:p-5 transition-colors hover:bg-gray-50/80 cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105',
                          isOcular
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-blue-100 text-blue-600',
                        )}
                      >
                        {isOcular ? (
                          <MapPin className="h-5 w-5" />
                        ) : (
                          <CreditCard className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(item.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    {/* Right: amount + status */}
                    <div className="flex flex-col sm:flex-row sm:items-center items-end gap-1.5 sm:gap-4 shrink-0">
                      <span className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(item.amount)}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:w-24',
                          cfg.className,
                        )}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Payment Details Modal */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6 mt-2">
              {/* Amount & Status Header */}
              <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm text-muted-foreground font-medium mb-1">Amount</span>
                <span className="text-3xl font-bold text-gray-900 mb-3">
                  {formatCurrency(selectedPayment.amount)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium',
                    statusConfig[selectedPayment.status]?.className || 'bg-gray-100 text-gray-700'
                  )}
                >
                  {statusConfig[selectedPayment.status]?.label || selectedPayment.status}
                </span>
              </div>

              {/* Details List */}
              <div className="space-y-4 px-1">
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Description</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedPayment.description}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Date & Time</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {format(new Date(selectedPayment.date), 'MMMM d, yyyy')} at {format(new Date(selectedPayment.date), 'h:mm a')}
                    </p>
                  </div>
                </div>

                {selectedPayment.method && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Payment Method</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">
                        {selectedPayment.method.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )}

                {selectedPayment.receiptNumber && (
                  <div className="flex items-start gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Receipt Number</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedPayment.receiptNumber}</p>
                    </div>
                  </div>
                )}

                {selectedPayment.status === 'declined' && selectedPayment.declineReason && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100 mt-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-red-600 font-semibold">Decline Reason</p>
                      <p className="text-sm font-medium text-red-700 mt-0.5">{selectedPayment.declineReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
