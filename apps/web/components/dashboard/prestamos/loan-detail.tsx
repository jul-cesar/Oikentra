"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { HandCoinsIcon, ReceiptTextIcon, CalendarCheck2Icon } from "@hugeicons/core-free-icons";
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
  open,
  onOpenChange,
}: {
  businessId: string;
  loan: Loan | null;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{
    type: "loan" | "payment";
    loanId: string;
    paymentId?: string;
  } | null>(null);

  const userIds = useMemo(
    () =>
      loan
        ? Array.from(
            new Set([
              loan.userId,
              ...loan.payments.map((payment) => payment.userId),
            ]),
          )
        : [],
    [loan],
  );
  const users = usePublicUsers(userIds);
  const userNames = useMemo(
    () =>
      new Map(
        (users.data ?? []).map((profile) => [profile.id, profile.name]),
      ),
    [users.data],
  );

  const pending = loan?.status === "ACTIVE";
  const config = loan
    ? STATUS_CONFIG[loan.status as keyof typeof STATUS_CONFIG]
    : STATUS_CONFIG.ACTIVE;
	const overdue = pending && loan ? loan.installments.some((installment) => installment.status === "OVERDUE") : false;

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
              <span>Préstamo del {loan?.startDate ?? ""}</span>
              {overdue ? (
                <span className="font-medium text-destructive">
                  · vencido hace {age(loan?.dueDate ?? "")} días
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-3">
              <SummaryTile
                label="Capital"
                value={money(loan?.capitalAmount ?? 0)}
              />
              <SummaryTile
                label="Interés"
                value={money(loan?.interestAmount ?? 0)}
              />
              <SummaryTile
                label="Total"
                value={money(loan?.totalAmount ?? 0)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <SummaryTile label="Abonado" value={money(loan?.paidAmount ?? 0)} />
              <SummaryTile
                label="Saldo pendiente"
                value={money(loan?.remainingAmount ?? 0)}
                emphasis
              />
              <SummaryTile
                label="Cuotas"
                value={loan ? String(loan.termCount) : "0"}
              />
            </div>
            {loan?.description ? (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">Nota: </span>
                <span className="text-muted-foreground">{loan.description}</span>
              </div>
            ) : null}
            {loan?.installments.length ? (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <HugeiconsIcon icon={CalendarCheck2Icon} size={16} aria-hidden="true" />
                  <h3 className="font-medium">
                    Cuotas ({loan.installments.length})
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {loan.installments.map((installment) => (
                    <div
                      key={installment.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        Cuota {installment.number} · vence{" "}
						{installment.dueDate} · capital {money(installment.principalAmount)} · interés {money(installment.interestAmount)}
                      </span>
						<span className="text-right font-medium tabular-nums">
							{money(installment.totalAmount)}
							<span className="block text-xs font-normal text-muted-foreground">
								{installment.status === "PAID" ? "Pagada" : `Abonado ${money(installment.paidAmount)}`}
							</span>
						</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <HugeiconsIcon icon={ReceiptTextIcon} size={16} aria-hidden="true" />
                <h3 className="font-medium">
                  Abonos ({loan?.payments.length ?? 0})
                </h3>
              </div>
              {loan?.payments.length ? (
                <div className="space-y-2">
                  {loan.payments.map((payment) => {
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
                          <p className="font-medium">{money(payment.amount)}</p>
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
                      type: "loan",
                      loanId: loan!.id,
                    })
                  }
                >
                  Anular préstamo
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
        key={`${paymentOpen}-${loan?.id ?? "new"}`}
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
