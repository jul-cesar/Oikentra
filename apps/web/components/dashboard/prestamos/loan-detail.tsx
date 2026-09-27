"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
	ArrowLeft01Icon,
	CalendarCheck2Icon,
	HandCoinsIcon,
	ReceiptTextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePublicUsers } from "@/lib/queries/members";
import type { Loan } from "@/lib/loans-api";
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

const STATUS_CONFIG = {
	ACTIVE: {
		label: "Activo",
		badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	},
	PAID: {
		label: "Pagado",
		badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	},
	DEFAULT: {
		label: "En mora",
		badge: "bg-destructive/10 text-destructive",
	},
	CANCELLED: {
		label: "Anulado",
		badge: "bg-muted text-muted-foreground",
	},
} as const;

export function LoanDetail({
	businessId,
	loan,
	customerName,
}: {
	businessId: string;
	loan: Loan;
	customerName: string;
}) {
	const [paymentOpen, setPaymentOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<{
		type: "loan" | "payment";
		loanId: string;
		paymentId?: string;
	} | null>(null);

	const userIds = useMemo(
		() =>
			Array.from(
				new Set([
					loan.userId,
					...loan.payments.map((payment) => payment.userId),
				]),
			),
		[loan],
	);
	const users = usePublicUsers(userIds);
	const userNames = useMemo(
		() =>
			new Map((users.data ?? []).map((profile) => [profile.id, profile.name])),
		[users.data],
	);
	const pending = loan.status === "ACTIVE";
	const config = STATUS_CONFIG[loan.status];
	const overdue =
		pending &&
		loan.installments.some((installment) => installment.status === "OVERDUE");

	return (
		<>
			<div className="mx-auto max-w-5xl space-y-5 py-2 sm:space-y-6 sm:py-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<Button
							variant="ghost"
							className="-ml-3 mb-2 rounded-xl"
							render={<Link href={`/dashboard/${businessId}/prestamos`} />}
						>
							<HugeiconsIcon
								icon={ArrowLeft01Icon}
								size={16}
								aria-hidden="true"
							/>
							Volver a préstamos
						</Button>
						<p className="text-sm font-medium text-primary">
							Detalle del préstamo
						</p>
						<h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
							{customerName}
						</h1>
						<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							<span
								className={cn(
									"inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
									config.badge,
								)}
							>
								{config.label}
							</span>
							<span>Préstamo del {loan.startDate}</span>
							{overdue ? (
								<span className="font-medium text-destructive">
									· vencido hace {age(loan.dueDate)} días
								</span>
							) : null}
						</div>
					</div>
					{pending ? (
						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								className="rounded-xl text-destructive"
								onClick={() =>
									setCancelTarget({ type: "loan", loanId: loan.id })
								}
							>
								Anular préstamo
							</Button>
							<Button
								size="lg"
								className="rounded-xl"
								onClick={() => setPaymentOpen(true)}
							>
								<HugeiconsIcon
									icon={HandCoinsIcon}
									size={16}
									aria-hidden="true"
								/>
								Registrar abono
							</Button>
						</div>
					) : null}
				</div>

				<div className="rounded-3xl border bg-card p-4 sm:p-6 lg:p-8">
					<div className="grid gap-3 sm:grid-cols-3">
						<SummaryTile label="Capital" value={money(loan.capitalAmount)} />
						<SummaryTile label="Interés" value={money(loan.interestAmount)} />
						<SummaryTile label="Total" value={money(loan.totalAmount)} />
					</div>
					<div className="mt-3 grid gap-3 sm:grid-cols-3">
						<SummaryTile label="Abonado" value={money(loan.paidAmount)} />
						<SummaryTile
							label="Saldo pendiente"
							value={money(loan.remainingAmount)}
							emphasis
						/>
						<SummaryTile label="Cuotas" value={String(loan.termCount)} />
					</div>

					{loan.description ? (
						<div className="mt-6 rounded-2xl bg-muted/50 px-4 py-3 text-sm">
							<span className="font-medium">Nota: </span>
							<span className="text-muted-foreground">{loan.description}</span>
						</div>
					) : null}

					{loan.installments.length ? (
						<section className="mt-8">
							<div className="mb-3 flex items-center gap-2">
								<HugeiconsIcon
									icon={CalendarCheck2Icon}
									size={18}
									aria-hidden="true"
								/>
								<h2 className="text-lg font-semibold tracking-tight">
									Cuotas ({loan.installments.length})
								</h2>
							</div>
							<div className="space-y-2">
								{loan.installments.map((installment) => (
									<div
										key={installment.id}
										className="flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
									>
										<span className="text-sm text-muted-foreground">
											Cuota {installment.number} · vence {installment.dueDate} ·
											capital {money(installment.principalAmount)} · interés{" "}
											{money(installment.interestAmount)}
										</span>
										<span className="text-left font-medium tabular-nums sm:text-right">
											{money(installment.totalAmount)}
											<span className="block text-xs font-normal text-muted-foreground">
												{installment.status === "PAID"
													? "Pagada"
													: `Abonado ${money(installment.paidAmount)}`}
											</span>
										</span>
									</div>
								))}
							</div>
						</section>
					) : null}

					<section className="mt-8">
						<div className="mb-3 flex items-center gap-2">
							<HugeiconsIcon
								icon={ReceiptTextIcon}
								size={18}
								aria-hidden="true"
							/>
							<h2 className="text-lg font-semibold tracking-tight">
								Abonos ({loan.payments.length})
							</h2>
						</div>
						{loan.payments.length ? (
							<div className="space-y-3">
								{loan.payments.map((payment) => {
									const cancelled = payment.status === "CANCELLED";
									return (
										<div
											key={payment.id}
											className={cn(
												"flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
												cancelled && "opacity-60",
											)}
										>
											<div className="min-w-0">
												<p className="text-lg font-semibold tabular-nums">
													{money(payment.amount)}
												</p>
												<p className="text-sm text-muted-foreground">
													{payment.paymentDate}
													{payment.note ? ` · ${payment.note}` : ""}
												</p>
												<p className="text-xs text-muted-foreground">
													Registrado {formatDateTime(payment.createdAt)} · por{" "}
													{userNames.get(payment.userId) ?? "Usuario"}
												</p>
												{cancelled && payment.cancellationReason ? (
													<p className="text-xs text-muted-foreground">
														Anulado: {payment.cancellationReason}
													</p>
												) : null}
											</div>
											{cancelled ? (
												<span className="shrink-0 text-xs font-medium text-muted-foreground">
													Anulado
												</span>
											) : (
												<Button
													size="sm"
													variant="ghost"
													className="shrink-0 text-muted-foreground"
													onClick={() =>
														setCancelTarget({
															type: "payment",
															loanId: payment.loanId,
															paymentId: payment.id,
														})
													}
												>
													Anular
												</Button>
											)}
										</div>
									);
								})}
							</div>
						) : (
							<p className="rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
								Aún no tiene abonos.
							</p>
						)}
					</section>
				</div>
			</div>

			<CreatePaymentDialog
				key={`${paymentOpen}-${loan.id}`}
				businessId={businessId}
				loan={loan}
				open={paymentOpen}
				onOpenChange={setPaymentOpen}
			/>
			<CancelDialog
				businessId={businessId}
				type={cancelTarget?.type ?? "loan"}
				loanId={cancelTarget?.loanId ?? ""}
				paymentId={cancelTarget?.paymentId}
				open={Boolean(cancelTarget)}
				onOpenChange={(value) => {
					if (!value) setCancelTarget(null);
				}}
			/>
		</>
	);
}

function SummaryTile({
	label,
	value,
	emphasis,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<div
			className={cn(
				"rounded-2xl border p-4 sm:p-5",
				emphasis && "bg-primary text-primary-foreground",
			)}
		>
			<p
				className={cn(
					"text-xs font-medium",
					emphasis ? "text-primary-foreground/80" : "text-muted-foreground",
				)}
			>
				{label}
			</p>
			<p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
				{value}
			</p>
		</div>
	);
}
