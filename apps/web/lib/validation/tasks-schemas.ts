import { z } from "zod";

import { taskPriorities } from "@/lib/tasks-api";

export const MAX_TASK_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_TASK_ATTACHMENTS = 10;
export const TASK_ATTACHMENT_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"application/pdf",
] as const;

export const taskFormSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Escribe el título de la tarea.")
		.max(160, "El título no puede superar 160 caracteres."),
	description: z
		.string()
		.trim()
		.max(1000, "La descripción no puede superar 1000 caracteres."),
	priority: z.enum(taskPriorities),
	assigneeMemberId: z.string(),
	dueAt: z.string(),
});

export const taskCommentFormSchema = z.object({
	body: z
		.string()
		.trim()
		.min(1, "Escribe un comentario.")
		.max(1000, "El comentario no puede superar 1000 caracteres."),
});

export function validateTaskAttachment(file: { type: string; size: number }) {
	if (!(TASK_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
		return "Sube una imagen JPG, PNG, WebP o un PDF.";
	}
	if (file.size > MAX_TASK_ATTACHMENT_BYTES) {
		return "El archivo debe pesar máximo 10 MB.";
	}
	return null;
}

// Adds dropped/selected files to a pending list, keeping only valid ones and
// never exceeding the per-task limit. The backend re-validates on confirm.
export function addTaskAttachmentFiles(
	current: File[],
	incoming: File[],
	limit = MAX_TASK_ATTACHMENTS,
) {
	const files = [...current];
	const errors: string[] = [];
	for (const file of incoming) {
		const invalid = validateTaskAttachment(file);
		if (invalid) {
			errors.push(`${file.name}: ${invalid}`);
		} else if (files.length >= limit) {
			if (!errors.includes("Máximo 10 adjuntos por tarea."))
				errors.push("Máximo 10 adjuntos por tarea.");
		} else {
			files.push(file);
		}
	}
	return { files, errors };
}
