export type CashMovementType = "SALE" | "EXPENSE" | "CREDIT_PAYMENT";
export type CashMovementStatus = "ACTIVE" | "CANCELLED";

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
  status: CashMovementStatus;
  sourceType: string | null;
  sourceId: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as { data?: T; message?: string; code?: string } | null;
  if (!response.ok || body?.data === undefined) {
    const error = new Error(body?.message || "No pudimos completar la solicitud.") as Error & { code?: string };
    error.code = body?.code;
    throw error;
  }
  return body.data;
}

const base = (businessId: string) => `/api/business/businesses/${encodeURIComponent(businessId)}/cash-movements`;

export function getCashMovements(businessId: string) {
  return request<CashMovement[]>(base(businessId));
}

export function createSale(businessId: string, input: { amount: number; businessDate: string; occurredAt: string; note?: string }) {
  return request<CashMovement>(`${base(businessId)}/sales`, { method: "POST", body: JSON.stringify(input) });
}

export function createExpense(businessId: string, input: { amount: number; businessDate: string; category: string; occurredAt: string; note?: string }) {
  return request<CashMovement>(`${base(businessId)}/expenses`, { method: "POST", body: JSON.stringify(input) });
}

export function cancelCashMovement(businessId: string, movementId: string, reason: string) {
  return request<CashMovement>(`${base(businessId)}/${encodeURIComponent(movementId)}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });
}
