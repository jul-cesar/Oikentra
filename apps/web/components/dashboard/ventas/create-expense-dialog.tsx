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
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
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
import { useCreateExpense } from "@/lib/queries/cash-movements";
import { useCategories } from "@/lib/queries/categories";
import {
	createSaleFormSchema,
	type CreateSaleFormValues,
} from "@/lib/validation/ventas-schemas";

function today(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function localIsoNow(): string {
	const now = new Date();
	const offset = -now.getTimezoneOffset();
	const sign = offset >= 0 ? "+" : "-";
	const abs = Math.abs(offset);
	const hh = String(Math.floor(abs / 60)).padStart(2, "0");
	const mm = String(abs % 60).padStart(2, "0");
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}${sign}${hh}:${mm}`;
}

export function CreateExpenseDialog({
	businessId,
	open,
	onOpenChange,
}: {
	businessId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const mutation = useCreateExpense(businessId);
	const categoriesQuery = useCategories(businessId);
	const categories = categoriesQuery.data ?? [];
	const form = useForm<CreateSaleFormValues>({
		resolver: zodResolver(createSaleFormSchema),
		defaultValues: {
			amount: "",
			category: "",
			paymentMethod: "",
			note: "",
			businessDate: today(),
		},
	});

	async function onSubmit(values: CreateSaleFormValues) {
		try {
			await mutation.mutateAsync({
				amount: Number(values.amount),
				businessDate: values.businessDate,
				occurredAt: localIsoNow(),
				...(values.category ? { category: values.category } : {}),
				...(values.note ? { note: values.note } : {}),
			});
			form.reset();
			onOpenChange(false);
			toast.add({
				type: "success",
				title: "Gasto registrado",
				description: "El gasto se agregó a los movimientos de caja.",
			});
		} catch (cause) {
			const message =
				cause instanceof Error
					? cause.message
					: "No pudimos registrar el gasto.";
			form.setError("root.server", { message });
			toast.add({
				type: "error",
				title: "No pudimos registrar el gasto",
				description: message,
				priority: "high",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nuevo gasto</DialogTitle>
					<DialogDescription>
						Registra el dinero que salió de tu caja.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
											autoFocus
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="category"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Categoría</FormLabel>
									<FormControl>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue placeholder="Sin categoría" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="">Sin categoría</SelectItem>
												{categories.map((cat) => (
													<SelectItem key={cat.id} value={cat.name}>
														{cat.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="businessDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Fecha</FormLabel>
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
									<FormLabel>Nota (opcional)</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Ej. compra de insumos" />
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
								Cancelar
							</Button>
							<Button type="submit" disabled={mutation.isPending}>
								{mutation.isPending ? "Guardando…" : "Registrar gasto"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
