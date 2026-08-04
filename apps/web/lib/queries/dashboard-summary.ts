import { useQuery } from "@tanstack/react-query";

import { getDashboardSummary } from "@/lib/dashboard-summary-api";

export const dashboardSummaryQueryKeys = {
	summary: (businessId: string, range: { from?: string; to?: string }) =>
		[
			"dashboard-summary",
			businessId,
			range.from ?? "",
			range.to ?? "",
		] as const,
};

export function useDashboardSummary(
	businessId: string,
	range: { from?: string; to?: string },
) {
	return useQuery({
		queryKey: dashboardSummaryQueryKeys.summary(businessId, range),
		queryFn: () => getDashboardSummary(businessId, range),
		enabled: Boolean(businessId),
	});
}
