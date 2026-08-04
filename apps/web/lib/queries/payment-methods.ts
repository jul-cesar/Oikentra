import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	createPaymentMethod,
	deactivatePaymentMethod,
	getPaymentMethods,
	updatePaymentMethod,
} from "@/lib/payment-methods-api";

export const paymentMethodQueryKeys = {
	methods: (businessId: string) =>
		["business-payment-methods", businessId] as const,
};

export function usePaymentMethods(businessId: string) {
	return useQuery({
		queryKey: paymentMethodQueryKeys.methods(businessId),
		queryFn: () => getPaymentMethods(businessId),
		enabled: Boolean(businessId),
	});
}

export function useCreatePaymentMethod(businessId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { name: string }) =>
			createPaymentMethod(businessId, input),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: paymentMethodQueryKeys.methods(businessId),
			});
		},
	});
}

export function useUpdatePaymentMethod(businessId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			paymentMethodId,
			name,
		}: {
			paymentMethodId: string;
			name: string;
		}) => updatePaymentMethod(businessId, paymentMethodId, { name }),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: paymentMethodQueryKeys.methods(businessId),
			});
		},
	});
}

export function useDeactivatePaymentMethod(businessId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (paymentMethodId: string) =>
			deactivatePaymentMethod(businessId, paymentMethodId),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: paymentMethodQueryKeys.methods(businessId),
			});
		},
	});
}
