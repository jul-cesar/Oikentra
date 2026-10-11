"use client";

import { useParams } from "next/navigation";

import { PaymentMethodsSettings } from "@/components/dashboard/payment-methods-settings";

export default function Page() {
  const { businessId } = useParams<{ businessId: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Medios de pago</h1>
        <p className="mt-2 text-muted-foreground">
          Define las opciones disponibles al registrar una venta.
        </p>
      </div>
      <PaymentMethodsSettings businessId={businessId} />
    </div>
  );
}
