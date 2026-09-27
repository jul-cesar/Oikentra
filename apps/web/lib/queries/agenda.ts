import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	createAgendaEvent,
	deleteAgendaEvent,
	getAgenda,
	updateAgendaEvent,
	type AgendaEventInput,
} from "@/lib/agenda-api";

export const agendaQueryKeys = {
	all: (businessId: string) => ["agenda", businessId] as const,
	range: ({
		businessId,
		start,
		end,
	}: {
		businessId: string;
		start: string;
		end: string;
	}) => ["agenda", businessId, start, end] as const,
};

export function useAgenda({
	businessId,
	start,
	end,
}: {
	businessId: string;
	start: string;
	end: string;
}) {
	return useQuery({
		queryKey: agendaQueryKeys.range({ businessId, start, end }),
		queryFn: () => getAgenda({ businessId, range: { start, end } }),
		enabled: Boolean(businessId && start && end),
	});
}

function useInvalidateAgenda(businessId: string) {
	const queryClient = useQueryClient();
	return () =>
		queryClient.invalidateQueries({
			queryKey: agendaQueryKeys.all(businessId),
		});
}

export function useCreateAgendaEvent(businessId: string) {
	const invalidate = useInvalidateAgenda(businessId);
	return useMutation({
		mutationFn: (input: AgendaEventInput) =>
			createAgendaEvent({ businessId, input }),
		onSuccess: invalidate,
	});
}

export function useUpdateAgendaEvent(businessId: string) {
	const invalidate = useInvalidateAgenda(businessId);
	return useMutation({
		mutationFn: ({
			eventId,
			input,
		}: {
			eventId: string;
			input: Partial<AgendaEventInput>;
		}) => updateAgendaEvent({ businessId, eventId, input }),
		onSuccess: invalidate,
	});
}

export function useDeleteAgendaEvent(businessId: string) {
	const invalidate = useInvalidateAgenda(businessId);
	return useMutation({
		mutationFn: (eventId: string) => deleteAgendaEvent({ businessId, eventId }),
		onSuccess: invalidate,
	});
}
