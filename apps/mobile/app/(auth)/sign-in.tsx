import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { SignInForm } from '@/components/sign-in-form';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

export default function SignInScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session) router.replace('/(app)');
  }, [isPending, router, session]);

  if (isPending || session) return null;

  return (
    <AuthScreenShell
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      contentContainerClassName="gap-8">
      <SignInForm />
    </AuthScreenShell>
  );
}
