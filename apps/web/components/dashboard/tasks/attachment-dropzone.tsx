"use client";

import { useId, useRef, useState } from "react";
import { Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { TASK_ATTACHMENT_TYPES } from "@/lib/validation/tasks-schemas";

// Native drag-and-drop file target with a keyboard/click fallback input.
export function AttachmentDropzone({
	onFilesAction,
	disabled,
	className,
}: {
	onFilesAction: (files: File[]) => void;
	disabled?: boolean;
	className?: string;
}) {
	const id = useId();
	const input = useRef<HTMLInputElement>(null);
	const [over, setOver] = useState(false);

	return (
		<label
			htmlFor={id}
			onDragOver={(event) => {
				event.preventDefault();
				if (!disabled) setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(event) => {
				event.preventDefault();
				setOver(false);
				if (!disabled) onFilesAction(Array.from(event.dataTransfer.files));
			}}
			className={cn(
				"flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/30 focus-within:ring-3 focus-within:ring-ring/50",
				over && "border-primary bg-primary/5 text-foreground",
				disabled && "cursor-not-allowed opacity-60",
				className,
			)}
		>
			<span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
				<HugeiconsIcon icon={Upload04Icon} size={22} aria-hidden="true" />
			</span>
			<span className="font-medium text-foreground">
				Arrastra archivos aquí o haz clic para elegir
			</span>
			<span className="text-xs">JPG, PNG, WebP o PDF · máximo 10 MB · hasta 10 archivos</span>
			<input
				ref={input}
				id={id}
				type="file"
				multiple
				accept={TASK_ATTACHMENT_TYPES.join(",")}
				disabled={disabled}
				className="sr-only"
				onChange={(event) => {
					const files = Array.from(event.target.files ?? []);
					if (files.length) onFilesAction(files);
					if (input.current) input.current.value = "";
				}}
			/>
		</label>
	);
}
