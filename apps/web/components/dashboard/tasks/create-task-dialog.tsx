"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { endOfDayInZone, taskPriorityLabels } from "@/lib/task-board";
import { useCreateTask } from "@/lib/queries/tasks";
import { taskPriorities } from "@/lib/tasks-api";
import { taskFormSchema } from "@/lib/validation/tasks-schemas";

type TaskFormValues = z.infer<typeof taskFormSchema>;

const emptyForm: TaskFormValues = {
	title: "",
	description: "",
	priority: "MEDIUM",
	assigneeMemberId: "",
	dueAt: "",
};

export function CreateTaskDialog({
	businessId,
	members,
	timeZone,
	open,
	onOpenChange,
}: {
	businessId: string;
	members: { id: string; name: string }[];
	timeZone: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const create = useCreateTask(businessId);
	const form = useForm<TaskFormValues>({
		resolver: zodResolver(taskFormSchema),
		defaultValues: emptyForm,
	});

	useEffect(() => {
		if (open) form.reset(emptyForm);
	}, [form, open]);

	async function onSubmit(values: TaskFormValues) {
		try {
			await create.mutateAsync({
				title: values.title,
				description: values.description || null,
				priority: values.priority,
				assigneeMemberId: values.assigneeMemberId || null,
				dueAt: values.dueAt ? endOfDayInZone({ date: values.dueAt, timeZone }) : null,
			});
			onOpenChange(false);
			toast.add({
				type: "success",
				title: "Tarea creada",
				description: "La tarea quedó en la columna Pendiente.",
			});
		} catch (cause) {
			const message =
				cause instanceof Error ? cause.message : "No pudimos crear la tarea.";
			form.setError("root.server", { message });
			toast.add({
				type: "error",
				title: "No pudimos crear la tarea",
				description: message,
				priority: "high",
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nueva tarea</DialogTitle>
					<DialogDescription>
						Describe el trabajo y, si quieres, asígnalo y define una fecha
						límite.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Título</FormLabel>
									<FormControl>
										<Input
											{...field}
											autoFocus
											placeholder="Ej. Pedir inventario"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Descripción (opcional)</FormLabel>
									<FormControl>
										<textarea
											{...field}
											rows={3}
											className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="priority"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Prioridad</FormLabel>
										<Select
											value={field.value}
											onValueChange={field.onChange}
										>
											<SelectTrigger aria-label="Prioridad">
												<SelectValue placeholder="Prioridad" />
											</SelectTrigger>
											<SelectContent>
												{taskPriorities.map((priority) => (
													<SelectItem key={priority} value={priority}>
														{taskPriorityLabels[priority]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="assigneeMemberId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Responsable (opcional)</FormLabel>
										<Select
											value={field.value || "NONE"}
											onValueChange={(value) =>
												field.onChange(value === "NONE" ? "" : value)
											}
										>
											<SelectTrigger aria-label="Responsable">
												<SelectValue placeholder="Sin asignar" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="NONE">Sin asignar</SelectItem>
												{members.map((member) => (
													<SelectItem key={member.id} value={member.id}>
														{member.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name="dueAt"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Fecha límite (opcional)</FormLabel>
									<DatePicker
										value={field.value}
										onChange={field.onChange}
										placeholder="Sin fecha límite"
									/>
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
							<Button type="submit" disabled={create.isPending}>
								{create.isPending ? "Guardando…" : "Crear tarea"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
