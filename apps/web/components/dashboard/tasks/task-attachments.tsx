"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
import { getTaskAttachmentDownload, type TaskAttachment } from "@/lib/tasks-api";
import {
	TASK_ATTACHMENT_TYPES,
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
	const input = useRef<HTMLInputElement>(null);
	// The file stays here after a failure so retrying needs no new selection.
	const [failed, setFailed] = useState<{
		file: File;
		message: string;
		retryable: boolean;
	} | null>(null);

	function send(file: File) {
		const invalid = validateTaskAttachment(file);
		if (invalid) {
			setFailed({ file, message: invalid, retryable: false });
			return;
		}
		setFailed(null);
		upload.mutate(file, {
			onError: (error) =>
				setFailed({
					file,
					message: `${error.message} Revisa tu conexión y reintenta.`,
					retryable: true,
				}),
		});
	}

	function open(attachmentId: string) {
		// Open the tab synchronously so popup blockers allow it, then point it
		// to a fresh signed URL.
		const tab = window.open("", "_blank");
		download.mutate(attachmentId, {
			onSuccess: ({ downloadUrl }) => {
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
				<label htmlFor="task-attachment-file" className="text-sm font-medium">
					Agregar archivo
				</label>
				<input
					ref={input}
					id="task-attachment-file"
					type="file"
					accept={TASK_ATTACHMENT_TYPES.join(",")}
					disabled={upload.isPending}
					className="block w-full text-sm"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) send(file);
						if (input.current) input.current.value = "";
					}}
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
								onClick={() => send(failed.file)}
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
