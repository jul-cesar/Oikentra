import { DashboardHeader } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { useBusinessContext } from '@/app/(app)/dashboard/[businessId]/_layout';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function BusinessDashboardScreen() {
  const business = useBusinessContext();
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const firstName = session?.user?.name?.split(' ')[0] || 'bienvenido';

  return (
    <View className="flex-1">
      <DashboardHeader
        eyebrow={`Resumen de ${business.name}`}
        title={`Buenos días, ${firstName}`}
        subtitle="Todo lo importante de tu negocio, en un solo lugar."
      />
      <View className="gap-4">
        <View className="flex-col gap-4 sm:flex-row">
          <EmptyMetric
            label="Ventas de hoy"
            value="$0"
            detail="Aún no hay movimientos registrados"
          />
          <EmptyMetric label="Dinero por cobrar" value="$0" detail="Tus fiados aparecerán aquí" />
          <EmptyMetric label="Clientes activos" value="0" detail="Comienza agregando un cliente" />
        </View>
        <Card>
          <CardHeader>
            <CardTitle>Empieza con lo esencial</CardTitle>
            <CardDescription>Elige una acción para poner tu negocio en marcha.</CardDescription>
          </CardHeader>
          <CardContent className="flex-col gap-3 sm:flex-row">
            <Button onPress={() => router.push(`/dashboard/${business.id}/ventas` as Href)}>
              <Text>Ir a caja</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => router.push(`/dashboard/${business.id}/fiados` as Href)}>
              <Text>Registrar un fiado</Text>
            </Button>
            {business.role === 'OWNER' || business.role === 'MANAGER' ? (
              <Button
                variant="outline"
                onPress={() => router.push(`/dashboard/${business.id}/configuracion` as Href)}>
                <Text>Configurar negocio</Text>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </View>
    </View>
  );
}

function EmptyMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <Text variant="muted" className="text-xs">
          {detail}
        </Text>
      </CardContent>
    </Card>
  );
}
