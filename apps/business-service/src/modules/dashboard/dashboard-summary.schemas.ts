import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
	from: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
		.optional(),
	to: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
		.optional(),
});
