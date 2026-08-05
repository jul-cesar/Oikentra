"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineIndicator() {
	const isOnline = useOnlineStatus();

	if (isOnline) return null;

	return (
		<div className="fixed inset-x-0 bottom-0 z-50 border-t bg-foreground px-4 py-2 text-center text-xs text-background">
			Sin conexión. Mostrando los últimos datos disponibles.
		</div>
	);
}
