"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

import { OfflineIndicator } from "@/components/offline-indicator";
import { OfflineSync } from "@/components/offline-sync";
import { ThemeProvider } from "@/components/theme-provider";
import { getLastUserId, useSession } from "@/hooks/use-session";
import {
	persistQueryCache,
	restoreQueryCache,
} from "@/lib/offline/query-cache";

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				networkMode: "offlineFirst",
				staleTime: 5 * 60 * 1000,
				gcTime: 7 * 24 * 60 * 60 * 1000,
				retry: 1,
			},
		},
	});
}

function PersistedQueryClient({
	queryClient,
	children,
}: {
	queryClient: QueryClient;
	children: React.ReactNode;
}) {
	const { user } = useSession();
	const scope = user?.id ?? getLastUserId();
	const [restoredScope, setRestoredScope] = React.useState<string | null>(null);

	React.useEffect(() => {
		let active = true;
		let stopPersistence: (() => void) | undefined;
		setRestoredScope(null);
		queryClient.clear();

		void restoreQueryCache(queryClient, scope).finally(() => {
			if (!active) return;
			stopPersistence = persistQueryCache(queryClient, scope);
			setRestoredScope(scope);
		});

		return () => {
			active = false;
			stopPersistence?.();
		};
	}, [queryClient, scope]);

	if (restoredScope !== scope) return null;
	return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = React.useState(() => makeQueryClient());

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<QueryClientProvider client={queryClient}>
				<PersistedQueryClient queryClient={queryClient}>
					{children}
				</PersistedQueryClient>
				<OfflineIndicator />
				<OfflineSync />
			</QueryClientProvider>
		</ThemeProvider>
	);
}
