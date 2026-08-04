"use client";

import { useEffect } from "react";
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
import { toast } from "@/components/ui/toast";
import { useCreateCategory, useUpdateCategory } from "@/lib/queries/categories";
import {
	categoryFormSchema,
	type CategoryFormValues,
} from "@/lib/validation/category-schemas";
import type { CashMovementCategory } from "@/lib/categories-api";

export function CreateCategoryDialog({
	businessId,
	category,
	open,
	onOpenChange,
}: {
	businessId: string;
	category: CashMovementCategory | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const create = useCreateCategory(businessId);
	const update = useUpdateCategory(businessId);
	const isEditing = Boolean(category);
	const form = useForm<CategoryFormValues>({
		resolver: zodResolver(categoryFormSchema),
		defaultValues: { name: "" },
	});

	useEffect(() => {
		if (open) {
			form.reset({ name: category?.name ?? "" });
		}
	}, [open, category, form]);

	async function onSubmit(values: CategoryFormValues) {
		try {
			if (isEditing && category) {
				await update.mutateAsync({
					categoryId: category.id,
					name: values.name.trim(),
				});
			} else {
				await create.mutateAsync({ name: values.name.trim() });
			}
			form.reset();
			onOpenChange(false);
			toast.add({
				type: "success",
				title: isEditing ? "Categoría actualizada" : "Categoría creada",
				description: isEditing
					? "El nombre de la categoría se actualizó correctamente."
					: "La categoría ya está disponible para ventas y gastos.",
			});
		} catch (cause) {
			const message =
				cause instanceof Error
					? cause.message
					: "No pudimos guardar la categoría.";
			form.setError("root.server", { message });
			toast.add({
				type: "error",
				title: "No pudimos guardar la categoría",
				description: message,
				priority: "high",
			});
		}
	}

	const pending = create.isPending || update.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar categoría" : "Nueva categoría"}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Cambia el nombre de esta categoría."
							: "Agrega una categoría para organizar tus ventas y gastos."}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nombre</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="Ej. Venta diaria, Servicio, Propina"
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
								Cancelar
							</Button>
							<Button type="submit" disabled={pending}>
								{pending
									? "Guardando…"
									: isEditing
										? "Guardar cambios"
										: "Crear categoría"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
