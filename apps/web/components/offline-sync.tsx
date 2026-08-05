"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/hooks/use-session";
import {
	createExpense,
	createSale,
	isRetryableCashRequestError,
} from "@/lib/cash-movements-api";
import { cashMovementQueryKeys } from "@/lib/queries/cash-movements";
import {
	failPendingCashOperation,
	listPendingCashOperations,
	removePendingCashOperation,
} from "@/lib/offline/sync-queue";

export function OfflineSync() {
	const queryClient = useQueryClient();
	const { user } = useSession();
	const syncing = useRef(false);

	const flush = useCallback(async () => {
		if (syncing.current || !navigator.onLine || !user?.id) return;
		syncing.current = true;

		try {
			const operations = await listPendingCashOperations(user?.id);
			for (const operation of operations) {
				if (operation.status !== "pending") continue;

				try {
					if (operation.kind === "SALE") {
						await createSale(operation.businessId, operation.input);
					} else {
						await createExpense(operation.businessId, operation.input);
					}
					await removePendingCashOperation(operation.id);
					await queryClient.invalidateQueries({
						queryKey: cashMovementQueryKeys.movements(operation.businessId),
					});
					await queryClient.invalidateQueries({
						queryKey: ["dashboard-summary", operation.businessId],
					});
				} catch (error) {
					if (isRetryableCashRequestError(error)) break;
					await failPendingCashOperation(
						operation.id,
						error instanceof Error
							? error.message
							: "No pudimos sincronizar esta operación.",
					);
					queryClient.setQueryData(
						cashMovementQueryKeys.movements(operation.businessId),
						(
							movements:
								| Array<{ id: string; localSyncStatus?: string }>
								| undefined,
						) =>
							movements?.map((movement) =>
								movement.id === operation.id
									? { ...movement, localSyncStatus: "failed" }
									: movement,
							),
					);
				}
			}
		} finally {
			syncing.current = false;
		}
	}, [queryClient, user?.id]);

	useEffect(() => {
		void flush();
		window.addEventListener("online", flush);
		return () => window.removeEventListener("online", flush);
	}, [flush]);

	return null;
}
