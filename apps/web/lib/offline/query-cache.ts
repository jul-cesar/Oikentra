import {
	dehydrate,
	hydrate,
	type DehydratedState,
	type QueryClient,
} from "@tanstack/react-query";

const DATABASE_NAME = "oikentra-offline";
const STORE_NAME = "query-cache";
const CACHE_VERSION = 1;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

type PersistedQueryCache = {
	version: number;
	timestamp: number;
	state: DehydratedState;
};

function isIndexedDbAvailable() {
	return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE_NAME, 1);

		request.onupgradeneeded = () => {
			request.result.createObjectStore(STORE_NAME);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(
				request.error ?? new Error("No pudimos abrir el almacenamiento local."),
			);
	});
}

async function readCache(scope: string) {
	if (!isIndexedDbAvailable()) return null;

	const database = await openDatabase();
	return new Promise<PersistedQueryCache | null>((resolve, reject) => {
		const transaction = database.transaction(STORE_NAME, "readonly");
		const request = transaction.objectStore(STORE_NAME).get(scope);
		request.onsuccess = () =>
			resolve((request.result as PersistedQueryCache | undefined) ?? null);
		request.onerror = () =>
			reject(request.error ?? new Error("No pudimos leer la caché local."));
		transaction.oncomplete = () => database.close();
	});
}

async function writeCache(scope: string, value: PersistedQueryCache) {
	if (!isIndexedDbAvailable()) return;

	const database = await openDatabase();
	return new Promise<void>((resolve, reject) => {
		const transaction = database.transaction(STORE_NAME, "readwrite");
		transaction.objectStore(STORE_NAME).put(value, scope);
		transaction.oncomplete = () => {
			database.close();
			resolve();
		};
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("No pudimos guardar la caché local."),
			);
	});
}

export async function restoreQueryCache(
	queryClient: QueryClient,
	scope: string,
) {
	try {
		const persisted = await readCache(scope);
		if (!persisted || persisted.version !== CACHE_VERSION) return false;
		if (Date.now() - persisted.timestamp > MAX_CACHE_AGE) return false;

		hydrate(queryClient, persisted.state);
		return true;
	} catch {
		return false;
	}
}

export function persistQueryCache(queryClient: QueryClient, scope: string) {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	const persist = () => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => {
			void writeCache(scope, {
				version: CACHE_VERSION,
				timestamp: Date.now(),
				state: dehydrate(queryClient, {
					shouldDehydrateQuery: (query) => query.state.status === "success",
				}),
			}).catch(() => undefined);
		}, 250);
	};

	const unsubscribe = queryClient.getQueryCache().subscribe(persist);
	persist();

	return () => {
		if (timeout) clearTimeout(timeout);
		unsubscribe();
	};
}

export async function clearPersistedQueryCache(scope: string) {
	if (!isIndexedDbAvailable()) return;

	try {
		const database = await openDatabase();
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(STORE_NAME, "readwrite");
			transaction.objectStore(STORE_NAME).delete(scope);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
		database.close();
	} catch {
		// Local persistence is best-effort and must not block logout.
	}
}
