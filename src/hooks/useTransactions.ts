import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { buildTransactionParams } from '@/lib/transactions';
import type { ApiResponse, TransactionFilters, TransactionListResponse } from '@/lib/types';

export function useTransactions(filters: TransactionFilters) {
  const params = buildTransactionParams(filters);
  return useQuery({
    queryKey: ['payments', 'transactions', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TransactionListResponse>>('/payments/transactions', { params });
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

/** Downloads the filtered list as CSV (all pages). */
export async function downloadTransactionsCsv(filters: TransactionFilters) {
  const { page: _page, limit: _limit, ...rest } = filters;
  const response = await api.get<Blob>('/payments/transactions/export', {
    params: buildTransactionParams(rest),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
