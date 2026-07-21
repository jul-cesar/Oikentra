import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelCredit,
  cancelPayment,
  createCredit,
  createCustomer,
  createPayment,
  getCredit,
  getCreditSummary,
  getCredits,
  getCustomer,
  getCustomers,
  getPayments,
  type Credit,
} from "@/lib/fiados-api";

export const fiadosQueryKeys = {
  customers: (businessId: string) => ["customers", businessId] as const,
  customer: (businessId: string, customerId: string) =>
    ["customer", businessId, customerId] as const,
  credits: (businessId: string, status?: Credit["status"]) =>
    ["credits", businessId, status ?? "all"] as const,
  credit: (businessId: string, creditId: string) =>
    ["credit", businessId, creditId] as const,
  payments: (businessId: string, creditId: string) =>
    ["payments", businessId, creditId] as const,
  summary: (businessId: string) => ["credits-summary", businessId] as const,
};

export function useCustomers(businessId: string) {
  return useQuery({
    queryKey: fiadosQueryKeys.customers(businessId),
    queryFn: () => getCustomers(businessId),
    enabled: Boolean(businessId),
  });
}
export function useCustomer(businessId: string, customerId: string | null) {
  return useQuery({
    queryKey: fiadosQueryKeys.customer(businessId, customerId ?? ""),
    queryFn: () => getCustomer(businessId, customerId!),
    enabled: Boolean(businessId && customerId),
  });
}
export function useCredits(businessId: string, status?: Credit["status"]) {
  return useQuery({
    queryKey: fiadosQueryKeys.credits(businessId, status),
    queryFn: () => getCredits(businessId, status),
    enabled: Boolean(businessId),
  });
}
export function useCredit(businessId: string, creditId: string | null) {
  return useQuery({
    queryKey: fiadosQueryKeys.credit(businessId, creditId ?? ""),
    queryFn: () => getCredit(businessId, creditId!),
    enabled: Boolean(businessId && creditId),
  });
}
export function usePayments(businessId: string, creditId: string | null) {
  return useQuery({
    queryKey: fiadosQueryKeys.payments(businessId, creditId ?? ""),
    queryFn: () => getPayments(businessId, creditId!),
    enabled: Boolean(businessId && creditId),
  });
}
export function useCreditSummary(businessId: string) {
  return useQuery({
    queryKey: fiadosQueryKeys.summary(businessId),
    queryFn: () => getCreditSummary(businessId),
    enabled: Boolean(businessId),
  });
}

function invalidateAll(
  queryClient: ReturnType<typeof useQueryClient>,
  businessId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["customers", businessId] });
  void queryClient.invalidateQueries({ queryKey: ["customer", businessId] });
  void queryClient.invalidateQueries({ queryKey: ["credits", businessId] });
  void queryClient.invalidateQueries({ queryKey: ["credit", businessId] });
  void queryClient.invalidateQueries({ queryKey: ["payments", businessId] });
  void queryClient.invalidateQueries({
    queryKey: fiadosQueryKeys.summary(businessId),
  });
}

export function useCreateCustomer(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createCustomer>[1]) =>
      createCustomer(businessId, input),
    onSuccess: () => invalidateAll(queryClient, businessId),
  });
}
export function useCreateCredit(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createCredit>[1]) =>
      createCredit(businessId, input),
    onSuccess: () => invalidateAll(queryClient, businessId),
  });
}
export function useCreatePayment(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      creditId,
      input,
    }: {
      creditId: string;
      input: Parameters<typeof createPayment>[2];
    }) => createPayment(businessId, creditId, input),
    onSuccess: () => invalidateAll(queryClient, businessId),
  });
}
export function useCancelCredit(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ creditId, reason }: { creditId: string; reason: string }) =>
      cancelCredit(businessId, creditId, reason),
    onSuccess: () => invalidateAll(queryClient, businessId),
  });
}
export function useCancelPayment(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      creditId,
      paymentId,
      reason,
    }: {
      creditId: string;
      paymentId: string;
      reason: string;
    }) => cancelPayment(businessId, creditId, paymentId, reason),
    onSuccess: () => invalidateAll(queryClient, businessId),
  });
}
