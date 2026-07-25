"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { saveActiveBusinessId } from "@/lib/onboarding-api";
import { useBusiness } from "@/lib/queries/onboarding";
import { useCashMovements } from "@/lib/queries/cash-movements";
import { usePublicUsers } from "@/lib/queries/members";
import type { CashMovement } from "@/lib/cash-movements-api";
import { Button } from "@/components/ui/button";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const movementTypeLabel: Record<CashMovement["type"], string> = {
	SALE: "Venta",
	EXPENSE: "Gasto",
	CREDIT_PAYMENT: "Abono fiado",
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
	currency: "COP",
	maximumFractionDigits: 0,
	style: "currency",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
	dateStyle: "short",
	timeStyle: "short",
});

export default function BusinessDashboard() {
	return (
		<AuthGuard>
			<BusinessDashboardContent />
		</AuthGuard>
	);
}

function BusinessDashboardContent() {
	const { user } = useSession();
	const params = useParams<{ businessId: string }>();
	const router = useRouter();
	const { data: business, isLoading, error } = useBusiness(params.businessId);
	const movements = useCashMovements(params.businessId);
	const movementUserIds = useMemo(
		() =>
			Array.from(
				new Set((movements.data ?? []).map((movement) => movement.userId)),
			),
		[movements.data],
	);
	const movementUsers = usePublicUsers(movementUserIds);
	const movementUserNames = useMemo(
		() =>
			new Map(
				(movementUsers.data ?? []).map((profile) => [profile.id, profile.name]),
			),
		[movementUsers.data],
	);

	useEffect(() => {
		saveActiveBusinessId(params.businessId);
	}, [params.businessId]);

	if (error)
		return (
			<div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
				<p className="text-muted-foreground">{error.message}</p>
				<Button onClick={() => router.push("/dashboard")}>
					Volver a mis negocios
				</Button>
			</div>
		);
	if (isLoading || !business || !user)
		return (
			<OikentraLoader label="Cargando tu negocio" className="min-h-[60vh]" />
		);
	return (
		<DashboardShell business={business} user={user}>
			<div className="mx-auto max-w-6xl">
				<div className="mb-8">
					<p className="text-sm font-medium">Resumen de {business.name}</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight">
						Buenos días, {user.name?.split(" ")[0] || "bienvenido"}
					</h1>
					<p className="mt-2 text-muted-foreground">
						Todo lo importante de tu negocio, en un solo lugar.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<EmptyMetric
						label="Ventas de hoy"
						value="$0"
						detail="Aún no hay movimientos registrados"
					/>
					<EmptyMetric
						label="Dinero por cobrar"
						value="$0"
						detail="Tus fiados aparecerán aquí"
					/>
					<EmptyMetric
						label="Clientes activos"
						value="0"
						detail="Comienza agregando un cliente"
					/>
				</div>
				<Card className="mt-4">
					<CardHeader>
						<CardTitle>Empieza con lo esencial</CardTitle>
						<CardDescription>
							Elige una acción para poner tu negocio en marcha.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-3">
						<Button
							onClick={() => router.push(`/dashboard/${business.id}/fiados`)}
						>
							Registrar un fiado
						</Button>
						<Button
							variant="outline"
							onClick={() =>
								router.push(`/dashboard/${business.id}/configuracion`)
							}
						>
							Configurar negocio
						</Button>
					</CardContent>
				</Card>
				<CashMovementsCard
					isLoading={movements.isLoading}
					movements={movements.data ?? []}
					userNames={movementUserNames}
				/>
			</div>
		</DashboardShell>
	);
}
function EmptyMetric({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardDescription>{label}</CardDescription>
				<CardTitle className="text-2xl">{value}</CardTitle>
			</CardHeader>
			<CardContent className="text-xs text-muted-foreground">
				{detail}
			</CardContent>
		</Card>
	);
}

function CashMovementsCard({
	isLoading,
	movements,
	userNames,
}: {
	isLoading: boolean;
	movements: CashMovement[];
	userNames: Map<string, string>;
}) {
	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>Movimientos recientes</CardTitle>
				<CardDescription>
					Ventas, gastos y abonos registrados en este negocio.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<p className="text-sm text-muted-foreground">Cargando movimientos…</p>
				) : movements.length ? (
					<div className="divide-y rounded-lg border">
						{movements.map((movement) => (
							<MovementRow
								key={movement.id}
								movement={movement}
								registeredBy={userNames.get(movement.userId) ?? movement.userId}
							/>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						Aún no hay movimientos registrados.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function MovementRow({
	movement,
	registeredBy,
}: {
	movement: CashMovement;
	registeredBy: string;
}) {
	const amountPrefix = movement.type === "EXPENSE" ? "-" : "+";
	const amountClassName =
		movement.type === "EXPENSE" ? "text-destructive" : "text-primary";

	return (
		<div className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0 space-y-1">
				<p className="font-medium">{movementTypeLabel[movement.type]}</p>
				<p className="text-muted-foreground">{movement.note || "Sin nota"}</p>
				<div className="space-y-0.5 text-xs text-muted-foreground">
					<p>
						Hecho el {dateTimeFormatter.format(new Date(movement.occurredAt))}
					</p>
					<p>
						{movement.type === "CREDIT_PAYMENT"
							? "Pago registrado por"
							: "Registrado por"}
						: {registeredBy}
					</p>
					{movement.sourceCustomer ? (
						<p>A nombre de: {movement.sourceCustomer.name}</p>
					) : null}
				</div>
			</div>
			<p className={`shrink-0 font-semibold ${amountClassName}`}>
				{amountPrefix}
				{currencyFormatter.format(movement.amount)}
			</p>
		</div>
	);
}
