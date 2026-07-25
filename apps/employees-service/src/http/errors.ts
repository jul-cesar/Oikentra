import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodError } from "zod";

export class AppError extends Error {
	constructor(
		public readonly code: string,
		public readonly status: ContentfulStatusCode,
		message: string,
		public readonly details: unknown = null,
	) {
		super(message);
	}
}

export function validationError(error: ZodError) {
	return new AppError(
		"VALIDATION_ERROR",
		400,
		"The request contains invalid data.",
		error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		})),
	);
}
