"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { es } from "date-fns/locale";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EventCalendar } from "@/components/reui/event-calendar/event-calendar";
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content";
import {
	EventCalendarNav,
	EventCalendarToolbar,
} from "@/components/reui/event-calendar/event-calendar-nav";
import type {
	CalendarEvent,
	EventCalendarOccurrence,
	EventCalendarProposedUpdate,
	EventCalendarSlotInfo,
} from "@/components/reui/event-calendar/event-calendar-types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { AgendaItem } from "@/lib/agenda-api";
import {
	useAgenda,
	useCreateAgendaEvent,
	useDeleteAgendaEvent,
	useUpdateAgendaEvent,
} from "@/lib/queries/agenda";

type ReminderOffset = "NONE" | "0" | "5" | "15" | "30" | "60" | "180" | "1440";

type EventDraft = {
	id: string | null;
	title: string;
	description: string;
	date: string;
	startTime: string;
	endTime: string;
	allDay: boolean;
	reminder: ReminderOffset;
};

const reminderOptions: { value: ReminderOffset; label: string }[] = [
	{ value: "NONE", label: "Sin recordatorio" },
	{ value: "0", label: "Al comenzar" },
	{ value: "5", label: "5 minutos antes" },
	{ value: "15", label: "15 minutos antes" },
	{ value: "30", label: "30 minutos antes" },
	{ value: "60", label: "1 hora antes" },
	{ value: "180", label: "3 horas antes" },
	{ value: "1440", label: "1 día antes" },
];

