"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { OnboardingGate } from "@/components/onboarding-gate";
import { PendingInvitations } from "@/components/pending-invitations";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <AuthGuard>
        <PendingInvitations />
        <OnboardingGate>
          <div className="flex min-h-svh items-center justify-center text-muted-foreground">
            Selecciona un negocio para continuar.
          </div>
        </OnboardingGate>
      </AuthGuard>
    </Suspense>
  );
}
