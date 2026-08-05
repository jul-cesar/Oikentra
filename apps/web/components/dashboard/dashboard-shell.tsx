"use client";

import { useCallback } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { usePrefetchQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { clearLastUser } from "@/hooks/use-session";
import { clearPersistedQueryCache } from "@/lib/offline/query-cache";
import { AppSidebar } from "@/components/app-sidebar";
import { getBusinesses } from "@/lib/onboarding-api";
import { queryKeys } from "@/lib/queries/onboarding";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import type { Business } from "@/lib/onboarding-api";

type Props = {
	business: Business;
	user: { id?: string; name?: string | null; email?: string | null };
	children: React.ReactNode;
};

export function DashboardShell({ business, user, children }: Props) {
	usePrefetchQuery({
		queryKey: queryKeys.businesses,
		queryFn: getBusinesses,
	});

	const signOut = useCallback(async () => {
		await authClient.signOut().catch(() => undefined);
		clearLastUser();
		if (user.id) {
			await clearPersistedQueryCache(user.id);
		}
		window.location.assign("/login");
	}, [user.id]);
	return (
		<SidebarProvider>
			<AppSidebar
				business={business}
				user={user}
				onSignOut={() => void signOut()}
			/>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
					<SidebarTrigger aria-label="Alternar menú lateral" className="-ml-1">
						<HugeiconsIcon icon={Menu01Icon} size={20} />
					</SidebarTrigger>
					<div className="h-4 w-px bg-border" />
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink render={<Link href="/dashboard" />}>
									Mis negocios
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{business.name}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<div className="ml-auto text-xs text-muted-foreground">
						{business.currencyCode || "COP"}
					</div>
				</header>
				<main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