const timeOptions = Array.from({ length: 96 }, (_, index) => {
	const minutes = index * 15;
	return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function timeLabel(value: string) {
	const [hour, minute] = value.split(":").map(Number);
	return new Intl.DateTimeFormat("es-CO", {
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(2000, 0, 1, hour, minute));
}

function TimeSelect({
	value,
	onValueChange,
	label,
}: {
	value: string;
	onValueChange: (value: string) => void;
	label: string;
}) {
	const options = timeOptions.includes(value)
		? timeOptions
		: [...timeOptions, value].sort();
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger aria-label={label}>
				<SelectValue placeholder="Selecciona una hora" />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option} value={option}>
						{timeLabel(option)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

const eventColors: Record<AgendaItem["source"], string> = {
	EVENT: "var(--color-blue-500)",
	CREDIT: "var(--color-amber-500)",
	LOAN_INSTALLMENT: "var(--color-violet-500)",
};

function dateParts(date: Date) {
	return {
		year: date.getFullYear(),
		month: String(date.getMonth() + 1).padStart(2, "0"),
		day: String(date.getDate()).padStart(2, "0"),
	};
}

function dateInputValue(date: Date) {
	const parts = dateParts(date);
	return `${parts.year}-${parts.month}-${parts.day}`;
}

function timeInputValue(date: Date) {
	return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function inBusinessZone({ date, timeZone }: { date: Date; timeZone: string }) {
	return new TZDate(date.getTime(), timeZone);
}

function fromBusinessTime({
	date,
	time,
	timeZone,
}: {
	date: string;
	time: string;
	timeZone: string;
}) {
	const [year, month, day] = date.split("-").map(Number);
	const [hour, minute] = time.split(":").map(Number);
	return new TZDate(year!, month! - 1, day!, hour!, minute!, 0, timeZone);
}

function calendarDate({
	value,
	timeZone,
}: {
	value: string;
	timeZone: string;
}) {
	if (value.includes("T")) return new Date(value);
	return fromBusinessTime({ date: value, time: "00:00", timeZone });
}

function toCalendarEvent({
	item,
	timeZone,
}: {
	item: AgendaItem;
	timeZone: string;
}): CalendarEvent<AgendaItem> {
	return {
		id: `${item.source}:${item.id}`,
		title: item.title,
		start: calendarDate({ value: item.start, timeZone }),
		end: calendarDate({ value: item.end, timeZone }),
		allDay: item.allDay,
		readOnly: item.readOnly,
		color:
			item.status === "OVERDUE"
				? "var(--color-red-500)"
				: eventColors[item.source],
		data: item,
	};
}

function money({ value, currency }: { value: number; currency: string }) {
	return new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(value);
}

function reminderLabel({
	value,
	timeZone,
}: {
	value: string;
	timeZone: string;
}) {
	return new Intl.DateTimeFormat("es-CO", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone,
	}).format(new Date(value));
}

function newDraft({
	date,
	timeZone,
}: {
	date: Date;
	timeZone: string;
}): EventDraft {
	const zoned = inBusinessZone({ date, timeZone });
	return {
		id: null,
		title: "",
		description: "",
		date: dateInputValue(zoned),
		startTime: "09:00",
		endTime: "10:00",
		allDay: false,
		reminder: "NONE",
	};
}

export function AgendaPage({
	businessId,
	timeZone,
	currencyCode,
}: {
	businessId: string;
	timeZone: string;
	currencyCode: string;
}) {
	const router = useRouter();
	const [range, setRange] = useState(() => ({
		start: addDays(new Date(), -45).toISOString(),
		end: addDays(new Date(), 45).toISOString(),
	}));
	const agenda = useAgenda({ businessId, ...range });
	const createEvent = useCreateAgendaEvent(businessId);
	const updateEvent = useUpdateAgendaEvent(businessId);
	const deleteEvent = useDeleteAgendaEvent(businessId);
	const events = useMemo(
		() =>
			(agenda.data ?? []).map((item) => toCalendarEvent({ item, timeZone })),
		[agenda.data, timeZone],
	);
	const [draft, setDraft] = useState<EventDraft | null>(null);
	const [loadedAt] = useState(() => Date.now());
	const reminders = useMemo(
		() =>
			(agenda.data ?? [])
				.filter(
					(item): item is AgendaItem & { reminderAt: string } =>
						item.reminderAt !== null &&
						new Date(item.reminderAt).getTime() <= loadedAt + 7 * 86_400_000 &&
						new Date(item.end).getTime() >= loadedAt,
				)
				.slice(0, 3),
		[agenda.data, loadedAt],
	);

	function openCreate(slot?: EventCalendarSlotInfo) {
		setDraft(newDraft({ date: slot?.date ?? new Date(), timeZone }));
	}

	function openEvent(occurrence: EventCalendarOccurrence<AgendaItem>) {
		const item = occurrence.event.data;
		if (!item) return;
		if (item.source === "CREDIT" && item.customerId) {
			router.push(`/dashboard/${businessId}/fiados/${item.customerId}`);
			return;
		}
		if (item.source === "LOAN_INSTALLMENT" && item.loanId) {
			router.push(`/dashboard/${businessId}/prestamos/${item.loanId}`);
			return;
		}
		const start = inBusinessZone({ date: occurrence.start, timeZone });
		const end = inBusinessZone({ date: occurrence.end, timeZone });
		const reminderMinutes = item.reminderAt
			? Math.round(
					(occurrence.start.getTime() - new Date(item.reminderAt).getTime()) /
						60_000,
				)
			: null;
		const reminder = reminderOptions.find(
			(option) => Number(option.value) === reminderMinutes,
		)?.value;
		setDraft({
			id: item.id,
			title: item.title,
			description: item.description ?? "",
			date: dateInputValue(start),
			startTime: timeInputValue(start),
			endTime: timeInputValue(end),
			allDay: item.allDay,
			reminder: item.reminderAt ? (reminder ?? "0") : "NONE",
		});
	}

	async function saveDraft() {
		if (!draft?.title.trim()) return;
		const start = fromBusinessTime({
			date: draft.date,
			time: draft.allDay ? "00:00" : draft.startTime,
			timeZone,
		});
		const end = draft.allDay
			? addDays(start, 1)
			: fromBusinessTime({ date: draft.date, time: draft.endTime, timeZone });
		if (end <= start) {
			toast.add({
				type: "error",
				title: "Hora inválida",
				description: "La hora final debe ser posterior a la inicial.",
			});
			return;
		}
		const reminderAt =
			draft.reminder === "NONE"
				? null
				: new Date(
						start.getTime() - Number(draft.reminder) * 60_000,
					).toISOString();
		const input = {
			title: draft.title.trim(),
			description: draft.description.trim() || null,
			startAt: start.toISOString(),
			endAt: end.toISOString(),
			allDay: draft.allDay,
			reminderAt,
		};
		try {
			if (draft.id) {
				await updateEvent.mutateAsync({ eventId: draft.id, input });
			} else {
				await createEvent.mutateAsync(input);
			}
			setDraft(null);
			toast.add({ type: "success", title: "Evento guardado" });
		} catch (cause) {
			toast.add({
				type: "error",
				title: "No pudimos guardar el evento",
				description: cause instanceof Error ? cause.message : undefined,
			});
		}
	}

	async function removeDraft() {
		if (!draft?.id) return;
		try {
			await deleteEvent.mutateAsync(draft.id);
			setDraft(null);
			toast.add({ type: "success", title: "Evento eliminado" });
		} catch (cause) {
			toast.add({
				type: "error",
				title: "No pudimos eliminar el evento",
				description: cause instanceof Error ? cause.message : undefined,
			});
		}
	}

	function moveEvent(update: EventCalendarProposedUpdate<AgendaItem>) {
		const item = update.event.data;
		if (!item || item.source !== "EVENT") return false;
		const previousStart = update.occurrence?.start ?? update.event.start;
		const reminderAt = item.reminderAt
			? new Date(
					update.start.getTime() -
						(previousStart.getTime() - new Date(item.reminderAt).getTime()),
				).toISOString()
			: null;
		updateEvent.mutate(
			{
				eventId: item.id,
				input: {
					startAt: update.start.toISOString(),
					endAt: update.end.toISOString(),
					allDay: update.allDay,
					reminderAt,
				},
			},
			{
				onError: () => {
					void agenda.refetch();
					toast.add({
						type: "error",
						title: "No pudimos mover el evento",
					});
				},
			},
		);
		return true;
	}

	return (
		<div className="space-y-5">
			<div>
				<p className="text-sm font-medium text-primary">Organiza tu negocio</p>
				<h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
				<p className="text-sm text-muted-foreground">
					Eventos, próximos cobros y cuotas en un solo lugar.
				</p>
			</div>

			{reminders.length ? (
				<div className="rounded-xl border bg-card p-4 shadow-sm">
					<h2 className="font-semibold">Próximos recordatorios</h2>
					<div className="mt-3 grid gap-2 sm:grid-cols-3">
						{reminders.map((item) => (
							<div key={item.id} className="rounded-lg bg-muted/50 px-3 py-2">
								<p className="text-sm font-medium">{item.title}</p>
								<p className="text-xs text-muted-foreground">
									{reminderLabel({ value: item.reminderAt, timeZone })}
								</p>
							</div>
						))}
					</div>
				</div>
			) : null}

			<div className="overflow-hidden rounded-xl border bg-card shadow-sm">
				<EventCalendar<AgendaItem>
					events={events}
					defaultView="month"
					views={["month", "week", "day"]}
					timeZone={timeZone}
					locale={es}
					loading={agenda.isLoading}
					onRangeChange={(info) =>
						setRange({
							start: info.range.start.toISOString(),
							end: info.range.end.toISOString(),
						})
					}
					onSlotClick={openCreate}
					onEventClick={openEvent}
					onEventUpdate={moveEvent}
					interactions={{ drag: true, resize: true, selectSlot: false }}
					showDayAddButton
					renderAgendaEventDetails={(occurrence) => {
						const item = occurrence.event.data;
						if (!item) return null;
						return (
							<div className="space-y-1 text-sm text-muted-foreground">
								{item.amount !== undefined ? (
									<p className="font-medium text-foreground">
										Saldo:{" "}
										{money({ value: item.amount, currency: currencyCode })}
									</p>
								) : null}
								{item.description ? <p>{item.description}</p> : null}
								{item.source !== "EVENT" ? (
									<p>Haz clic para abrir el detalle.</p>
								) : null}
							</div>
						);
					}}
					i18n={{
						labels: {
							today: "Hoy",
							previous: "Anterior",
							next: "Siguiente",
							allDay: "Todo el día",
							noEvents: "No hay eventos",
							loading: "Cargando agenda",
							selectView: "Cambiar vista",
						},
						viewNames: { month: "Mes", week: "Semana", day: "Día" },
					}}
					className="h-[calc(100vh-13rem)] min-h-[620px]"
				>
					<div className="flex flex-wrap items-center gap-2 border-b pe-2">
						<EventCalendarNav className="min-w-0 flex-1" />
						<EventCalendarToolbar>
							<Button size="sm" onClick={() => openCreate()}>
								<HugeiconsIcon icon={PlusSignIcon} size={16} />
								Nuevo evento
							</Button>
						</EventCalendarToolbar>
					</div>
					<EventCalendarContent />
				</EventCalendar>
			</div>

			<Dialog
				open={Boolean(draft)}
				onOpenChange={(open) => !open && setDraft(null)}
			>
				{draft ? (
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{draft.id ? "Editar evento" : "Nuevo evento"}
							</DialogTitle>
							<DialogDescription>
								Guarda una cita, entrega o tarea del negocio.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="grid gap-2">
								<Label htmlFor="event-title">Título</Label>
								<Input
									id="event-title"
									value={draft.title}
									onChange={(event) =>
										setDraft({ ...draft, title: event.target.value })
									}
									autoFocus
									placeholder="Ej. Entregar pedido"
								/>
							</div>
							<div className="grid gap-2">
								<Label>Fecha</Label>
								<DatePicker
									value={draft.date}
									onChange={(date) => setDraft({ ...draft, date })}
								/>
							</div>
							<div className="flex items-center justify-between rounded-md border p-3">
								<Label htmlFor="event-all-day">Todo el día</Label>
								<Switch
									id="event-all-day"
									checked={draft.allDay}
									onCheckedChange={(allDay) =>
										setDraft({ ...draft, allDay })
									}
								/>
							</div>
							{!draft.allDay ? (
								<div className="grid grid-cols-2 gap-3">
									<div className="grid gap-2">
										<Label>Hora inicial</Label>
										<TimeSelect
											label="Hora inicial"
											value={draft.startTime}
											onValueChange={(startTime) =>
												setDraft({ ...draft, startTime })
											}
										/>
									</div>
									<div className="grid gap-2">
										<Label>Hora final</Label>
										<TimeSelect
											label="Hora final"
											value={draft.endTime}
											onValueChange={(endTime) =>
												setDraft({ ...draft, endTime })
											}
										/>
									</div>
								</div>
							) : null}
							<div className="grid gap-2">
								<Label>Recordatorio por correo</Label>
								<Select
									value={draft.reminder}
									onValueChange={(reminder) =>
										setDraft({ ...draft, reminder: reminder as ReminderOffset })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecciona cuándo avisar" />
									</SelectTrigger>
									<SelectContent>
										{reminderOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="event-note">Nota (opcional)</Label>
								<Input
									id="event-note"
									value={draft.description}
									onChange={(event) =>
										setDraft({ ...draft, description: event.target.value })
									}
								/>
							</div>
						</div>
						<DialogFooter className="sm:justify-between">
							{draft.id ? (
								<Button
									variant="ghost"
									className="text-destructive"
									onClick={() => void removeDraft()}
									disabled={deleteEvent.isPending}
								>
									Eliminar
								</Button>
							) : (
								<span />
							)}
							<div className="flex gap-2">
								<Button variant="outline" onClick={() => setDraft(null)}>
									Cancelar
								</Button>
								<Button
									onClick={() => void saveDraft()}
									disabled={
										!draft.title.trim() ||
										createEvent.isPending ||
										updateEvent.isPending
									}
								>
									Guardar
								</Button>
							</div>
						</DialogFooter>
					</DialogContent>
				) : null}
			</Dialog>
		</div>
	);
}
