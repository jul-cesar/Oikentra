import { describe, expect, test } from "bun:test";

const agendaServicePath = "./agenda.service";
const agendaModule = await import(agendaServicePath).catch(() => null);

function createRepository() {
	const events = new Map<string, any>();
	const reminders = new Map<string, any>();
	const tasks: any[] = [];
	const taskQueries: any[] = [];
	const repository = {
		async createEvent(input: any, reminder?: any) {
			events.set(input.id, input);
			if (reminder) reminders.set(input.id, reminder);
			return input;
		},
		async findEventsByBusinessAndRange() {
			return [...events.values()];
		},
		async findCreditsDueByBusinessAndRange() {
			return [
				{
					credit: {
						id: "credit-a",
						customerId: "customer-a",
						originalAmount: 50_000,
						dueDate: "2026-04-10",
					},
					customerName: "Pedro",
				},
			];
		},
		async findActiveCreditPayments() {
			return [{ creditId: "credit-a", amount: 20_000 }];
		},
		async findLoanInstallmentsDueByBusinessAndRange() {
			return [
				{
					installment: {
						id: "installment-a",
						loanId: "loan-a",
						number: 2,
						dueDate: "2026-04-20",
						totalAmount: 40_000,
						paidAmount: 10_000,
						status: "PARTIAL",
					},
					customerId: "customer-b",
					customerName: "Marta",
				},
			];
		},
		async findTasksDueByBusinessAndRange(input: any) {
			taskQueries.push(input);
			return tasks;
		},
		async updateEvent({ eventId, businessId, patch }: any) {
			const current = events.get(eventId);
			if (!current || current.businessId !== businessId) return null;
			const updated = { ...current, ...patch };
			events.set(eventId, updated);
			return updated;
		},
		async cancelEvent({ eventId, businessId, updatedAt }: any) {
			const current = events.get(eventId);
			if (!current || current.businessId !== businessId) return null;
			const updated = { ...current, status: "CANCELLED", updatedAt };
			events.set(eventId, updated);
			return updated;
		},
	};
	return { repository, events, reminders, tasks, taskQueries };
}

