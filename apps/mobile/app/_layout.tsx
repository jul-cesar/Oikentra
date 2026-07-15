import '@/global.css';

import { authClient } from '@/lib/auth-client';
import { configureGoogleSignIn } from '@/lib/google-auth';
import { NAV_THEME } from '@/lib/theme';
import { PortalHost } from '@rn-primitives/portal';
import { Text } from '@/components/ui/text';
import {
  Redirect,
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useUniwind } from 'uniwind';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

const AUTH_PATH_PREFIX = 'oikentra://auth/';

function isValidAuthCallback(url: string): boolean {
  return url.startsWith(AUTH_PATH_PREFIX);
}

function isSupportedAuthPath(path: string): boolean {
  return path === 'verify';
}

function handleAuthUrl(url: string, navigate: (href: string) => void): boolean {
  if (!isValidAuthCallback(url)) {
    return false;
  }

  const parsed = Linking.parse(url);
  const path = parsed.path?.replace(/^\//, '') ?? '';

  if (!isSupportedAuthPath(path)) {
    return false;
  }

  const query = parsed.queryParams as Record<string, string | undefined>;
  const token = typeof query.token === 'string' ? query.token : undefined;
  const params = token ? `?token=${encodeURIComponent(token)}` : '';

  navigate(`/(auth)/verify${params}`);
  return true;
}

export default function RootLayout() {
  const { theme } = useUniwind();
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const segments = useSegments();
  const [initialUrlState, setInitialUrlState] = React.useState({
    url: null as string | null,
    resolved: false,
  });

  React.useEffect(() => {
    configureGoogleSignIn();

    async function handleInitialUrl() {
      const url = await Linking.getInitialURL();
      setInitialUrlState((current) => ({
        url: current.url ?? url,
        resolved: true,
      }));
    }

    handleInitialUrl();

    const subscription = Linking.addEventListener('url', (event) => {
      setInitialUrlState((current) => ({ ...current, url: event.url }));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const rootNavigationState = useRootNavigationState();
  const { url: initialUrl, resolved: initialUrlResolved } = initialUrlState;

  React.useEffect(() => {
    if (!initialUrlResolved || !rootNavigationState?.key || !initialUrl) {
      return;
    }

    handleAuthUrl(initialUrl, (href) =>
      router.navigate(href as Parameters<typeof router.navigate>[0])
    );
    setInitialUrlState((current) => ({ ...current, url: null }));
  }, [initialUrl, initialUrlResolved, rootNavigationState?.key, router]);

  const inAuthGroup = segments[0] === '(auth)';
  const isVerificationRoute = inAuthGroup && segments[1] === 'verify';

  return (
    <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack />
      <PortalHost />
      {isPending || !initialUrlResolved ? (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator />
          <Text className="text-muted-foreground mt-4 text-sm">Loading session...</Text>
        </View>
      ) : session && inAuthGroup && !isVerificationRoute ? (
        <Redirect href="/(app)" />
      ) : !session && !inAuthGroup && !initialUrl ? (
        <Redirect href="/(auth)/sign-in" />
      ) : null}
    </ThemeProvider>
  );
}
