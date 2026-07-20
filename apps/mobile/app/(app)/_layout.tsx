import { OikentraLoader } from '@/components/ui/oikentra-loader';
import { authClient } from '@/lib/auth-client';
import { Redirect, Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1">
        <OikentraLoader label="Verificando tu sesión" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
