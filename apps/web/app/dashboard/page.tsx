"use client"

import { Suspense } from "react"

import { AuthGuard } from "@/components/auth-guard"
import { OnboardingGate } from "@/components/onboarding-gate"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSession } from "@/hooks/use-session"
import { authClient } from "@/lib/auth-client"

function DashboardContent() {
  const { user, isPending } = useSession()

  async function handleSignOut() {
    await authClient.signOut().catch(() => {
      // Ignore sign-out errors and force the user back to the login screen.
    })
    window.location.assign("/login")
  }

  const displayName = user?.name ?? user?.email ?? "Usuario"

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex flex-col items-start gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h1 className="text-xl font-bold">Panel de control</h1>
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={isPending}
        >
          Cerrar sesión
        </Button>
      </header>

      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>
              Has iniciado sesión correctamente en Oikentra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Usuario: <span className="font-medium text-foreground">{displayName}</span>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function DashboardPageContent() {
  return (
    <AuthGuard>
      <OnboardingGate><DashboardContent /></OnboardingGate>
    </AuthGuard>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageContent />
    </Suspense>
  )
}
