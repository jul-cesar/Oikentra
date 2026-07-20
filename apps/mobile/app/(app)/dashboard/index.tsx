import { OikentraLoader } from '@/components/ui/oikentra-loader';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { getActiveBusinessId } from '@/lib/onboarding-api';
import { useBusinesses } from '@/lib/queries/onboarding';
import { Href, Redirect, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function DashboardIndex() {
  const router = useRouter();
  const { data: businesses, isPending, error, refetch } = useBusinesses();

  const target = React.useMemo(() => {
    if (!businesses?.length) return null;
    const activeId = getActiveBusinessId();
    return activeId && businesses.some((b) => b.id === activeId) ? activeId : businesses[0].id;
  }, [businesses]);

  if (isPending && !businesses) {
    return <OikentraLoader label="Cargando tus negocios" />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text className="text-destructive text-center" accessibilityRole="alert">
          {error.message}
        </Text>
        <Button onPress={() => void refetch()}>
          <Text>Reintentar</Text>
        </Button>
      </View>
    );
  }

  if (!target) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text variant="muted" className="text-center">
          No tienes negocios aún. Completa el onboarding para empezar.
        </Text>
        <Button onPress={() => router.replace('/' as Href)}>
          <Text>Volver al inicio</Text>
        </Button>
      </View>
    );
  }

  return <Redirect href={`/dashboard/${target}` as Href} />;
}
