import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient, createAuthRequestOptions } from '@/lib/auth-client';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validation/auth-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setError(null);
    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: 'oikentra://auth/reset-password',
        fetchOptions: createAuthRequestOptions(),
      });

      if (requestError) {
        setError(
          requestError.code === 'PASSWORD_RESET_NOT_AVAILABLE'
            ? 'Esta cuenta solo usa Google. Inicia sesión con Google para continuar.'
            : 'No pudimos enviar el correo. Intenta nuevamente.'
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Ocurrió un problema inesperado. Intenta nuevamente.');
    }
  }

  return (
    <AuthScreenShell
      onBack={() => router.replace('/(auth)/sign-in')}
      contentContainerClassName="gap-8">
      <View className="gap-7 pb-4">
        <View className="gap-3">
          <Text className="text-foreground text-3xl font-extrabold tracking-tight">
            ¿Olvidaste tu contraseña?
          </Text>
          <Text className="text-muted-foreground text-base leading-6">
            Ingresa tu correo y te enviaremos un enlace seguro para restablecerla.
          </Text>
        </View>

        {submitted ? (
          <View className="gap-5">
            <Text
              className="text-muted-foreground text-base leading-6"
              accessibilityLiveRegion="polite">
              Si tu correo está registrado, recibirás instrucciones para restablecer tu contraseña.
            </Text>
            <Button
              size="lg"
              className="h-14 w-full rounded-xl"
              onPress={() => router.replace('/(auth)/sign-in')}>
              <Text className="text-base font-semibold">Volver a iniciar sesión</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-5">
            <View className="gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Controller
                control={control}
                name="email"
                render={({ field: { onBlur, onChange, value } }) => (
                  <Input
                    id="email"
                    placeholder="tu@correo.com"
                    className="h-14 rounded-xl px-4"
                    keyboardType="email-address"
                    autoComplete="email"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    onSubmitEditing={handleSubmit(onSubmit)}
                    returnKeyType="send"
                  />
                )}
              />
              {errors.email ? (
                <Text className="text-destructive text-sm">{errors.email.message}</Text>
              ) : null}
            </View>
            {error ? (
              <Text className="text-destructive" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <Button
              size="lg"
              className="h-14 w-full rounded-xl"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}>
              <Text className="text-base font-semibold">
                {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
              </Text>
            </Button>
            <View className="flex-row items-center justify-center gap-1">
              <Text className="text-muted-foreground text-sm">¿Recuerdas tu contraseña?</Text>
              <Pressable
                className="min-h-11 justify-center px-2"
                onPress={() => router.replace('/(auth)/sign-in')}>
                <Text className="text-primary text-sm font-semibold">Inicia sesión</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </AuthScreenShell>
  );
}
