"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CustomerDetail } from "@/components/dashboard/fiados/customer-detail";
import { Button } from "@/components/ui/button";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useSession } from "@/hooks/use-session";
import { useCustomer } from "@/lib/queries/fiados";
import { useBusiness } from "@/lib/queries/onboarding";

export default function CustomerDetailRoute() {
	return (
		<AuthGuard>
			<CustomerDetailContent />
		</AuthGuard>
	);
}

function CustomerDetailContent() {
	const { user } = useSession();
	const { businessId, customerId } = useParams<{
		businessId: string;
		customerId: string;
	}>();
	const businessQuery = useBusiness(businessId);
	const customerQuery = useCustomer(businessId, customerId);

	if (businessQuery.isLoading || customerQuery.isLoading || !user) {
		return (
			<OikentraLoader
				label="Cargando detalle del fiado"
				className="min-h-[60vh]"
			/>
		);
	}
	if (businessQuery.error || !businessQuery.data) {
		return (
			<div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
				<p className="text-muted-foreground">No pudimos cargar este negocio.</p>
				<Button render={<Link href="/dashboard" />}>
					Volver a mis negocios
				</Button>
			</div>
		);
	}
	if (customerQuery.error || !customerQuery.data) {
		return (
			<DashboardShell business={businessQuery.data} user={user}>
				<div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
					<p className="text-muted-foreground">
						No pudimos cargar este cliente.
					</p>
					<Button render={<Link href={`/dashboard/${businessId}/fiados`} />}>
						Volver a fiados
					</Button>
				</div>
			</DashboardShell>
		);
	}

	return (
		<DashboardShell business={businessQuery.data} user={user}>
			<CustomerDetail businessId={businessId} customer={customerQuery.data} />
		</DashboardShell>
	);
}
