import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { signOutGoogle } from '@/lib/google-auth';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Business } from '@/lib/onboarding-api';

type DashboardShellProps = {
  business: Business;
  children: React.ReactNode;
};

export function DashboardShell({ business, children }: DashboardShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      try {
        await signOutGoogle();
      } catch {
        // Native provider cleanup is best-effort after the app session is gone.
      }
      router.replace('/(auth)/sign-in');
    } finally {
      setIsSigningOut(false);
    }
  }

  const user = session?.user ?? { name: null as string | null, email: '' };

  return (
    <View className="bg-background flex-1 flex-row">
      <AppSidebar
        business={business}
        user={{ name: user.name, email: user.email }}
        onSignOut={() => {
          if (!isSigningOut) void handleSignOut();
        }}
      />
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <View className="flex-1 px-4 py-4 sm:px-6">{children}</View>
      </View>
    </View>
  );
}

export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-6 gap-1">
      {eyebrow ? <Text className="text-primary text-sm font-medium">{eyebrow}</Text> : null}
      <Text variant="h3" className="border-0 pb-0">
        {title}
      </Text>
      {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
    </View>
  );
}
