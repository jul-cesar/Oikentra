"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LoanDetail } from "@/components/dashboard/prestamos/loan-detail";
import { Button } from "@/components/ui/button";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useSession } from "@/hooks/use-session";
import { useCustomer } from "@/lib/queries/fiados";
import { useLoan } from "@/lib/queries/loans";
import { useBusiness } from "@/lib/queries/onboarding";

export default function LoanDetailRoute() {
	return (
		<AuthGuard>
			<LoanDetailContent />
		</AuthGuard>
	);
}

function LoanDetailContent() {
	const { user } = useSession();
	const { businessId, loanId } = useParams<{
		businessId: string;
		loanId: string;
	}>();
	const businessQuery = useBusiness(businessId);
	const loanQuery = useLoan(businessId, loanId);
	const customerQuery = useCustomer(
		businessId,
		loanQuery.data?.customerId ?? null,
	);

	if (
		businessQuery.isLoading ||
		loanQuery.isLoading ||
		(customerQuery.isLoading && loanQuery.data) ||
		!user
	) {
		return (
			<OikentraLoader
				label="Cargando detalle del préstamo"
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
	if (loanQuery.error || !loanQuery.data) {
		return (
			<DashboardShell business={businessQuery.data} user={user}>
				<div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
					<p className="text-muted-foreground">
						No pudimos cargar este préstamo.
					</p>
					<Button render={<Link href={`/dashboard/${businessId}/prestamos`} />}>
						Volver a préstamos
					</Button>
				</div>
			</DashboardShell>
		);
	}

	return (
		<DashboardShell business={businessQuery.data} user={user}>
			<LoanDetail
				businessId={businessId}
				loan={loanQuery.data}
				customerName={customerQuery.data?.name ?? "Cliente"}
			/>
		</DashboardShell>
	);
}
