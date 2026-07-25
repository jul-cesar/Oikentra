import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createExpense, createSale, getCashMovements } from '@/lib/cash-api';

export const cashKeys = { movements: (businessId: string) => ['cash-movements', businessId] as const };

export function useCashMovements(businessId: string) {
  return useQuery({ queryKey: cashKeys.movements(businessId), queryFn: () => getCashMovements(businessId), enabled: Boolean(businessId) });
}

function invalidate(client: ReturnType<typeof useQueryClient>, businessId: string) {
  void client.invalidateQueries({ queryKey: cashKeys.movements(businessId) });
}

export function useCreateSale(businessId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: Parameters<typeof createSale>[1]) => createSale(businessId, input), onSuccess: () => invalidate(client, businessId) });
}

export function useCreateExpense(businessId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: Parameters<typeof createExpense>[1]) => createExpense(businessId, input), onSuccess: () => invalidate(client, businessId) });
}
