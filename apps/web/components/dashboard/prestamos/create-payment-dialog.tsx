"use client";

import { useForm, useWatch } from "react-hook-form";
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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import type { Loan } from "@/lib/loans-api";
import { useCreateLoanPayment } from "@/lib/queries/loans";
import {
  createLoanPaymentFormSchema,
  type CreateLoanPaymentFormValues,
} from "@/lib/validation/loans-schemas";

const today = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function CreatePaymentDialog({
  businessId,
  loan,
  open,
  onOpenChange,
}: {
  businessId: string;
  loan: Loan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateLoanPayment(businessId);
  const form = useForm<CreateLoanPaymentFormValues>({
    resolver: zodResolver(createLoanPaymentFormSchema),
    defaultValues: { amount: "", paymentDate: today(), note: "" },
  });
  const amount = Number(useWatch({ control: form.control, name: "amount" }));
  async function onSubmit(values: CreateLoanPaymentFormValues) {
    if (!loan) return;
    if (Number(values.amount) > loan.remainingAmount) {
      const message = "El abono no puede ser mayor a lo que debe el cliente.";
      toast.add({
        type: "warning",
        title: "Revisa el monto",
        description: message,
      });
      return form.setError("amount", { message });
    }
    try {
      await mutation.mutateAsync({
        loanId: loan.id,
        input: {
          amount: Number(values.amount),
          paymentDate: values.paymentDate,
          ...(values.note ? { note: values.note } : {}),
        },
      });
      form.reset();
      onOpenChange(false);
      toast.add({
        type: "success",
        title: "Abono registrado",
        description: "El pago se agregó a la cartera y al saldo del préstamo.",
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "No pudimos registrar el abono.";
      form.setError("root.server", { message });
      toast.add({
        type: "error",
        title: "No pudimos registrar el abono",
        description: message,
        priority: "high",
      });
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            Este abono se descuenta de la cartera de préstamos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Saldo pendiente</p>
              <p className="mt-1 text-2xl font-semibold">
                {money(loan?.remainingAmount ?? 0)}
              </p>
            </div>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cuánto abonó?</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max={loan?.remainingAmount}
                        step="1"
                        inputMode="numeric"
                        placeholder="0"
                        autoFocus
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        form.setValue(
                          "amount",
                          String(loan?.remainingAmount ?? 0),
                          { shouldValidate: true },
                        )
                      }
                    >
                      Pagar todo
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej. cuota 1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {amount > 0 && amount === loan?.remainingAmount ? (
              <p className="text-sm font-medium text-emerald-600">
                Con este abono la deuda quedará pagada.
              </p>
            ) : null}
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
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando…" : "Registrar abono"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
