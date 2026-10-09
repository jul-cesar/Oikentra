"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AttachmentDropzone } from "@/components/dashboard/tasks/attachment-dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
	tasksQueryKeys,
	useDeleteTaskAttachment,
	useTaskAttachmentDownload,
	useTaskAttachments,
	useUploadTaskAttachment,
} from "@/lib/queries/tasks";
import { canDeleteTaskAttachment } from "@/lib/task-board";
import {
	getTaskAttachmentDownload,
	isTrustedR2Url,
	type TaskAttachment,
} from "@/lib/tasks-api";
import {
	MAX_TASK_ATTACHMENTS,
	validateTaskAttachment,
} from "@/lib/validation/tasks-schemas";

function ImageThumbnail({
	businessId,
	taskId,
	attachment,
}: {
	businessId: string;
	taskId: string;
	attachment: TaskAttachment;
}) {
	// The thumbnail URL is signed and short-lived; it is requested on display
	// and never stored with the attachment.
	const download = useQuery({
		queryKey: [
			...tasksQueryKeys.attachments(businessId, taskId),
			attachment.id,
			"thumbnail",
		],
		queryFn: () =>
			getTaskAttachmentDownload({
				businessId,
				taskId,
				attachmentId: attachment.id,
			}),
		staleTime: 60_000,
	});
	return download.data ? (
		// eslint-disable-next-line @next/next/no-img-element -- signed private URL, not optimizable by next/image
		<img
			src={download.data.downloadUrl}
			alt={attachment.fileName}
			className="size-12 rounded object-cover"
		/>
	) : (
		<div className="size-12 rounded bg-muted" aria-hidden="true" />
	);
}

export function TaskAttachments({
	businessId,
	taskId,
	role,
}: {
	businessId: string;
	taskId: string;
	role: "OWNER" | "MANAGER" | "OPERATOR";
}) {
	const attachments = useTaskAttachments({ businessId, taskId });
	const upload = useUploadTaskAttachment(businessId, taskId);
	const remove = useDeleteTaskAttachment(businessId, taskId);
	const download = useTaskAttachmentDownload(businessId, taskId);
	// Files stay here after a failure so retrying needs no new selection.
	const [failed, setFailed] = useState<{
		files: File[];
		message: string;
		retryable: boolean;
	} | null>(null);

	// Uploads one file at a time; the backend enforces the 10-attachment limit.
	async function send(files: File[]) {
		setFailed(null);
		const room = MAX_TASK_ATTACHMENTS - (attachments.data?.length ?? 0);
		if (files.length > room) {
			setFailed({
				files: [],
				message: `Solo puedes agregar ${Math.max(room, 0)} archivo(s) más. Máximo ${MAX_TASK_ATTACHMENTS} por tarea.`,
				retryable: false,
			});
			return;
		}
		for (const [index, file] of files.entries()) {
			const invalid = validateTaskAttachment(file);
			if (invalid) {
				setFailed({ files: [], message: `${file.name}: ${invalid}`, retryable: false });
				return;
			}
			try {
				await upload.mutateAsync(file);
			} catch (error) {
				setFailed({
					files: files.slice(index),
					message: `${file.name}: ${error instanceof Error ? error.message : "No pudimos subir el archivo."}`,
					retryable: true,
				});
				return;
			}
		}
	}

	function open(attachmentId: string) {
		// Open the tab synchronously so popup blockers allow it, then point it
		// to a fresh signed URL.
		const tab = window.open("", "_blank");
		download.mutate(attachmentId, {
			onSuccess: ({ downloadUrl }) => {
				if (!isTrustedR2Url(downloadUrl)) {
					tab?.close();
					toast.add({
						type: "error",
						title: "No pudimos abrir el archivo",
						description: "La URL del archivo no es válida.",
						priority: "high",
					});
					return;
				}
				if (tab) tab.location.href = downloadUrl;
				else window.location.assign(downloadUrl);
			},
			onError: (error) => {
				tab?.close();
				toast.add({
					type: "error",
					title: "No pudimos abrir el archivo",
					description: error.message,
					priority: "high",
				});
			},
		});
	}

	return (
		<section aria-labelledby="task-attachments-title" className="space-y-4">
			<h2 id="task-attachments-title" className="text-lg font-semibold">
				Adjuntos
			</h2>
			{attachments.isLoading ? (
				<p className="text-sm text-muted-foreground">Cargando adjuntos…</p>
			) : attachments.error ? (
				<div className="text-sm">
					<p className="text-muted-foreground">No pudimos cargar los adjuntos.</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-2"
						onClick={() => void attachments.refetch()}
					>
						Reintentar
					</Button>
				</div>
			) : attachments.data?.length ? (
				<ul className="space-y-2">
					{attachments.data.map((attachment) => (
						<li
							key={attachment.id}
							className="flex items-center gap-3 rounded-lg border p-3 text-sm"
						>
							{attachment.contentType.startsWith("image/") ? (
								<ImageThumbnail
									businessId={businessId}
									taskId={taskId}
									attachment={attachment}
								/>
							) : null}
							<span className="min-w-0 flex-1 truncate">
								{attachment.fileName}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => open(attachment.id)}
							>
								{attachment.contentType === "application/pdf"
									? "Abrir PDF"
									: "Abrir"}
							</Button>
							{canDeleteTaskAttachment(role) ? (
								<Button
									variant="ghost"
									size="sm"
									disabled={remove.isPending}
									onClick={() =>
										remove.mutate(attachment.id, {
											onError: (error) =>
												toast.add({
													type: "error",
													title: "No pudimos eliminar el adjunto",
													description: error.message,
													priority: "high",
												}),
										})
									}
								>
									Eliminar
								</Button>
							) : null}
						</li>
					))}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">
					Aún no hay adjuntos. Puedes subir imágenes JPG, PNG, WebP o PDF de
					hasta 10 MB.
				</p>
			)}
			<div className="space-y-2">
				<AttachmentDropzone
					disabled={upload.isPending}
					onFiles={(files) => void send(files)}
				/>
				{upload.isPending ? (
					<p role="status" className="text-sm text-muted-foreground">
						Subiendo archivo…
					</p>
				) : null}
				{failed ? (
					<div role="alert" className="text-sm text-destructive">
						<p>{failed.message}</p>
						{failed.retryable ? (
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={() => void send(failed.files)}
							>
								Reintentar
							</Button>
						) : null}
					</div>
				) : null}
			</div>
		</section>
	);
}
