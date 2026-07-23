"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCancelCashMovement } from "@/lib/queries/cash-movements";
import {
  cancelMovementFormSchema,
  type CancelMovementFormValues,
} from "@/lib/validation/ventas-schemas";
import type { CashMovement } from "@/lib/cash-movements-api";

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function CancelMovementDialog({
  businessId,
  movement,
  open,
  onOpenChange,
}: {
  businessId: string;
  movement: CashMovement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCancelCashMovement(businessId);
  const form = useForm<CancelMovementFormValues>({
    resolver: zodResolver(cancelMovementFormSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: CancelMovementFormValues) {
    if (!movement) return;
    try {
      await mutation.mutateAsync({
        movementId: movement.id,
        reason: values.reason,
      });
      form.reset();
      onOpenChange(false);
    } catch (cause) {
      form.setError("root.server", {
        message:
          cause instanceof Error
            ? cause.message
            : "No pudimos anular el movimiento.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular movimiento</DialogTitle>
          <DialogDescription>
            El registro no se borrará, pero dejará de afectar los saldos.
          </DialogDescription>
        </DialogHeader>
        {movement ? (
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              {movement.type === "SALE"
                ? "Venta"
                : movement.type === "EXPENSE"
                  ? "Gasto"
                  : "Pago fiado"}
              {" · "}
              {movement.businessDate}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {money(movement.amount)}
            </p>
            {movement.category ? (
              <p className="text-xs text-muted-foreground">
                {movement.category}
              </p>
            ) : null}
          </div>
        ) : null}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej. lo registré por error"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root?.server?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root.server.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Volver
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? "Anulando…"
                  : "Confirmar anulación"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
