import { getAuthCookie } from '@/lib/auth-client';
import { businessBaseUrl } from '@/lib/onboarding-api';

export type CashMovementType = 'SALE' | 'EXPENSE' | 'CREDIT_PAYMENT';
export type CashMovement = {
  id: string;
  businessId: string;
  userId: string;
  type: CashMovementType;
  amount: number;
  category: string | null;
  note: string | null;
  businessDate: string;
  occurredAt: string;
  status: 'ACTIVE' | 'CANCELLED';
  sourceType: string | null;
  sourceId: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cookie = getAuthCookie();
  const response = await fetch(`${businessBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as { data?: T; message?: string; code?: string } | null;
  if (!response.ok || body?.data === undefined) throw new Error(body?.message || 'No pudimos completar la solicitud.');
  return body.data;
}

const base = (businessId: string) => `/businesses/${encodeURIComponent(businessId)}/cash-movements`;

export const getCashMovements = (businessId: string) => request<CashMovement[]>(base(businessId));
export const createSale = (businessId: string, input: { amount: number; businessDate: string; occurredAt: string; note?: string }) => request<CashMovement>(`${base(businessId)}/sales`, { method: 'POST', body: JSON.stringify(input) });
export const createExpense = (businessId: string, input: { amount: number; businessDate: string; occurredAt: string; category?: string; note?: string }) => request<CashMovement>(`${base(businessId)}/expenses`, { method: 'POST', body: JSON.stringify(input) });
