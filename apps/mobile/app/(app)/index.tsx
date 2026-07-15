import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
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
      router.replace('/(auth)/sign-in');
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 p-4">
      <Text variant="h2">Protected Screen</Text>
      <View className="gap-2">
        <Text variant="muted">Name: {session.user.name ?? 'N/A'}</Text>
        <Text variant="muted">Email: {session.user.email}</Text>
        <Text variant="muted">Session ID: {session.session.id}</Text>
      </View>
      <Button onPress={handleSignOut} disabled={isSigningOut} className="w-full">
        <Text>{isSigningOut ? 'Signing out...' : 'Sign out'}</Text>
      </Button>
    </View>
  );
}
