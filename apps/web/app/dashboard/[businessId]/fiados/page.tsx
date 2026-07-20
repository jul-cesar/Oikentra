"use client";

import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useSession } from "@/hooks/use-session";
import { useBusiness } from "@/lib/queries/onboarding";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OikentraLoader } from "@/components/ui/oikentra-loader";

export default function Page() {
  return (
    <AuthGuard>
      <CreditsPlaceholder />
    </AuthGuard>
  );
}
function CreditsPlaceholder() {
  const { user } = useSession();
  const { businessId } = useParams<{ businessId: string }>();
  const { data: business, isLoading } = useBusiness(businessId);
  if (isLoading || !business || !user)
    return <OikentraLoader label="Cargando fiados" className="min-h-[60vh]" />;
  return (
    <DashboardShell business={business} user={user}>
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium">Tu negocio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Fiados</h1>
        <p className="mt-2 text-muted-foreground">
          Aquí podrás llevar el control de lo que tus clientes tienen pendiente.
        </p>
        <Card className="mt-8 border-dashed">
          <CardHeader>
            <CardTitle>Estamos preparando este espacio</CardTitle>
            <CardDescription>
              Pronto podrás registrar clientes, nuevos fiados y pagos desde
              aquí.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardShell>
  );
}
