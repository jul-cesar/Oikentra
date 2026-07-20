import '@/global.css';

import { authClient, persistAuthCookie } from '@/lib/auth-client';
import { configureGoogleSignIn } from '@/lib/google-auth';
import { makeQueryClient } from '@/lib/query-client';
import { NAV_THEME } from '@/lib/theme';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-context';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as React from 'react';
import { OikentraLoader } from '@/components/ui/oikentra-loader';
import { ScopedTheme } from 'uniwind';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

const AUTH_PATH_PREFIX = 'oikentra://auth/';

function isValidAuthCallback(url: string): boolean {
  return url.startsWith(AUTH_PATH_PREFIX);
}

function isSupportedAuthPath(path: string): boolean {
  return path === 'verify' || path === 'sign-in' || path === 'reset-password';
}

async function handleAuthUrl(url: string, navigate: (href: string) => void): Promise<boolean> {
  if (!isValidAuthCallback(url)) {
    return false;
  }

  const parsed = Linking.parse(url);
  const path = parsed.path?.replace(/^\//, '') ?? '';

  if (!isSupportedAuthPath(path)) {
    return false;
  }

  if (path === 'sign-in') {
    navigate('/(auth)/sign-in');
    return true;
  }

  const query = parsed.queryParams as Record<string, string | undefined>;
  const token = typeof query.token === 'string' ? query.token : undefined;
  const callbackError = typeof query.error === 'string' ? query.error : undefined;
  const email = typeof query.email === 'string' ? query.email : undefined;
  const verified = typeof query.verified === 'string' ? query.verified : undefined;
  const cookie = typeof query.cookie === 'string' ? query.cookie : undefined;

  if (cookie) {
    try {
      await persistAuthCookie(cookie);
    } catch {
      // The verification screen offers sign-in recovery if the session cannot be restored.
    }
  }

  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (callbackError) params.set('error', callbackError);
  if (email) params.set('email', email);
  if (verified) params.set('verified', verified);
  const queryString = params.toString();

  navigate(`/(auth)/${path}${queryString ? `?${queryString}` : ''}`);
  return true;
}

export default function RootLayout() {
  const [queryClient] = React.useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <RootLayoutInner />
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

function RootLayoutInner() {
  const { theme } = useThemePreference();
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

    async function navigateFromAuthUrl() {
      await handleAuthUrl(initialUrl as string, (href) =>
        router.navigate(href as Parameters<typeof router.navigate>[0])
      );
      setInitialUrlState((current) => ({ ...current, url: null }));
    }

    void navigateFromAuthUrl();
  }, [initialUrl, initialUrlResolved, rootNavigationState?.key, router]);

  const inAuthGroup = segments[0] === '(auth)';
  const isVerificationRoute = inAuthGroup && segments[1] === 'verify';

  React.useEffect(() => {
    if (isPending || !initialUrlResolved) return;

    if (session && inAuthGroup && !isVerificationRoute) {
      router.replace('/(app)');
    }
  }, [inAuthGroup, initialUrlResolved, isPending, isVerificationRoute, router, session]);

  return (
    <ThemeProvider value={NAV_THEME[theme]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <ScopedTheme theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
        <PortalHost />
        {isPending || !initialUrlResolved ? <OikentraLoader label="Cargando sesión..." /> : null}
      </ScopedTheme>
    </ThemeProvider>
  );
}
