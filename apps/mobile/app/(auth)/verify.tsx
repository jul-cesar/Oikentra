import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, Check, Mail, RefreshCw } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

const RESEND_COOLDOWN_SECONDS = 300;

type VerificationStatus = 'pending' | 'verifying' | 'success' | 'error';

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

async function hasActiveSession() {
  try {
    const { data } = await authClient.getSession();
    return Boolean(data?.session);
  } catch {
    return false;
  }
}

export default function VerifyScreen() {
  const {
    token,
    email,
    verified,
    sent,
    error: callbackError,
  } = useLocalSearchParams<{
    token?: string;
    email?: string;
    verified?: string;
    sent?: string;
    error?: string;
  }>();
  const router = useRouter();
  const normalizedCallbackError = callbackError?.toLowerCase();
  const isVerifiedCallback = verified === '1' && !normalizedCallbackError;
  const [status, setStatus] = React.useState<VerificationStatus>(() => {
    if (normalizedCallbackError) return 'error';
    if (isVerifiedCallback) return 'success';
    if (token) return 'verifying';
    return 'pending';
  });
  const [message, setMessage] = React.useState(() => {
    if (normalizedCallbackError) {
      return 'El enlace no es válido o ya venció. Solicita uno nuevo para continuar.';
    }
    if (isVerifiedCallback) return 'Tu correo quedó confirmado. Inicia sesión para continuar.';
    if (token) return 'Estamos comprobando tu enlace.';
    return 'Abre el enlace que te enviamos. Puede tardar un par de minutos en llegar.';
  });
  const [isResending, setIsResending] = React.useState(false);
  const [hasVerifiedSession, setHasVerifiedSession] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(sent === '1' ? RESEND_COOLDOWN_SECONDS : 0);
  const resendInFlightRef = React.useRef(false);

  React.useEffect(() => {
    if (normalizedCallbackError) {
      setStatus('error');
      setMessage('El enlace no es válido o ya venció. Solicita uno nuevo para continuar.');
      return;
    }

    if (!isVerifiedCallback) return;

    let cancelled = false;

    async function checkVerifiedSession() {
      if (await hasActiveSession() && !cancelled) {
        setHasVerifiedSession(true);
      }
    }

    void checkVerifiedSession();

    return () => {
      cancelled = true;
    };
  }, [email, isVerifiedCallback, normalizedCallbackError]);

  React.useEffect(() => {
    if (!token || normalizedCallbackError || isVerifiedCallback) {
      return;
    }

    let cancelled = false;

    async function verifyToken() {
      try {
        const { error } = await authClient.verifyEmail({ query: { token: token as string } });

        if (cancelled) return;

        if (error) {
          setStatus('error');
          setMessage('El enlace no es válido o ya venció. Solicita uno nuevo para continuar.');
          return;
        }

        setStatus('success');
        setMessage('Tu correo quedó confirmado. Inicia sesión para continuar.');

        if (await hasActiveSession()) {
          if (cancelled) return;
          setHasVerifiedSession(true);
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('No pudimos comprobar el enlace. Solicita uno nuevo para continuar.');
        }
      }
    }

    verifyToken();

    return () => {
      cancelled = true;
    };
  }, [email, isVerifiedCallback, normalizedCallbackError, token]);

  React.useEffect(() => {
    if (cooldown === 0) return;

    const interval = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  async function handleResend() {
    if (!email || cooldown > 0 || resendInFlightRef.current) return;

    resendInFlightRef.current = true;
    setIsResending(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStatus('pending');
    setMessage('Estamos enviando un nuevo enlace a tu correo.');

    try {
      const { error: resendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: `oikentra://auth/verify?verified=1&email=${encodeURIComponent(email)}`,
      });

      if (resendError) {
        setStatus('error');
        setMessage('No pudimos reenviar el correo. Intenta nuevamente cuando termine la espera.');
        return;
      }

      setMessage('Te enviamos un nuevo enlace. Revisa también la carpeta de spam.');
    } catch {
      setStatus('error');
      setMessage('No pudimos reenviar el correo. Intenta nuevamente cuando termine la espera.');
    } finally {
      resendInFlightRef.current = false;
      setIsResending(false);
    }
  }

  const isBusy = status === 'verifying' || isResending;
  const isInvalidLink =
    normalizedCallbackError === 'invalid_token' ||
    normalizedCallbackError === 'token_expired' ||
    normalizedCallbackError === 'expired_token';
  const title =
    status === 'success'
      ? 'Correo confirmado'
      : status === 'error'
        ? isInvalidLink
          ? 'El enlace venció'
          : 'No pudimos verificarte'
        : 'Confirma tu correo';
  const StatusIcon = status === 'success' ? Check : status === 'error' ? AlertCircle : Mail;

  return (
    <AuthScreenShell
      onBack={status === 'success' ? undefined : () => router.replace('/(auth)/sign-in')}
      contentContainerClassName="gap-8">
      <View className="flex-1 justify-center gap-8 py-8">
        <View
          className={cn(
            'size-20 items-center justify-center rounded-3xl',
            status === 'error' ? 'bg-destructive/10' : 'bg-primary/10'
          )}>
          {isBusy ? (
            <ActivityIndicator color="#159a73" />
          ) : (
            <StatusIcon
              className={status === 'error' ? 'text-destructive' : 'text-primary'}
              size={36}
              strokeWidth={2.2}
            />
          )}
        </View>

        <View className="gap-3">
          <Text className="text-foreground text-3xl font-extrabold tracking-tight">{title}</Text>
          {email ? (
            <Text className="text-foreground text-base font-semibold" selectable>
              {email}
            </Text>
          ) : null}
          <Text
            className={cn(
              'text-base leading-7',
              status === 'error' ? 'text-destructive' : 'text-muted-foreground'
            )}
            accessibilityLiveRegion="polite">
            {message}
          </Text>
        </View>

        {status === 'success' && hasVerifiedSession ? (
          <Button
            size="lg"
            className="h-14 w-full rounded-xl"
            onPress={() => router.replace('/(app)')}
            accessibilityLabel="Continuar a Oikentra">
            <Text className="text-base font-semibold">Continuar</Text>
          </Button>
        ) : status === 'success' ? (
          <Button
            size="lg"
            className="h-14 w-full rounded-xl"
            onPress={() => router.replace('/(auth)/sign-in')}>
            <Text className="text-base font-semibold">Iniciar sesión</Text>
          </Button>
        ) : email ? (
          <View className="gap-3">
            <Button
              variant={status === 'error' ? 'default' : 'outline'}
              size="lg"
              className="h-14 w-full rounded-xl"
              onPress={handleResend}
              disabled={isBusy || cooldown > 0}
              accessibilityLabel={
                cooldown > 0
                  ? `Podrás reenviar el correo en ${formatCooldown(cooldown)}`
                  : 'Reenviar correo de verificación'
              }>
              <RefreshCw size={18} />
              <Text className="text-base font-semibold">
                {isResending
                  ? 'Enviando...'
                  : cooldown > 0
                    ? `Reenviar en ${formatCooldown(cooldown)}`
                    : 'Reenviar correo'}
              </Text>
            </Button>
            {cooldown > 0 ? (
              <Text className="text-muted-foreground text-center text-sm">
                Podrás solicitar otro enlace cuando termine la espera.
              </Text>
            ) : null}
          </View>
        ) : status === 'error' ? (
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full rounded-xl"
            onPress={() => router.replace('/(auth)/sign-up')}>
            <Text className="text-base font-semibold">Volver al registro</Text>
          </Button>
        ) : null}
      </View>
    </AuthScreenShell>
  );
}
