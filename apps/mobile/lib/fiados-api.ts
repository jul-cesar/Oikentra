import { businessBaseUrl } from '@/lib/onboarding-api';
import { getAuthCookie } from '@/lib/auth-client';

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  totalDebt: number;
  activeCredits: number;
  oldDebt: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CreditPayment = {
  id: string;
  userId: string;
  creditId: string;
  cashMovementId: string;
  amount: number;
  paymentDate: string;
  note: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Credit = {
  id: string;
  userId: string;
  customerId: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  description: string | null;
  creditDate: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  payments: CreditPayment[];
  cancellationReason: string | null;
  cancelledAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CreditSummary = { totalDebt: number; customersWithDebt: number; oldDebts: number };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const cookie = getAuthCookie();
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as { data?: T; message?: string } | null;
  if (!response.ok || body?.data === undefined)
    throw new Error(body?.message || 'No pudimos completar la solicitud.');
  return body.data;
}
const base = (id: string) => `${businessBaseUrl}/businesses/${encodeURIComponent(id)}`;
export const getCustomers = (id: string) => request<Customer[]>(`${base(id)}/customers`);
export const createCustomer = (
  id: string,
  input: { name: string; phone?: string; notes?: string }
) => request<Customer>(`${base(id)}/customers`, { method: 'POST', body: JSON.stringify(input) });
export const updateCustomer = (
  id: string,
  customerId: string,
  input: { name?: string; phone?: string | null; notes?: string | null }
) =>
  request<Customer>(`${base(id)}/customers/${encodeURIComponent(customerId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const deleteCustomer = (id: string, customerId: string) =>
  request<Customer>(`${base(id)}/customers/${encodeURIComponent(customerId)}/delete`, {
    method: 'POST',
  });
export const getCreditSummary = (id: string) =>
  request<CreditSummary>(`${base(id)}/credits/summary`);
export const getCredits = (id: string) => request<Credit[]>(`${base(id)}/credits`);
export const createCredit = (
  id: string,
  input: { customerId: string; originalAmount: number; description?: string; creditDate: string }
) => request<Credit>(`${base(id)}/credits`, { method: 'POST', body: JSON.stringify(input) });
export const getCustomerCredits = (id: string, customerId: string) =>
  request<Credit[]>(`${base(id)}/customers/${encodeURIComponent(customerId)}/credits`);
export const createPayment = (
  id: string,
  creditId: string,
  input: { amount: number; paymentDate: string; note?: string }
) =>
  request<Credit>(`${base(id)}/credits/${encodeURIComponent(creditId)}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
