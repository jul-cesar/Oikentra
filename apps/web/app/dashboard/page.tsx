"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { OnboardingGate } from "@/components/onboarding-gate";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <AuthGuard>
        <OnboardingGate>
          <div className="flex min-h-svh items-center justify-center text-muted-foreground">
            Selecciona un negocio para continuar.
          </div>
        </OnboardingGate>
      </AuthGuard>
    </Suspense>
  );
}
