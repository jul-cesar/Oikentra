import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelCashMovement,
  createSale,
  createExpense,
  getCashMovements,
  type CashMovement,
} from "@/lib/cash-movements-api";

export const cashMovementQueryKeys = {
  movements: (businessId: string) =>
    ["cash-movements", businessId] as const,
};

export function useCashMovements(businessId: string) {
  return useQuery({
    queryKey: cashMovementQueryKeys.movements(businessId),
    queryFn: () => getCashMovements(businessId),
    enabled: Boolean(businessId),
  });
}

export function useCreateSale(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createSale>[1]) =>
      createSale(businessId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cashMovementQueryKeys.movements(businessId),
      });
    },
  });
}

export function useCreateExpense(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createExpense>[1]) =>
      createExpense(businessId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cashMovementQueryKeys.movements(businessId),
      });
    },
  });
}

export function useCancelCashMovement(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      movementId,
      reason,
    }: {
      movementId: string;
      reason: string;
    }) => cancelCashMovement(businessId, movementId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: cashMovementQueryKeys.movements(businessId),
      });
    },
  });
}
