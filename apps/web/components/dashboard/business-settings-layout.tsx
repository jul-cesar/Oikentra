"use client";

import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth-guard";
import { BusinessSettingsNav } from "@/components/dashboard/business-settings-nav";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { canAccessBusinessSettingsPath } from "@/components/dashboard/business-settings-navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useSession } from "@/hooks/use-session";
import { useBusiness } from "@/lib/queries/onboarding";

export function BusinessSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <BusinessSettingsLayoutContent>{children}</BusinessSettingsLayoutContent>
    </AuthGuard>
  );
}

function BusinessSettingsLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useSession();
  const { businessId } = useParams<{ businessId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { data: business, isLoading, error } = useBusiness(businessId);
  const canAccess = business
    ? canAccessBusinessSettingsPath(pathname, businessId, business.role)
    : false;

  useEffect(() => {
    if (!business || canAccess) return;

    router.replace(
      business.role === "OPERATOR"
        ? `/dashboard/${businessId}`
        : `/dashboard/${businessId}/configuracion`,
    );
  }, [business, businessId, canAccess, router]);

  if (isLoading) {
    return (
      <OikentraLoader label="Cargando configuración" className="min-h-[60vh]" />
    );
  }

  if (!business || !user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">
          {error ? "No pudimos cargar este negocio." : ""}
        </p>
        <Button onClick={() => router.push("/dashboard")}>Volver a mis negocios</Button>
      </div>
    );
  }

  if (!canAccess) return null;

  return (
    <DashboardShell business={business} user={user}>
      <DashboardPage
        width="wide"
        className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10"
      >
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 px-1 text-sm font-medium text-primary">Configuración</p>
          <BusinessSettingsNav businessId={businessId} role={business.role} />
        </aside>
        <div className="min-w-0">{children}</div>
      </DashboardPage>
    </DashboardShell>
  );
}
