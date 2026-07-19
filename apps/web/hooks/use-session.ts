"use client"

import { authClient } from "@/lib/auth-client"

export function useSession() {
  const query = authClient.useSession()

  return {
    user: query.data?.user ?? null,
    session: query.data?.session ?? null,
    isPending: query.isPending,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
  }
}
