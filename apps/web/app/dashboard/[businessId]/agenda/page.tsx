"use client";

import { useParams } from "next/navigation";

import { AuthGuard } from "@/components/auth-guard";
import { AgendaPage } from "@/components/dashboard/agenda/agenda-page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useSession } from "@/hooks/use-session";
import { useBusiness } from "@/lib/queries/onboarding";

export default function Page() {
	return (
		<AuthGuard>
			<AgendaRoute />
		</AuthGuard>
	);
}

function AgendaRoute() {
	const { user } = useSession();
	const { businessId } = useParams<{ businessId: string }>();
	const { data: business, isLoading, error } = useBusiness(businessId);
	if (isLoading || !business || !user) {
		return <OikentraLoader label="Cargando agenda" className="min-h-[60vh]" />;
	}
	if (error) {
		return (
			<p className="mx-auto max-w-lg py-20 text-center text-muted-foreground">
				No pudimos cargar este negocio.
			</p>
		);
	}
	return (
		<DashboardShell business={business} user={user}>
			<AgendaPage
				businessId={businessId}
				timeZone={business.timezone || "America/Bogota"}
				currencyCode={business.currencyCode || "COP"}
			/>
		</DashboardShell>
	);
}
