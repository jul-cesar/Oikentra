export function getAttachmentPreview(contentType: string, sizeBytes: number) {
	return {
		kind: contentType.startsWith("image/") ? ("image" as const) : ("pdf" as const),
		size:
			sizeBytes >= 1024 * 1024
				? `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
				: `${Math.round(sizeBytes / 1024)} KB`,
	};
}
