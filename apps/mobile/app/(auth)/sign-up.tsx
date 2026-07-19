import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { SignUpForm } from '@/components/sign-up-form';
import { useRouter } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import { useEffect } from 'react';

export default function SignUpScreen() {
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
      <SignUpForm />
    </AuthScreenShell>
  );
}
