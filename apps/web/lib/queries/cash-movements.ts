import { useQuery } from "@tanstack/react-query";

import { getCashMovements } from "@/lib/cash-movements-api";

export const cashMovementsQueryKeys = {
	movements: (businessId: string) => ["cash-movements", businessId] as const,
};

export function useCashMovements(businessId: string) {
	return useQuery({
		queryKey: cashMovementsQueryKeys.movements(businessId),
		queryFn: () => getCashMovements(businessId),
		enabled: Boolean(businessId),
	});
}
