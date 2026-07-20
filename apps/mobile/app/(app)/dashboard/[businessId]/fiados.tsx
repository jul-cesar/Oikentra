import { DashboardHeader } from '@/components/dashboard/dashboard-shell';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessContext } from '@/app/(app)/dashboard/[businessId]/_layout';
import * as React from 'react';
import { View } from 'react-native';

export default function FiadosScreen() {
  const business = useBusinessContext();

  return (
    <View className="flex-1">
      <DashboardHeader
        eyebrow={business.name}
        title="Fiados"
        subtitle="Aquí podrás llevar el control de lo que tus clientes tienen pendiente."
      />
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Estamos preparando este espacio</CardTitle>
          <CardDescription>
            Pronto podrás registrar clientes, nuevos fiados y pagos desde aquí.
          </CardDescription>
        </CardHeader>
      </Card>
    </View>
  );
}
