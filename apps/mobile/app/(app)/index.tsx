import { Button } from '@/components/ui/button';
import { OnboardingGate } from '@/components/onboarding-gate';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { signOutGoogle } from '@/lib/google-auth';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      try {
        await signOutGoogle();
      } catch {
        // Native provider cleanup is best effort after the app session is gone.
      }
      router.replace('/(auth)/sign-in');
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!session) {
    return null;
  }

  return <OnboardingGate><View className="flex-1 items-center justify-center gap-6 p-4">
      <Text variant="h2">Pantalla protegida</Text>
      <View className="gap-2">
        <Text variant="muted">Nombre: {session.user.name ?? 'No disponible'}</Text>
        <Text variant="muted">Correo: {session.user.email}</Text>
        <Text variant="muted">ID de sesión: {session.session.id}</Text>
      </View>
      <Button onPress={handleSignOut} disabled={isSigningOut} className="w-full">
        <Text>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</Text>
      </Button>
    </View></OnboardingGate>;
}
