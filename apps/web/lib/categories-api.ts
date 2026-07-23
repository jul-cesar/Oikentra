export type CashMovementCategory = {
  id: string;
  businessId: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
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
  `/api/business/businesses/${encodeURIComponent(businessId)}/cash-movement-categories`;

export function getCategories(businessId: string) {
  return request<CashMovementCategory[]>(`${base(businessId)}`);
}

export function createCategory(
  businessId: string,
  input: { name: string },
) {
  return request<CashMovementCategory>(`${base(businessId)}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCategory(
  businessId: string,
  categoryId: string,
  input: { name: string },
) {
  return request<CashMovementCategory>(
    `${base(businessId)}/${encodeURIComponent(categoryId)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function deactivateCategory(
  businessId: string,
  categoryId: string,
) {
  return request<CashMovementCategory>(
    `${base(businessId)}/${encodeURIComponent(categoryId)}/deactivate`,
    {
      method: "POST",
    },
  );
}
