import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCredit,
  createCustomer,
  createPayment,
  deleteCustomer,
  getCreditSummary,
  getCustomerCredits,
  getCustomers,
  getCredits,
  updateCustomer,
} from '@/lib/fiados-api';
export const fiadosKeys = {
  customers: (id: string) => ['customers', id] as const,
  credits: (id: string) => ['credits', id] as const,
  summary: (id: string) => ['credits-summary', id] as const,
  customerCredits: (id: string, customerId: string) =>
    ['customer-credits', id, customerId] as const,
};
function invalidate(client: ReturnType<typeof useQueryClient>, id: string) {
  void client.invalidateQueries({ queryKey: fiadosKeys.customers(id) });
  void client.invalidateQueries({ queryKey: fiadosKeys.credits(id) });
  void client.invalidateQueries({ queryKey: fiadosKeys.summary(id) });
}
export const useCustomers = (id: string) =>
  useQuery({
    queryKey: fiadosKeys.customers(id),
    queryFn: () => getCustomers(id),
    enabled: Boolean(id),
  });
export const useCredits = (id: string) =>
  useQuery({
    queryKey: fiadosKeys.credits(id),
    queryFn: () => getCredits(id),
    enabled: Boolean(id),
  });
export const useCreditSummary = (id: string) =>
  useQuery({
    queryKey: fiadosKeys.summary(id),
    queryFn: () => getCreditSummary(id),
    enabled: Boolean(id),
  });
export const useCustomerCredits = (id: string, customerId: string | null) =>
  useQuery({
    queryKey: fiadosKeys.customerCredits(id, customerId ?? ''),
    queryFn: () => getCustomerCredits(id, customerId!),
    enabled: Boolean(id && customerId),
  });
export const useCreateCustomer = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createCustomer>[1]) => createCustomer(id, input),
    onSuccess: () => invalidate(c, id),
  });
};
export const useUpdateCustomer = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      input,
    }: {
      customerId: string;
      input: Parameters<typeof updateCustomer>[2];
    }) => updateCustomer(id, customerId, input),
    onSuccess: () => invalidate(c, id),
  });
};
export const useDeleteCustomer = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => deleteCustomer(id, customerId),
    onSuccess: () => invalidate(c, id),
  });
};
export const useCreateCredit = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createCredit>[1]) => createCredit(id, input),
    onSuccess: () => invalidate(c, id),
  });
};
export const useCreatePayment = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({
      creditId,
      input,
    }: {
      creditId: string;
      input: Parameters<typeof createPayment>[2];
    }) => createPayment(id, creditId, input),
    onSuccess: () => invalidate(c, id),
  });
};
