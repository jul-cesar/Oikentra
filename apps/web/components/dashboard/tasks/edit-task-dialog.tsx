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
import { useUpdateTask } from "@/lib/queries/tasks";
import {
	dueDateInZone,
	endOfDayInZone,
	taskErrorMessage,
	taskPriorityLabels,
} from "@/lib/task-board";
import { taskPriorities, type Task } from "@/lib/tasks-api";
import { taskFormSchema } from "@/lib/validation/tasks-schemas";

type TaskFormValues = z.infer<typeof taskFormSchema>;

export function EditTaskDialog({
	businessId,
	task,
	timeZone,
	open,
	onOpenChange,
	onConflict,
}: {
	businessId: string;
	task: Task;
	timeZone: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConflict: () => void;
}) {
	const update = useUpdateTask(businessId);
	const initialDate = dueDateInZone({ value: task.dueAt, timeZone });
	const form = useForm<TaskFormValues>({
		resolver: zodResolver(taskFormSchema),
		defaultValues: {
			title: task.title,
			description: task.description ?? "",
			priority: task.priority,
			assigneeMemberId: "",
			dueAt: initialDate,
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				title: task.title,
				description: task.description ?? "",
				priority: task.priority,
				assigneeMemberId: "",
				dueAt: initialDate,
			});
		}
	}, [form, open, task, initialDate]);

	async function onSubmit(values: TaskFormValues) {
		try {
			await update.mutateAsync({
				taskId: task.id,
				input: {
					version: task.version,
					title: values.title,
					description: values.description || null,
					priority: values.priority,
					// An untouched date keeps its original time instead of snapping to end of day.
					...(values.dueAt === initialDate
						? {}
						: {
								dueAt: values.dueAt
									? endOfDayInZone({ date: values.dueAt, timeZone })
									: null,
							}),
				},
			});
			onOpenChange(false);
			toast.add({ type: "success", title: "Tarea actualizada" });
		} catch (cause) {
			const error =
				cause instanceof Error ? cause : new Error("No pudimos guardar la tarea.");
			const message = taskErrorMessage(error);
			form.setError("root.server", { message });
			toast.add({
				type: "error",
				title: "No pudimos guardar la tarea",
				description: message,
				priority: "high",
			});
			onConflict();
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Editar tarea</DialogTitle>
					<DialogDescription>
						Cambia el título, la descripción, la prioridad o la fecha límite.
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
										<Input {...field} autoFocus />
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
										<Select value={field.value} onValueChange={field.onChange}>
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
							<Button type="submit" disabled={update.isPending}>
								{update.isPending ? "Guardando…" : "Guardar cambios"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
