import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelCashMovement, createExpense, createSale, getCashMovements } from "@/lib/cash-api";

export const cashQueryKeys = {
  movements: (businessId: string) => ["cash-movements", businessId] as const,
};

export function useCashMovements(businessId: string) {
  return useQuery({
    queryKey: cashQueryKeys.movements(businessId),
    queryFn: () => getCashMovements(businessId),
    enabled: Boolean(businessId),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  void queryClient.invalidateQueries({ queryKey: cashQueryKeys.movements(businessId) });
}

export function useCreateSale(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createSale>[1]) => createSale(businessId, input),
    onSuccess: () => invalidate(queryClient, businessId),
  });
}

export function useCreateExpense(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createExpense>[1]) => createExpense(businessId, input),
    onSuccess: () => invalidate(queryClient, businessId),
  });
}

export function useCancelCashMovement(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ movementId, reason }: { movementId: string; reason: string }) => cancelCashMovement(businessId, movementId, reason),
    onSuccess: () => invalidate(queryClient, businessId),
  });
}
