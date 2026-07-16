import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { SignInForm } from '@/components/sign-in-form';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const router = useRouter();

  return (
    <AuthScreenShell
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      contentContainerClassName="gap-8">
      <SignInForm />
    </AuthScreenShell>
  );
}
