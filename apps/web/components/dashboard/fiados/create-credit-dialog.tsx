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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateCredit, useCreateCustomer } from "@/lib/queries/fiados";
import {
  createCreditFormSchema,
  type CreateCreditFormValues,
} from "@/lib/validation/fiados-schemas";
import type { Customer } from "@/lib/fiados-api";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function CreateCreditDialog({
  businessId,
  customers,
  open,
  onOpenChange,
  initialCustomer,
}: {
  businessId: string;
  customers: Customer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomer?: Customer | null;
}) {
  const createCustomer = useCreateCustomer(businessId);
  const createCredit = useCreateCredit(businessId);
  const form = useForm<CreateCreditFormValues>({
    resolver: zodResolver(createCreditFormSchema),
    defaultValues: {
      customerName: initialCustomer?.name ?? "",
      amount: "",
      creditDate: today(),
      note: "",
    },
  });
  const amount = Number(useWatch({ control: form.control, name: "amount" }));
  async function onSubmit(values: CreateCreditFormValues) {
    try {
      const customer =
        customers.find(
          (item) =>
            item.name.toLocaleLowerCase() ===
            values.customerName.trim().toLocaleLowerCase(),
        ) ??
        (await createCustomer.mutateAsync({
          name: values.customerName.trim(),
        }));
      await createCredit.mutateAsync({
        customerId: customer.id,
        originalAmount: Number(values.amount),
        creditDate: values.creditDate,
        ...(values.note ? { description: values.note } : {}),
      });
      form.reset();
      onOpenChange(false);
    } catch (cause) {
      form.setError("root.server", {
        message:
          cause instanceof Error
            ? cause.message
            : "No pudimos guardar el fiado.",
      });
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo fiado</DialogTitle>
          <DialogDescription>
            Registra lo que un cliente se llevó y aún no ha pagado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      list="customer-options"
                      placeholder="Busca o escribe un nombre"
                      autoFocus
                    />
                  </FormControl>
                  <datalist id="customer-options">
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.name} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej. mercado de la semana" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Este fiado queda por cobrar.{" "}
              <strong className="text-foreground">
                No entra a caja hasta que pague.
              </strong>
              {amount > 0 ? ` ${money(amount)}.` : ""}
            </div>
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
              <Button
                type="submit"
                disabled={createCustomer.isPending || createCredit.isPending}
              >
                {createCustomer.isPending || createCredit.isPending
                  ? "Guardando…"
                  : "Guardar fiado"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
