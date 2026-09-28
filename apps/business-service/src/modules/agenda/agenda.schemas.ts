import { z } from "zod";

const instant = z.string().datetime({ offset: true });
const eventFields = {
	title: z.string().trim().min(1).max(160),
	description: z.string().trim().max(1000).nullable().optional(),
	startAt: instant,
	endAt: instant,
	allDay: z.boolean().optional(),
	reminderAt: instant.nullable().optional(),
};

export const agendaRangeSchema = z
	.object({ start: instant, end: instant })
	.refine((range) => range.end > range.start, {
		message: "End must be after start.",
		path: ["end"],
	});

export const createAgendaEventSchema = z
	.object(eventFields)
	.refine((event) => event.endAt > event.startAt, {
		message: "End must be after start.",
		path: ["endAt"],
	});

export const updateAgendaEventSchema = z
	.object(eventFields)
	.partial()
	.refine(
		(event) => !event.startAt || !event.endAt || event.endAt > event.startAt,
		{ message: "End must be after start.", path: ["endAt"] },
	);

export const agendaEventParamsSchema = z.object({
	businessId: z.string().min(1),
	eventId: z.string().uuid(),
});
