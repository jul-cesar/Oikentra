import { authBaseUrl, getAuthCookie } from '@/lib/auth-client';
import * as SecureStore from 'expo-secure-store';

export type Profile = {
  profileCompleted: boolean;
  countryCode?: string;
  department?: string | null;
  city?: string;
  phone?: string | null;
};

export type Business = {
  id: string;
  name: string;
  businessType?: string | null;
  currencyCode?: string;
  timezone?: string;
  status?: string;
};

const businessBaseUrl = (
  process.env.EXPO_PUBLIC_BUSINESS_BASE_URL?.trim() ||
  authBaseUrl.replace(/\/api\/auth$/, '/api/business')
).replace(/\/$/, '');
const ACTIVE_BUSINESS_KEY = 'oikentra_active_business_id';

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
  if (!response.ok || body?.data === undefined) {
    throw new Error(body?.message || 'No pudimos completar la solicitud.');
  }
  return body.data;
}

export function getProfile() {
  return request<Profile>(`${authBaseUrl}/profile`);
}

export function saveProfile(input: { department: string; city: string; phone?: string | null }) {
  return request<Profile>(`${authBaseUrl}/profile`, { method: 'PUT', body: JSON.stringify(input) });
}

export function patchProfile(input: { department?: string; city?: string; phone?: string | null }) {
  return request<Profile>(`${authBaseUrl}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getBusinesses() {
  return request<Business[]>(`${businessBaseUrl}/businesses`);
}

export function getBusiness(id: string) {
  return request<Business>(`${businessBaseUrl}/businesses/${encodeURIComponent(id)}`);
}

export function createBusiness(input: { name: string }) {
  return request<Business>(`${businessBaseUrl}/businesses`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateBusiness(
  id: string,
  input: Partial<Pick<Business, 'name' | 'businessType' | 'currencyCode' | 'timezone'>>
) {
  return request<Business>(`${businessBaseUrl}/businesses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function saveActiveBusinessId(id: string) {
  return SecureStore.setItemAsync(ACTIVE_BUSINESS_KEY, id);
}

export function getActiveBusinessId() {
  return SecureStore.getItem(ACTIVE_BUSINESS_KEY) ?? null;
}
