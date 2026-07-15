import { authClient } from '@/lib/auth-client';
import { Text } from '@/components/ui/text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function VerifyScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [status, setStatus] = React.useState<'waiting' | 'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [message, setMessage] = React.useState('Verifying your email...');

  React.useEffect(() => {
    let cancelled = false;

    async function handleVerification() {
      try {
        if (!token) {
          if (!cancelled) {
            setStatus('waiting');
            setMessage('Check your email for a verification link.');
          }
          return;
        }

        const { error } = await authClient.verifyEmail({
          query: { token },
        });

        if (error) {
          if (!cancelled) {
            setStatus('error');
            setMessage(error.message ?? 'Verification failed. The link may be expired or invalid.');
          }
          return;
        }

        const { data, error: sessionError } = await authClient.getSession();

        if (!cancelled) {
          if (data?.session) {
            setStatus('success');
            setMessage('Your email is verified. Redirecting...');
            router.replace('/(app)');
          } else if (sessionError) {
            setStatus('error');
            setMessage(sessionError.message ?? 'Could not refresh your session.');
          } else {
            setStatus('error');
            setMessage('No active session found. Please sign in.');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(
            error instanceof Error ? error.message : 'An unexpected error occurred.'
          );
        }
      }
    }

    handleVerification();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className={status === 'error' ? 'text-destructive' : 'text-foreground'}>
        {message}
      </Text>
    </View>
  );
}
