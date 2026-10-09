"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { useCreateTaskComment, useTaskComments } from "@/lib/queries/tasks";
import { sortTaskComments } from "@/lib/task-board";
import { taskCommentFormSchema } from "@/lib/validation/tasks-schemas";

type CommentFormValues = z.infer<typeof taskCommentFormSchema>;

export function TaskComments({
	businessId,
	taskId,
	authorNames,
	timeZone,
}: {
	businessId: string;
	taskId: string;
	authorNames: Map<string, string>;
	timeZone: string;
}) {
	const comments = useTaskComments({ businessId, taskId });
	const create = useCreateTaskComment(businessId, taskId);
	const form = useForm<CommentFormValues>({
		resolver: zodResolver(taskCommentFormSchema),
		defaultValues: { body: "" },
	});

	async function onSubmit(values: CommentFormValues) {
		try {
			await create.mutateAsync(values.body);
			form.reset({ body: "" });
		} catch (cause) {
			toast.add({
				type: "error",
				title: "No pudimos enviar el comentario",
				description:
					cause instanceof Error ? cause.message : "Intenta de nuevo.",
				priority: "high",
			});
		}
	}

	return (
		<section aria-labelledby="task-comments-title" className="space-y-4">
			<h2 id="task-comments-title" className="text-lg font-semibold">
				Comentarios
			</h2>
			{comments.isLoading ? (
				<p className="text-sm text-muted-foreground">Cargando comentarios…</p>
			) : comments.error ? (
				<div className="text-sm">
					<p className="text-muted-foreground">
						No pudimos cargar los comentarios.
					</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-2"
						onClick={() => void comments.refetch()}
					>
						Reintentar
					</Button>
				</div>
			) : comments.data?.length ? (
				<ol className="space-y-3">
					{sortTaskComments(comments.data).map((comment) => (
						<li key={comment.id} className="rounded-lg border p-3 text-sm">
							<p className="flex flex-wrap items-baseline gap-x-2">
								<span className="font-medium">
									{authorNames.get(comment.authorUserId) ?? "Integrante"}
								</span>
								<time
									dateTime={comment.createdAt}
									className="text-xs text-muted-foreground"
								>
									{new Intl.DateTimeFormat("es-CO", {
										dateStyle: "medium",
										timeStyle: "short",
										timeZone,
									}).format(new Date(comment.createdAt))}
								</time>
							</p>
							<p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
						</li>
					))}
				</ol>
			) : (
				<p className="text-sm text-muted-foreground">
					Aún no hay comentarios. Escribe el primero.
				</p>
			)}
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
					<FormField
						control={form.control}
						name="body"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Nuevo comentario</FormLabel>
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
					<Button type="submit" disabled={create.isPending}>
						{create.isPending ? "Enviando…" : "Comentar"}
					</Button>
				</form>
			</Form>
		</section>
	);
}
