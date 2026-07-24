"use client";

import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CashPage } from "@/components/dashboard/cash/cash-page";
import { Button } from "@/components/ui/button";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useSession } from "@/hooks/use-session";
import { useBusiness } from "@/lib/queries/onboarding";

export default function VentasRoute() {
  return <AuthGuard><VentasContent /></AuthGuard>;
}

function VentasContent() {
  const { user } = useSession();
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();
  const { data: business, isLoading, error } = useBusiness(businessId);
  if (isLoading) return <OikentraLoader label="Cargando ventas" className="min-h-[60vh]" />;
  if (error || !business || !user) return <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center"><p className="text-muted-foreground">No pudimos cargar esta pantalla.</p><Button onClick={() => router.push("/dashboard")}>Volver a mis negocios</Button></div>;
  return <DashboardShell business={business} user={user}><CashPage businessId={businessId} /></DashboardShell>;
}
