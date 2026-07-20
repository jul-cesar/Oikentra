"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { saveActiveBusinessId } from "@/lib/onboarding-api";
import { useBusiness } from "@/lib/queries/onboarding";
import { Button } from "@/components/ui/button";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BusinessDashboard() {
  return (
    <AuthGuard>
      <BusinessDashboardContent />
    </AuthGuard>
  );
}

function BusinessDashboardContent() {
  const { user } = useSession();
  const params = useParams<{ businessId: string }>();
  const router = useRouter();
  const {
    data: business,
    isLoading,
    error,
  } = useBusiness(params.businessId);

  useEffect(() => {
    saveActiveBusinessId(params.businessId);
  }, [params.businessId]);

  if (error)
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={() => router.push("/dashboard")}>
          Volver a mis negocios
        </Button>
      </div>
    );
  if (isLoading || !business || !user)
    return <OikentraLoader label="Cargando tu negocio" className="min-h-[60vh]" />;
  return (
    <DashboardShell business={business} user={user}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium">
            Resumen de {business.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Buenos días, {user.name?.split(" ")[0] || "bienvenido"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Todo lo importante de tu negocio, en un solo lugar.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <EmptyMetric
            label="Ventas de hoy"
            value="$0"
            detail="Aún no hay movimientos registrados"
          />
          <EmptyMetric
            label="Dinero por cobrar"
            value="$0"
            detail="Tus fiados aparecerán aquí"
          />
          <EmptyMetric
            label="Clientes activos"
            value="0"
            detail="Comienza agregando un cliente"
          />
        </div>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Empieza con lo esencial</CardTitle>
            <CardDescription>
              Elige una acción para poner tu negocio en marcha.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => router.push(`/dashboard/${business.id}/fiados`)}
            >
              Registrar un fiado
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/${business.id}/configuracion`)
              }
            >
              Configurar negocio
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
function EmptyMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {detail}
      </CardContent>
    </Card>
  );
}
