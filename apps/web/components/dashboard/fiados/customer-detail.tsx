"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCredits } from "@/lib/queries/fiados";
import type { Customer, Credit } from "@/lib/fiados-api";
import { CreatePaymentDialog } from "./create-payment-dialog";
import { CancelDialog } from "./cancel-dialog";

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
const age = (date: string) =>
  Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / 86400000,
    ),
  );

function PaymentHistory({ credit }: { credit: Credit }) {
  if (!credit.payments.length) return null;
  return (
    <details className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">
        Ver {credit.payments.length === 1 ? "abono" : "abonos"} ({credit.payments.length})
      </summary>
      <div className="mt-2 space-y-2 border-t pt-2">
        {credit.payments.map((payment) => (
          <div key={payment.id} className="flex items-start justify-between gap-3 text-xs">
            <div>
              <p>{payment.paymentDate}{payment.note ? ` · ${payment.note}` : ""}</p>
              <p className="text-muted-foreground">Abono registrado</p>
            </div>
            <span className="font-medium">{money(payment.amount)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

export function CustomerDetail({
  businessId,
  customer,
  open,
  onOpenChange,
  onNewCredit,
}: {
  businessId: string;
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewCredit: () => void;
}) {
  const {
    data: credits = [],
    isLoading,
    error,
    refetch,
  } = useCredits(businessId);
  const [paymentCredit, setPaymentCredit] = useState<Credit | null>(null);
  const [cancelCredit, setCancelCredit] = useState<Credit | null>(null);
  const customerCredits = credits.filter(
    (credit) => credit.customerId === customer?.id,
  );
  const pending = customerCredits.filter(
    (credit) => credit.status === "PENDING",
  );
  const closed = customerCredits.filter(
    (credit) => credit.status !== "PENDING",
  );
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{customer?.name}</DialogTitle>
            <DialogDescription>
              {customer?.phone || "Sin teléfono"} · Debe{" "}
              {money(customer?.totalDebt ?? 0)}
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando deudas…
            </p>
          ) : error ? (
            <div className="py-6 text-center">
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
            <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">Pendientes</h3>
                  <span className="text-sm text-muted-foreground">
                    {pending.length}
                  </span>
                </div>
                {pending.length ? (
                  <div className="space-y-2">
                    {pending.map((credit) => (
                      <div key={credit.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {money(credit.remainingAmount)}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                pendiente
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {credit.description || "Sin nota"} · hace{" "}
                              {age(credit.creditDate)} días
                            </p>
                          </div>
                          <div className="flex gap-2">
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
                        <p className="mt-2 text-xs text-muted-foreground">
                          Original {money(credit.originalAmount)} · Abonado{" "}
                          {money(credit.paidAmount)}
                        </p>
                        <PaymentHistory credit={credit} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                    No tiene fiados pendientes.
                  </p>
                )}
              </section>
              <section>
                <h3 className="mb-2 font-medium">Historial</h3>
                {closed.length ? (
                  <div className="space-y-2">
                    {closed.map((credit) => (
                      <div key={credit.id} className="rounded-lg border px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            {credit.status === "PAID" ? "Pagado" : "Anulado"} ·{" "}
                            {credit.creditDate}
                          </span>
                          <span className="text-muted-foreground">
                            {money(credit.originalAmount)}
                          </span>
                        </div>
                        {credit.status === "PAID" ? <PaymentHistory credit={credit} /> : null}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={onNewCredit}>Nuevo fiado para este cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
