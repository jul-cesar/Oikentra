"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/lib/queries/fiados";
import { usePublicUsers } from "@/lib/queries/members";
import type { Customer, Credit } from "@/lib/fiados-api";
import { CreateCreditDialog } from "./create-credit-dialog";
import { CreatePaymentDialog } from "./create-payment-dialog";
import { CancelDialog } from "./cancel-dialog";

const money = (value: number) =>
	new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(value);
const formatDateTime = (value: string) =>
	new Intl.DateTimeFormat("es-CO", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
const age = (date: string) =>
	Math.max(
		0,
		Math.floor(
			(Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / 86400000,
		),
	);

function PaymentHistory({
	credit,
	userNames,
}: {
	credit: Credit;
	userNames: Map<string, string>;
}) {
	if (!credit.payments.length) return null;
	return (
		<details className="mt-3 rounded-xl bg-muted/40 px-4 py-3 text-sm">
			<summary className="cursor-pointer font-medium">
				Ver {credit.payments.length === 1 ? "abono" : "abonos"} (
				{credit.payments.length})
			</summary>
			<div className="mt-3 space-y-3 border-t pt-3">
				{credit.payments.map((payment) => (
					<div
						key={payment.id}
						className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"
					>
						<div className="min-w-0">
							<p>
								{payment.paymentDate}
								{payment.note ? ` · ${payment.note}` : ""}
							</p>
							<p className="text-xs text-muted-foreground">
								Abono registrado {formatDateTime(payment.createdAt)} · por{" "}
								{userNames.get(payment.userId) ?? "Usuario"}
							</p>
						</div>
						<span className="shrink-0 font-medium tabular-nums">
							{money(payment.amount)}
						</span>
					</div>
				))}
			</div>
		</details>
	);
}

export function CustomerDetail({
	businessId,
	customer,
}: {
	businessId: string;
	customer: Customer;
}) {
	const {
		data: credits = [],
		isLoading,
		error,
		refetch,
	} = useCredits(businessId);
	const [createOpen, setCreateOpen] = useState(false);
	const [paymentCredit, setPaymentCredit] = useState<Credit | null>(null);
	const [cancelCredit, setCancelCredit] = useState<Credit | null>(null);
	const customerCredits = credits.filter(
		(credit) => credit.customerId === customer.id,
	);
	const creditUserIds = useMemo(
		() =>
			Array.from(
				new Set(
					customerCredits.flatMap((credit) => [
						credit.userId,
						...credit.payments.map((payment) => payment.userId),
					]),
				),
			),
		[customerCredits],
	);
	const creditUsers = usePublicUsers(creditUserIds);
	const creditUserNames = useMemo(
		() =>
			new Map(
				(creditUsers.data ?? []).map((profile) => [profile.id, profile.name]),
			),
		[creditUsers.data],
	);
	const pending = customerCredits.filter(
		(credit) => credit.status === "PENDING",
	);
	const closed = customerCredits.filter(
		(credit) => credit.status !== "PENDING",
	);

	return (
		<>
			<div className="mx-auto max-w-5xl space-y-5 py-2 sm:space-y-6 sm:py-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<Button
							variant="ghost"
							className="-ml-3 mb-2 rounded-xl"
							render={<Link href={`/dashboard/${businessId}/fiados`} />}
						>
							<HugeiconsIcon
								icon={ArrowLeft01Icon}
								size={16}
								aria-hidden="true"
							/>
							Volver a fiados
						</Button>
						<p className="text-sm font-medium text-primary">
							Detalle del cliente
						</p>
						<h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
							{customer.name}
						</h1>
						<p className="mt-1.5 text-muted-foreground">
							{customer.phone || "Sin teléfono"} · Debe{" "}
							{money(customer.totalDebt)}
						</p>
					</div>
					<Button
						size="lg"
						className="rounded-xl"
						onClick={() => setCreateOpen(true)}
					>
						<HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
						Nuevo fiado para este cliente
					</Button>
				</div>

				<div className="rounded-3xl border bg-card p-4 sm:p-6 lg:p-8">
					{isLoading ? (
						<p className="py-16 text-center text-sm text-muted-foreground">
							Cargando deudas…
						</p>
					) : error ? (
						<div className="py-12 text-center">
							<p className="text-sm text-destructive">
								No pudimos cargar el detalle.
							</p>
							<Button
								className="mt-3"
								variant="outline"
								onClick={() => void refetch()}
							>
								Reintentar
							</Button>
						</div>
					) : (
						<div className="space-y-8">
							<section>
								<div className="mb-3 flex items-center justify-between">
									<h2 className="text-lg font-semibold tracking-tight">
										Pendientes
									</h2>
									<span className="text-sm text-muted-foreground">
										{pending.length}
									</span>
								</div>
								{pending.length ? (
									<div className="space-y-3">
										{pending.map((credit) => (
											<div
												key={credit.id}
												className="rounded-2xl border p-4 sm:p-5"
											>
												<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
													<div className="min-w-0">
														<p className="text-lg font-semibold tabular-nums">
															{money(credit.remainingAmount)}{" "}
															<span className="text-xs font-normal text-muted-foreground">
																pendiente
															</span>
														</p>
														<p className="mt-1 text-sm text-muted-foreground">
															{credit.description || "Sin nota"} · hace{" "}
															{age(credit.creditDate)} días · creado{" "}
															{formatDateTime(credit.createdAt)} · por{" "}
															{creditUserNames.get(credit.userId) ?? "Usuario"}
														</p>
													</div>
													<div className="flex shrink-0 gap-2">
														<Button
															size="sm"
															onClick={() => setPaymentCredit(credit)}
														>
															Abonar
														</Button>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => setCancelCredit(credit)}
														>
															Anular
														</Button>
													</div>
												</div>
												<p className="mt-3 text-sm text-muted-foreground">
													Original {money(credit.originalAmount)} · Abonado{" "}
													{money(credit.paidAmount)}
												</p>
												<PaymentHistory
													credit={credit}
													userNames={creditUserNames}
												/>
											</div>
										))}
									</div>
								) : (
									<p className="rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
										No tiene fiados pendientes.
									</p>
								)}
							</section>

							<section>
								<h2 className="mb-3 text-lg font-semibold tracking-tight">
									Historial
								</h2>
								{closed.length ? (
									<div className="space-y-3">
										{closed.map((credit) => (
											<div
												key={credit.id}
												className="rounded-2xl border p-4 text-sm sm:p-5"
											>
												<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
													<span className="min-w-0">
														{credit.status === "PAID" ? "Pagado" : "Anulado"} ·{" "}
														{credit.creditDate} ·{" "}
														{formatDateTime(credit.createdAt)} · por{" "}
														{creditUserNames.get(credit.userId) ?? "Usuario"}
													</span>
													<span className="shrink-0 font-medium tabular-nums">
														{money(credit.originalAmount)}
													</span>
												</div>
												{credit.status === "PAID" ? (
													<PaymentHistory
														credit={credit}
														userNames={creditUserNames}
													/>
												) : null}
											</div>
										))}
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										Aún no hay fiados cerrados.
									</p>
								)}
							</section>
						</div>
					)}
				</div>
			</div>

			<CreateCreditDialog
				key={String(createOpen)}
				businessId={businessId}
				customers={[customer]}
				open={createOpen}
				initialCustomer={customer}
				onOpenChange={setCreateOpen}
			/>
			<CreatePaymentDialog
				key={`${Boolean(paymentCredit)}-${paymentCredit?.id ?? "new"}`}
				businessId={businessId}
				credit={paymentCredit}
				open={Boolean(paymentCredit)}
				onOpenChange={(value) => {
					if (!value) setPaymentCredit(null);
				}}
			/>
			<CancelDialog
				businessId={businessId}
				type="credit"
				creditId={cancelCredit?.id ?? ""}
				open={Boolean(cancelCredit)}
				onOpenChange={(value) => {
					if (!value) setCancelCredit(null);
				}}
			/>
		</>
	);
}
