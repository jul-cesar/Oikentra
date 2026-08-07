"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { HandCoinsIcon, ReceiptTextIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePublicUsers } from "@/lib/queries/members";
import type { Credit } from "@/lib/fiados-api";
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
	PENDING: {
		label: "Pendiente",
		badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	},
	PAID: {
		label: "Pagado",
		badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	},
	CANCELLED: {
		label: "Anulado",
		badge: "bg-muted text-muted-foreground",
	},
} as const;

export function CreditDetail({
	businessId,
	credit,
	customerName,
	open,
	onOpenChange,
}: {
	businessId: string;
	credit: Credit | null;
	customerName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [paymentOpen, setPaymentOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<{
		type: "credit" | "payment";
		creditId: string;
		paymentId?: string;
	} | null>(null);

	const userIds = useMemo(
		() =>
			credit
				? Array.from(
						new Set([
							credit.userId,
							...credit.payments.map((payment) => payment.userId),
						]),
					)
				: [],
		[credit],
	);
	const users = usePublicUsers(userIds);
	const userNames = useMemo(
		() =>
			new Map(
				(users.data ?? []).map((profile) => [profile.id, profile.name]),
			),
		[users.data],
	);

	const pending = credit?.status === "PENDING";
	const config = credit
		? STATUS_CONFIG[credit.status as keyof typeof STATUS_CONFIG]
		: STATUS_CONFIG.PENDING;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{customerName}</DialogTitle>
						<DialogDescription className="flex flex-wrap items-center gap-2">
							<span
								className={cn(
									"inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
									config.badge,
								)}
							>
								{config.label}
							</span>
							<span>Crédito del {credit?.creditDate ?? ""}</span>
							{credit ? (
								<span>· hace {age(credit.creditDate)} días</span>
							) : null}
						</DialogDescription>
					</DialogHeader>
					<div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
						<div className="grid gap-2 sm:grid-cols-3">
							<SummaryTile label="Original" value={money(credit?.originalAmount ?? 0)} />
							<SummaryTile
								label="Abonado"
								value={money(credit?.paidAmount ?? 0)}
							/>
							<SummaryTile
								label="Saldo pendiente"
								value={money(credit?.remainingAmount ?? 0)}
								emphasis
							/>
						</div>
						{credit?.description ? (
							<div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
								<span className="font-medium">Nota: </span>
								<span className="text-muted-foreground">
									{credit.description}
								</span>
							</div>
						) : null}
						<section>
							<div className="mb-2 flex items-center gap-2">
								<HugeiconsIcon icon={ReceiptTextIcon} size={16} aria-hidden="true" />
								<h3 className="font-medium">
									Abonos ({credit?.payments.length ?? 0})
								</h3>
							</div>
							{credit?.payments.length ? (
								<div className="space-y-2">
									{credit.payments.map((payment) => {
										const cancelled = payment.status === "CANCELLED";
										return (
											<div
												key={payment.id}
												className={cn(
													"flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3",
													cancelled && "opacity-60",
												)}
											>
												<div className="min-w-0">
													<p className="font-medium">
														{money(payment.amount)}
													</p>
													<p className="text-xs text-muted-foreground">
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
																creditId: payment.creditId,
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
								<p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
									Aún no tiene abonos.
								</p>
							)}
						</section>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cerrar
						</Button>
						{pending ? (
							<>
								<Button
									variant="destructive"
									onClick={() =>
										setCancelTarget({
											type: "credit",
											creditId: credit!.id,
										})
									}
								>
									Anular crédito
								</Button>
								<Button onClick={() => setPaymentOpen(true)}>
									<HugeiconsIcon icon={HandCoinsIcon} size={16} aria-hidden="true" />
									Registrar abono
								</Button>
							</>
						) : null}
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<CreatePaymentDialog
				key={`${paymentOpen}-${credit?.id ?? "new"}`}
				businessId={businessId}
				credit={credit}
				open={paymentOpen}
				onOpenChange={setPaymentOpen}
			/>
			<CancelDialog
				businessId={businessId}
				type={cancelTarget?.type ?? "credit"}
				creditId={cancelTarget?.creditId ?? ""}
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
				"rounded-xl border p-4",
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
			<p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
		</div>
	);
}
