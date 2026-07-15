import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { GoogleAuthError, signInWithGoogle } from '@/lib/google-auth';
import * as React from 'react';
import { Image, Platform, useColorScheme, View } from 'react-native';

const SOCIAL_CONNECTION_STRATEGIES = [
  {
    type: 'oauth_google',
    source: { uri: 'https://img.clerk.com/static/google.png?width=160' },
    useTint: false,
  },
] as const;

function useGoogleSignIn() {
  const [error, setError] = React.useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const isSigningInRef = React.useRef(false);

  async function handleGoogle() {
    if (isSigningInRef.current) {
      return;
    }

    isSigningInRef.current = true;
    setIsSigningIn(true);
    setError(null);

    try {
      if (Platform.OS === 'web') {
        // Native Google Sign-In is not supported on web in this scope.
        // A web OAuth flow can be added later without changing the native API.
        setError('Google Sign-In is only available on iOS and Android.');
        return;
      }

      const { idToken } = await signInWithGoogle();

      const { error: signInError } = await authClient.signIn.social({
        provider: 'google',
        idToken: { token: idToken },
      });

      if (signInError) {
        setError(signInError.message ?? 'Google sign in failed.');
        return;
      }

    } catch (err) {
      if (err instanceof GoogleAuthError && err.recoverable) {
        setError(err.message);
        return;
      }
      setError(err instanceof Error ? err.message : 'Google sign in failed.');
    } finally {
      isSigningInRef.current = false;
      setIsSigningIn(false);
    }
  }

  return { handleGoogle, error, isSigningIn };
}

export function SocialConnections() {
  const colorScheme = useColorScheme();
  const { handleGoogle, error, isSigningIn } = useGoogleSignIn();

  return (
    <View className="gap-2 sm:flex-row sm:gap-3">
      {SOCIAL_CONNECTION_STRATEGIES.map((strategy) => {
        return (
          <Button
            key={strategy.type}
            variant="outline"
            size="sm"
            className="sm:flex-1"
            onPress={handleGoogle}
            disabled={isSigningIn}>
            <Image
              className={cn('size-4', strategy.useTint && Platform.select({ web: 'dark:invert' }))}
              tintColor={Platform.select({
                native: strategy.useTint ? (colorScheme === 'dark' ? 'white' : 'black') : undefined,
              })}
              source={strategy.source}
            />
          </Button>
        );
      })}
      {error ? (
        <Text className="text-destructive text-center text-sm">{error}</Text>
      ) : null}
    </View>
  );
}
