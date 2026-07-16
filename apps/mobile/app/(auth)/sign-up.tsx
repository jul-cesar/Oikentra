import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { SignUpForm } from '@/components/sign-up-form';
import { useRouter } from 'expo-router';

export default function SignUpScreen() {
  const router = useRouter();

  return (
    <AuthScreenShell
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      contentContainerClassName="gap-8">
      <SignUpForm />
    </AuthScreenShell>
  );
}
