"use client"

import { useSyncExternalStore, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { useSession } from "@/hooks/use-session"

function useHash() {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") {
        return () => {}
      }
      window.addEventListener("hashchange", callback)
      return () => window.removeEventListener("hashchange", callback)
    },
    () => (typeof window !== "undefined" ? window.location.hash : ""),
    () => ""
  )
}

function buildCurrentPath(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  hash: string
): string {
  const query = searchParams.toString()
  return `${pathname}${query ? `?${query}` : ""}${hash}`
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isPending, isRefetching, error, refetch } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hash = useHash()

  useEffect(() => {
    if (isPending || error) {
      return
    }

    if (user) {
      return
    }

    if (typeof window === "undefined") {
      return
    }

    const currentPath = buildCurrentPath(pathname, searchParams, hash)
    const redirect = encodeURIComponent(currentPath)
    const loginUrl = `/login?redirect=${redirect}`

    window.location.assign(loginUrl)
  }, [error, isPending, user, pathname, searchParams, hash])

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span
            className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          Cargando...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">
            No pudimos verificar tu sesión. Revisa tu conexión e inténtalo nuevamente.
          </p>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => void refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "Reintentando..." : "Reintentar"}
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
