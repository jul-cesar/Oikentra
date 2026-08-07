import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	cancelCashMovement,
	createExpense,
	createSale,
	getCashMovements,
	isRetryableCashRequestError,
	type CashMovementInput,
} from "@/lib/cash-movements-api";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSession } from "@/hooks/use-session";
import {
	enqueueCashOperation,
	toPendingCashMovement,
} from "@/lib/offline/sync-queue";

export const cashMovementQueryKeys = {
	movements: (businessId: string) => ["cash-movements", businessId] as const,
};

export const cashMovementsQueryKeys = cashMovementQueryKeys;

function invalidateCashData(
	queryClient: ReturnType<typeof useQueryClient>,
	businessId: string,
) {
	void queryClient.invalidateQueries({
		queryKey: cashMovementQueryKeys.movements(businessId),
	});
	void queryClient.invalidateQueries({
		queryKey: ["dashboard-summary", businessId],
	});
}

export function useCashMovements(businessId: string) {
	return useQuery({
		queryKey: cashMovementQueryKeys.movements(businessId),
		queryFn: () => getCashMovements(businessId),
		enabled: Boolean(businessId),
	});
}

export function useCreateSale(businessId: string) {
	const queryClient = useQueryClient();
	const isOnline = useOnlineStatus();
	const { user } = useSession();
	return useMutation({
		networkMode: "always",
		mutationFn: async (input: CashMovementInput) => {
			const operationInput = { ...input, id: input.id ?? crypto.randomUUID() };
			if (!isOnline) {
				await enqueueCashOperation({
					id: operationInput.id,
					userId: user?.id ?? "anonymous",
					businessId,
					kind: "SALE",
					input: operationInput,
					createdAt: Date.now(),
					status: "pending",
				});
				return toPendingCashMovement(businessId, "SALE", operationInput);
			}

			try {
				return await createSale(businessId, operationInput);
			} catch (error) {
				if (!isRetryableCashRequestError(error)) throw error;
				await enqueueCashOperation({
					id: operationInput.id,
					userId: user?.id ?? "anonymous",
					businessId,
					kind: "SALE",
					input: operationInput,
					createdAt: Date.now(),
					status: "pending",
				});
				return toPendingCashMovement(businessId, "SALE", operationInput);
			}
		},
		onSuccess: (movement) => {
			if (movement.localSyncStatus) {
				queryClient.setQueryData(
					cashMovementQueryKeys.movements(businessId),
					(existing: (typeof movement)[] | undefined) => [
						movement,
						...(existing ?? []),
					],
				);
				return;
			}
			void invalidateCashData(queryClient, businessId);
		},
	});
}

export function useCreateExpense(businessId: string) {
	const queryClient = useQueryClient();
	const isOnline = useOnlineStatus();
	const { user } = useSession();
	return useMutation({
		networkMode: "always",
		mutationFn: async (input: CashMovementInput) => {
			const operationInput = { ...input, id: input.id ?? crypto.randomUUID() };
			if (!isOnline) {
				await enqueueCashOperation({
					id: operationInput.id,
					userId: user?.id ?? "anonymous",
					businessId,
					kind: "EXPENSE",
					input: operationInput,
					createdAt: Date.now(),
					status: "pending",
				});
				return toPendingCashMovement(businessId, "EXPENSE", operationInput);
			}

			try {
				return await createExpense(businessId, operationInput);
			} catch (error) {
				if (!isRetryableCashRequestError(error)) throw error;
				await enqueueCashOperation({
					id: operationInput.id,
					userId: user?.id ?? "anonymous",
					businessId,
					kind: "EXPENSE",
					input: operationInput,
					createdAt: Date.now(),
					status: "pending",
				});
				return toPendingCashMovement(businessId, "EXPENSE", operationInput);
			}
		},
		onSuccess: (movement) => {
			if (movement.localSyncStatus) {
				queryClient.setQueryData(
					cashMovementQueryKeys.movements(businessId),
					(existing: (typeof movement)[] | undefined) => [
						movement,
						...(existing ?? []),
					],
				);
				return;
			}
			void invalidateCashData(queryClient, businessId);
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
		onSuccess: () => invalidateCashData(queryClient, businessId),
	});
}
