import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { OikentraLoader } from '@/components/ui/oikentra-loader';
import { Text } from '@/components/ui/text';
import { saveActiveBusinessId, type Business } from '@/lib/onboarding-api';
import { useBusiness } from '@/lib/queries/onboarding';
import { Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export const BusinessContext = React.createContext<Business | null>(null);

export function useBusinessContext() {
  const value = React.useContext(BusinessContext);
  if (!value) {
    throw new Error('useBusinessContext must be used within a business layout.');
  }
  return value;
}

export default function BusinessLayout() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const router = useRouter();
  const { data: business, isPending, error, refetch } = useBusiness(businessId);

  React.useEffect(() => {
    if (businessId) {
      void saveActiveBusinessId(businessId);
    }
  }, [businessId]);

  if (isPending && !business) {
    return <OikentraLoader label="Cargando tu negocio" />;
  }

  if (error || !business) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text className="text-destructive text-center" accessibilityRole="alert">
          {error?.message || 'No encontramos este negocio.'}
        </Text>
        <Button onPress={() => (error ? void refetch() : router.replace('/dashboard' as Href))}>
          <Text>{error ? 'Reintentar' : 'Volver a mis negocios'}</Text>
        </Button>
      </View>
    );
  }

  return (
    <BusinessContext.Provider value={business}>
      <DashboardShell business={business}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        />
      </DashboardShell>
    </BusinessContext.Provider>
  );
}
