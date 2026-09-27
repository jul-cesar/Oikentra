export type AgendaItem = {
	id: string;
	source: "EVENT" | "CREDIT" | "LOAN_INSTALLMENT";
	title: string;
	description: string | null;
	start: string;
	end: string;
	allDay: boolean;
	status: "SCHEDULED" | "OVERDUE" | "COMPLETED" | "CANCELLED";
	readOnly: boolean;
	reminderAt: string | null;
	customerId?: string;
	loanId?: string;
	amount?: number;
};

export type AgendaEventInput = {
	title: string;
	description?: string | null;
	startAt: string;
	endAt: string;
	allDay?: boolean;
	reminderAt?: string | null;
};

async function request<T>({
	url,
	init,
}: {
	url: string;
	init?: RequestInit;
}): Promise<T> {
	const response = await fetch(url, {
		...init,
		credentials: "include",
		headers: { "Content-Type": "application/json", ...init?.headers },
	});
	const body = (await response.json().catch(() => null)) as {
		data?: T;
		message?: string;
		code?: string;
	} | null;
	if (!response.ok || body?.data === undefined) {
		const error = new Error(
			body?.message || "No pudimos completar la solicitud.",
		) as Error & { code?: string };
		error.code = body?.code;
		throw error;
	}
	return body.data;
}

const base = (businessId: string) =>
	`/api/business/businesses/${encodeURIComponent(businessId)}/agenda`;

export function getAgenda({
	businessId,
	range,
}: {
	businessId: string;
	range: { start: string; end: string };
}) {
	const query = new URLSearchParams(range);
	return request<AgendaItem[]>({ url: `${base(businessId)}?${query}` });
}

export function createAgendaEvent({
	businessId,
	input,
}: {
	businessId: string;
	input: AgendaEventInput;
}) {
	return request<AgendaItem>({
		url: base(businessId),
		init: { method: "POST", body: JSON.stringify(input) },
	});
}

export function updateAgendaEvent({
	businessId,
	eventId,
	input,
}: {
	businessId: string;
	eventId: string;
	input: Partial<AgendaEventInput>;
}) {
	return request<AgendaItem>({
		url: `${base(businessId)}/${encodeURIComponent(eventId)}`,
		init: { method: "PATCH", body: JSON.stringify(input) },
	});
}

export function deleteAgendaEvent({
	businessId,
	eventId,
}: {
	businessId: string;
	eventId: string;
}) {
	return request<AgendaItem>({
		url: `${base(businessId)}/${encodeURIComponent(eventId)}`,
		init: { method: "DELETE" },
	});
}