describe("agenda service", () => {
	test("combines manual events, fiados and loan installments", async () => {
		expect(agendaModule).not.toBeNull();
		if (!agendaModule) return;
		const { repository, events } = createRepository();
		events.set("event-a", {
			id: "event-a",
			userId: "user-a",
			businessId: "business-a",
			title: "Entregar pedido",
			description: null,
			startAt: new Date("2026-04-15T14:00:00.000Z"),
			endAt: new Date("2026-04-15T15:00:00.000Z"),
			allDay: false,
			reminderAt: null,
			status: "SCHEDULED",
			createdAt: new Date("2026-04-01T00:00:00.000Z"),
			updatedAt: new Date("2026-04-01T00:00:00.000Z"),
		});

		const service = agendaModule.createAgendaService({
			repository: repository as never,
			now: () => new Date("2026-04-12T12:00:00.000Z"),
			authorize: async () => undefined,
		});
		const items = await service.list({
			userId: "user-a",
			businessId: "business-a",
			range: {
				start: "2026-04-01T00:00:00.000Z",
				end: "2026-05-01T00:00:00.000Z",
			},
		});

		expect(items.map((item: { source: string }) => item.source)).toEqual([
			"CREDIT",
			"EVENT",
			"LOAN_INSTALLMENT",
		]);
		expect(items[0]).toMatchObject({
			title: "Cobro a Pedro",
			amount: 30_000,
			status: "OVERDUE",
			readOnly: true,
		});
		expect(items[2]).toMatchObject({
			title: "Cuota 2 · Marta",
			amount: 30_000,
			status: "SCHEDULED",
			readOnly: true,
		});
	});

	test("schedules an email reminder atomically with the event", async () => {
		expect(agendaModule).not.toBeNull();
		if (!agendaModule) return;
		const { repository, reminders } = createRepository();
		const service = agendaModule.createAgendaService({
			repository: repository as never,
			now: () => new Date("2026-04-01T12:00:00.000Z"),
			authorize: async () => undefined,
		});

		const created = await service.create({
			userId: "user-a",
			recipientEmail: "owner@example.com",
			businessId: "business-a",
			input: {
				title: "Llamar proveedor",
				startAt: "2026-04-15T14:00:00.000Z",
				endAt: "2026-04-15T14:30:00.000Z",
				reminderAt: "2026-04-15T13:00:00.000Z",
			},
		});

		expect(reminders.get(created.id)).toEqual({
			recipientEmail: "owner@example.com",
			scheduledAt: new Date("2026-04-15T13:00:00.000Z"),
		});
	});

	test("creates, updates and cancels manual events", async () => {
		expect(agendaModule).not.toBeNull();
		if (!agendaModule) return;
		const { repository } = createRepository();
		const service = agendaModule.createAgendaService({
			repository: repository as never,
			now: () => new Date("2026-04-01T12:00:00.000Z"),
			authorize: async () => undefined,
		});

		const created = await service.create({
			userId: "user-a",
			businessId: "business-a",
			input: {
				title: "Llamar proveedor",
				startAt: "2026-04-15T14:00:00.000Z",
				endAt: "2026-04-15T14:30:00.000Z",
				allDay: false,
			},
		});
		const updated = await service.update({
			userId: "user-a",
			businessId: "business-a",
			eventId: created.id,
			input: { title: "Llamar proveedor principal" },
		});
		const cancelled = await service.cancel({
			userId: "user-a",
			businessId: "business-a",
			eventId: created.id,
		});

		expect(updated.title).toBe("Llamar proveedor principal");
		expect(cancelled.status).toBe("CANCELLED");
	});

	test("projects dated tasks once as read-only all-day items in the business day", async () => {
		expect(agendaModule).not.toBeNull();
		if (!agendaModule) return;
		const { repository, tasks, taskQueries } = createRepository();
		const task = (id: string, status: string, dueAt: string) => ({
			task: {
				id,
				businessId: "business-a",
				title: `Tarea ${id}`,
				description: `Detalle ${id}`,
				status,
				dueAt: new Date(dueAt),
			},
			timeZone: "America/Bogota",
		});
		tasks.push(
			task("todo", "TODO", "2026-04-20T03:00:00.000Z"),
			task("progress", "IN_PROGRESS", "2026-04-25T12:00:00.000Z"),
			task("late", "TODO", "2026-04-12T11:00:00.000Z"),
			task("done", "DONE", "2026-04-05T12:00:00.000Z"),
		);
		const service = agendaModule.createAgendaService({
			repository: repository as never,
			now: () => new Date("2026-04-12T12:00:00.000Z"),
			authorize: async () => undefined,
		});

		const items = await service.list({
			userId: "user-a",
			businessId: "business-a",
			range: {
				start: "2026-04-01T00:00:00.000Z",
				end: "2026-05-01T00:00:00.000Z",
			},
		});
		const taskItems = items.filter(
			(item: { source: string }) => item.source === "TASK",
		);

		expect(taskQueries).toEqual([
			{
				businessId: "business-a",
				range: {
					start: new Date("2026-04-01T00:00:00.000Z"),
					end: new Date("2026-05-01T00:00:00.000Z"),
				},
			},
		]);
		expect(taskItems).toHaveLength(4);
		expect(
			taskItems.map((item: any) => [item.taskId, item.status, item.start]),
		).toEqual([
			["done", "COMPLETED", "2026-04-05"],
			["late", "OVERDUE", "2026-04-12"],
			["todo", "SCHEDULED", "2026-04-19"],
			["progress", "SCHEDULED", "2026-04-25"],
		]);
		expect(taskItems[2]).toMatchObject({
			id: "todo",
			title: "Tarea todo",
			description: "Detalle todo",
			end: "2026-04-20",
			allDay: true,
			readOnly: true,
			reminderAt: null,
		});
	});

	test("does not project tasks without a due date", async () => {
		expect(agendaModule).not.toBeNull();
		if (!agendaModule) return;
		const { repository, tasks } = createRepository();
		tasks.push({
			task: { id: "none", title: "Sin fecha", status: "TODO", dueAt: null },
			timeZone: "America/Bogota",
		});
		const service = agendaModule.createAgendaService({
			repository: repository as never,
			now: () => new Date("2026-04-12T12:00:00.000Z"),
			authorize: async () => undefined,
		});

		const items = await service.list({
			userId: "user-a",
			businessId: "business-a",
			range: {
				start: "2026-04-01T00:00:00.000Z",
				end: "2026-05-01T00:00:00.000Z",
			},
		});

		expect(items.some((item: any) => item.source === "TASK")).toBe(false);
	});
});
