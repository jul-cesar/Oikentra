import { authBaseUrl } from "@/lib/auth-client"

export type Profile = {
  profileCompleted: boolean
  countryCode?: string
  department?: string | null
  city?: string
  phone?: string | null
}

export type Business = {
  id: string
  name: string
  businessType?: string | null
  currencyCode?: string
  timezone?: string
}

const ACTIVE_BUSINESS_KEY = "oikentra.activeBusinessId"
const businessBaseUrl = "/api/business"

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } })
  const body = (await response.json().catch(() => null)) as { data?: T; message?: string } | null
  if (!response.ok || body?.data === undefined) throw new Error(body?.message || "No pudimos completar la solicitud.")
  return body.data
}

export function getProfile() {
  return request<Profile>(`${authBaseUrl}/profile`)
}

export function saveProfile(input: { department: string; city: string; phone?: string | null }) {
  return request<Profile>(`${authBaseUrl}/profile`, { method: "PUT", body: JSON.stringify(input) })
}

export function getBusinesses() {
  return request<Business[]>(`${businessBaseUrl}/businesses`)
}

export function createBusiness(input: { name: string }) {
  return request<Business>(`${businessBaseUrl}/businesses`, { method: "POST", body: JSON.stringify(input) })
}

export function saveActiveBusinessId(id: string) {
  window.localStorage.setItem(ACTIVE_BUSINESS_KEY, id)
}
