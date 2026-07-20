"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useSession } from "@/hooks/use-session"
import { OikentraLoader } from "@/components/ui/oikentra-loader"

export function AuthEntryGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isPending, error, isRefetching, refetch } = useSession()

  useEffect(() => {
    if (!isPending && !error && user) router.replace("/dashboard")
  }, [error, isPending, router, user])

  if (isPending || user) {
    return <div className="flex min-h-svh items-center justify-center p-6"><OikentraLoader label={user ? "Abriendo tu espacio" : "Verificando tu sesión"} /></div>
  }

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">No pudimos verificar tu sesión. Revisa tu conexión e inténtalo nuevamente.</p>
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
