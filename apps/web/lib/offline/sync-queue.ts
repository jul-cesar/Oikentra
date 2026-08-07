import type { CashMovement, CashMovementInput } from "@/lib/cash-movements-api";

const DATABASE_NAME = "oikentra-sync";
const STORE_NAME = "pending-operations";

type OperationKind = "SALE" | "EXPENSE";

export type PendingCashOperation = {
	id: string;
	userId: string;
	businessId: string;
	kind: OperationKind;
	input: CashMovementInput & { id: string };
	createdAt: number;
	status: "pending" | "failed";
	error?: string;
};

function isAvailable() {
	return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE_NAME, 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function transaction<T>(
	mode: IDBTransactionMode,
	callback: (store: IDBObjectStore) => IDBRequest<T>,
) {
	if (!isAvailable()) return null;

	const database = await openDatabase();
	return new Promise<T>((resolve, reject) => {
		const request = callback(
			database.transaction(STORE_NAME, mode).objectStore(STORE_NAME),
		);
		request.onsuccess = () => {
			database.close();
			resolve(request.result);
		};
		request.onerror = () => {
			database.close();
			reject(request.error);
		};
	});
}

export async function enqueueCashOperation(operation: PendingCashOperation) {
	await transaction("readwrite", (store) => store.put(operation));
}

export async function listPendingCashOperations(userId?: string) {
	const operations =
		(await transaction<PendingCashOperation[]>("readonly", (store) =>
			store.getAll(),
		)) ?? [];
	return operations
		.filter((operation) => !userId || operation.userId === userId)
		.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePendingCashOperation(id: string) {
	await transaction("readwrite", (store) => store.delete(id));
}

export async function failPendingCashOperation(id: string, error: string) {
	const operation = await transaction<PendingCashOperation | undefined>(
		"readonly",
		(store) => store.get(id),
	);
	if (!operation) return;
	await enqueueCashOperation({ ...operation, status: "failed", error });
}

export function toPendingCashMovement(
	businessId: string,
	kind: OperationKind,
	input: CashMovementInput & { id: string },
): CashMovement & { localSyncStatus: "pending" } {
	const now = new Date().toISOString();
	return {
		id: input.id,
		userId: "offline",
		businessId,
		type: kind,
		amount: input.amount,
		category: input.category ?? null,
		paymentMethod: input.paymentMethod ?? null,
		note: input.note ?? null,
		businessDate: input.businessDate,
		occurredAt: input.occurredAt,
		status: "ACTIVE",
		sourceType: null,
		sourceId: null,
		sourceCustomer: null,
		cancellationReason: null,
		cancelledAt: null,
		version: 1,
		createdAt: now,
		updatedAt: now,
		localSyncStatus: "pending",
	};
}
