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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { useCreateCustomer } from "@/lib/queries/fiados";
import { useCreateLoan } from "@/lib/queries/loans";
import {
  createLoanFormSchema,
  type CreateLoanFormValues,
} from "@/lib/validation/loans-schemas";
import type { Customer } from "@/lib/fiados-api";

const NEW_CUSTOMER = "__new__";
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

export function CreateLoanDialog({
  businessId,
  customers,
  open,
  onOpenChange,
}: {
  businessId: string;
  customers: Customer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createCustomer = useCreateCustomer(businessId);
  const createLoan = useCreateLoan(businessId);
  const form = useForm<CreateLoanFormValues>({
    resolver: zodResolver(createLoanFormSchema),
    defaultValues: {
      customerId: "",
      newCustomerName: "",
      newCustomerPhone: "",
      newCustomerNotes: "",
      capitalAmount: "",
      interestAmount: "",
      termCount: "1",
      loanDate: today(),
      dueDate: "",
      note: "",
    },
  });
  const customerId = useWatch({ control: form.control, name: "customerId" });
  const capital = Number(useWatch({ control: form.control, name: "capitalAmount" }));
  const interest = Number(useWatch({ control: form.control, name: "interestAmount" }));
  const total = capital + interest;
  const creatingCustomer = customerId === NEW_CUSTOMER;

  async function onSubmit(values: CreateLoanFormValues) {
    try {
      let selectedCustomerId = values.customerId;
      if (creatingCustomer) {
        const customer = await createCustomer.mutateAsync({
          name: values.newCustomerName.trim(),
          ...(values.newCustomerPhone.trim()
            ? { phone: values.newCustomerPhone.trim() }
            : {}),
          ...(values.newCustomerNotes.trim()
            ? { notes: values.newCustomerNotes.trim() }
            : {}),
        });
        selectedCustomerId = customer.id;
      }
      await createLoan.mutateAsync({
        customerId: selectedCustomerId,
        capitalAmount: Number(values.capitalAmount),
        interestAmount: Number(values.interestAmount),
        termCount: Number(values.termCount),
        loanDate: values.loanDate,
        ...(values.dueDate ? { dueDate: values.dueDate } : {}),
        ...(values.note ? { description: values.note } : {}),
      });
      form.reset();
      onOpenChange(false);
      toast.add({
        type: "success",
        title: "Préstamo guardado",
        description: "El préstamo quedó registrado en la cartera.",
      });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No pudimos guardar el préstamo.";
      form.setError("root.server", { message });
      toast.add({
        type: "error",
        title: "No pudimos guardar el préstamo",
        description: message,
        priority: "high",
      });
    }
  }

  const pending = createCustomer.isPending || createLoan.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo préstamo</DialogTitle>
          <DialogDescription>
            Registra el dinero que prestaste y aún no has recuperado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger autoFocus>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                        <SelectItem value={NEW_CUSTOMER}>
                          + Crear cliente nuevo
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {creatingCustomer ? (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">Datos del nuevo cliente</p>
                <FormField
                  control={form.control}
                  name="newCustomerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej. Ana Pérez" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newCustomerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="tel"
                          placeholder="300 123 4567"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newCustomerNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cliente frecuente" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="capitalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capital prestado</FormLabel>
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
                name="interestAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interés (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="termCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuotas</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="24"
                        step="1"
                        inputMode="numeric"
                        placeholder="1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha del préstamo</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vence el (opcional)</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
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
                  <FormLabel>Nota del préstamo (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej. préstamo personal" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Este préstamo queda por cobrar.{" "}
              <strong className="text-foreground">
                No entra a caja hasta que pague.
              </strong>
              {total > 0 ? ` Total a recuperar: ${money(total)}.` : ""}
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
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Guardar préstamo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
