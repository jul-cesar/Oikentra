"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowLeft02Icon,
	Delete02Icon,
	File01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { getAttachmentPreview } from "@/components/dashboard/tasks/attachment-preview";
import { AttachmentDropzone } from "@/components/dashboard/tasks/attachment-dropzone";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useMembers, usePublicUsers } from "@/lib/queries/members";
import { useCreateTask } from "@/lib/queries/tasks";
import {
	assignableMembers,
	endOfDayInZone,
	taskPriorityLabels,
} from "@/lib/task-board";
import { taskPriorities, uploadTaskAttachment } from "@/lib/tasks-api";
import {
	addTaskAttachmentFiles,
	taskFormSchema,
} from "@/lib/validation/tasks-schemas";

type TaskFormValues = z.infer<typeof taskFormSchema>;

const emptyForm: TaskFormValues = {
	title: "",
	description: "",
	priority: "MEDIUM",
	assigneeMemberId: "",
	dueAt: "",
};

function LocalFilePreview({ file }: { file: File }) {
	const [url] = useState(() =>
		file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
	);

	useEffect(
		() => () => {
			if (url) URL.revokeObjectURL(url);
		},
		[url],
	);

	return url ? (
		// eslint-disable-next-line @next/next/no-img-element -- local object URL selected by the user
		<img src={url} alt="" className="h-full w-full object-cover" />
	) : (
		<HugeiconsIcon
			icon={File01Icon}
			size={34}
			className="text-muted-foreground"
			aria-hidden="true"
		/>
	);
}

export function CreateTaskPage({
	businessId,
	role,
	userId,
	timeZone,
}: {
	businessId: string;
	role: "OWNER" | "MANAGER" | "OPERATOR";
	userId: string | undefined;
	timeZone: string;
}) {
	const router = useRouter();
	const backHref = `/dashboard/${businessId}/tareas`;
	const create = useCreateTask(businessId);
	const members = useMembers(businessId);
	const users = usePublicUsers(
		(members.data ?? []).map((member) => member.userId),
	);
	const form = useForm<TaskFormValues>({
		resolver: zodResolver(taskFormSchema),
		defaultValues: emptyForm,
	});
	const [files, setFiles] = useState<File[]>([]);
	const [fileErrors, setFileErrors] = useState<string[]>([]);
	const [uploading, setUploading] = useState(false);

	const memberOptions = useMemo(
		() =>
			(members.data ?? []).map((member) => ({
				id: member.id,
				userId: member.userId,
				name:
					users.data?.find((user) => user.id === member.userId)?.name ??
					"Integrante",
			})),
		[members.data, users.data],
	);
	const memberId = memberOptions.find((member) => member.userId === userId)?.id;
	const availableMembers = assignableMembers({
		role,
		memberId,
		members: memberOptions,
	});

	function addFiles(incoming: File[]) {
		const result = addTaskAttachmentFiles(files, incoming);
		setFiles(result.files);
		setFileErrors(result.errors);
	}

	async function uploadPending(taskId: string) {
		const failed: string[] = [];
		for (const file of files) {
			try {
				await uploadTaskAttachment({ businessId, taskId, file });
			} catch {
				failed.push(file.name);
			}
		}
		return failed;
	}

	async function onSubmit(values: TaskFormValues) {
		try {
			const task = await create.mutateAsync({
				title: values.title,
				description: values.description || null,
				priority: values.priority,
				assigneeMemberId: values.assigneeMemberId || null,
				dueAt: values.dueAt
					? endOfDayInZone({ date: values.dueAt, timeZone })
					: null,
			});
			setUploading(true);
			const failed = files.length ? await uploadPending(task.id) : [];
			setUploading(false);
			toast.add(
				failed.length
					? {
							type: "warning",
							title: "Tarea creada sin algunos adjuntos",
							description: `No pudimos subir: ${failed.join(", ")}. Puedes reintentar desde el detalle de la tarea.`,
							priority: "high",
						}
					: {
							type: "success",
							title: "Tarea creada",
							description: "La tarea quedó en la columna Pendiente.",
						},
			);
			router.replace(backHref);
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

	const busy = create.isPending || uploading;

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div>
				<Link
					href={backHref}
					className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<HugeiconsIcon icon={ArrowLeft02Icon} size={18} aria-hidden="true" />
					Volver al tablero
				</Link>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight">Nueva tarea</h1>
				<p className="mt-2 text-muted-foreground">
					Define el trabajo, asígnalo y agrega el contexto necesario.
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
				>
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Información de la tarea</CardTitle>
								<CardDescription>
									Explica qué debe hacerse y cuál es el resultado esperado.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-5">
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
													rows={7}
													placeholder="Agrega instrucciones, contexto o criterios de finalización."
													className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 w-full resize-y rounded-lg border px-3 py-2.5 text-sm outline-none focus-visible:ring-3"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Adjuntos</CardTitle>
								<CardDescription>
									Añade imágenes o documentos que ayuden a completar la tarea.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<AttachmentDropzone disabled={busy} onFilesAction={addFiles} />
								{files.length ? (
									<ul className="grid gap-3 sm:grid-cols-2">
										{files.map((file, index) => {
											const preview = getAttachmentPreview(file.type, file.size);
											return (
												<li
													key={`${file.name}-${file.lastModified}`}
													className="overflow-hidden rounded-xl border bg-muted/20"
												>
													<div className="flex h-32 items-center justify-center bg-muted/50">
														<LocalFilePreview file={file} />
													</div>
													<div className="flex items-center gap-3 p-3">
														<div className="min-w-0 flex-1">
															<p className="truncate text-sm font-medium" title={file.name}>
																{file.name}
															</p>
															<p className="text-xs text-muted-foreground">{preview.size}</p>
														</div>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															aria-label={`Quitar ${file.name}`}
															disabled={busy}
															onClick={() =>
																setFiles(files.filter((_, i) => i !== index))
															}
														>
															<HugeiconsIcon icon={Delete02Icon} size={17} aria-hidden="true" />
														</Button>
													</div>
												</li>
											);
										})}
									</ul>
								) : null}
								{fileErrors.length ? (
									<ul role="alert" className="space-y-1 text-sm text-destructive">
										{fileErrors.map((error) => (
											<li key={error}>{error}</li>
										))}
									</ul>
								) : null}
							</CardContent>
						</Card>
					</div>

					<Card className="lg:sticky lg:top-6">
						<CardHeader>
							<CardTitle>Organización</CardTitle>
							<CardDescription>Define quién y cuándo.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-5">
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
												{availableMembers.map((member) => (
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
						</CardContent>
						<CardFooter className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								className="flex-1"
								render={<Link href={backHref} />}
							>
								Cancelar
							</Button>
							<Button type="submit" className="flex-1" disabled={busy}>
								{uploading
									? "Subiendo…"
									: create.isPending
										? "Guardando…"
										: "Crear tarea"}
							</Button>
						</CardFooter>
					</Card>
				</form>
			</Form>
		</div>
	);
}
