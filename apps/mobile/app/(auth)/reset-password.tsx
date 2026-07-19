import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient, createAuthRequestOptions } from '@/lib/auth-client';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validation/auth-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token, error: callbackError } = useLocalSearchParams<{
    token?: string;
    error?: string;
  }>();
  const [error, setError] = React.useState<string | null>(() =>
    callbackError ? 'El enlace no es válido o ya venció. Solicita uno nuevo.' : null
  );
  const [success, setSuccess] = React.useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      setError('El enlace no es válido o ya venció. Solicita uno nuevo.');
      return;
    }

    setError(null);
    try {
      const { error: resetError } = await authClient.resetPassword({
        token,
        newPassword: values.password,
        fetchOptions: createAuthRequestOptions(),
      });

      if (resetError) {
        setError(
          resetError.code === 'INVALID_TOKEN' || resetError.code === 'TOKEN_EXPIRED'
            ? 'El enlace no es válido o ya venció. Solicita uno nuevo.'
            : 'No pudimos restablecer tu contraseña. Intenta nuevamente.'
        );
        return;
      }

      setSuccess(true);
    } catch {
      setError('Ocurrió un problema inesperado. Intenta nuevamente.');
    }
  }

  return (
    <AuthScreenShell
      onBack={success ? undefined : () => router.replace('/(auth)/sign-in')}
      contentContainerClassName="gap-8">
      <View className="gap-7 pb-4">
        <View className="gap-3">
          <Text className="text-foreground text-3xl font-extrabold tracking-tight">
            {success ? 'Contraseña actualizada' : 'Restablece tu contraseña'}
          </Text>
          <Text
            className="text-muted-foreground text-base leading-6"
            accessibilityLiveRegion="polite">
            {success
              ? 'Tu contraseña fue cambiada. Inicia sesión para continuar.'
              : token
                ? 'Elige una contraseña nueva para tu cuenta.'
                : 'Este enlace no contiene la información necesaria para restablecer tu contraseña.'}
          </Text>
        </View>

        {success ? (
          <Button
            size="lg"
            className="h-14 w-full rounded-xl"
            onPress={() => router.replace('/(auth)/sign-in')}>
            <Text className="text-base font-semibold">Iniciar sesión</Text>
          </Button>
        ) : token ? (
          <View className="gap-5">
            <View className="gap-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Controller
                control={control}
                name="password"
                render={({ field: { onBlur, onChange, value } }) => (
                  <Input
                    id="password"
                    className="h-14 rounded-xl px-4"
                    placeholder="Mínimo 8 caracteres"
                    secureTextEntry
                    autoComplete="new-password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {errors.password ? (
                <Text className="text-destructive text-sm">{errors.password.message}</Text>
              ) : null}
            </View>
            <View className="gap-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onBlur, onChange, value } }) => (
                  <Input
                    id="confirm-password"
                    className="h-14 rounded-xl px-4"
                    placeholder="Repite tu contraseña"
                    secureTextEntry
                    autoComplete="new-password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    onSubmitEditing={handleSubmit(onSubmit)}
                    returnKeyType="send"
                  />
                )}
              />
              {errors.confirmPassword ? (
                <Text className="text-destructive text-sm">{errors.confirmPassword.message}</Text>
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
                {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
              </Text>
            </Button>
          </View>
        ) : (
          <Button
            size="lg"
            variant="outline"
            className="h-14 w-full rounded-xl"
            onPress={() => router.replace('/(auth)/forgot-password')}>
            <Text className="text-base font-semibold">Solicitar nuevo enlace</Text>
          </Button>
        )}
      </View>
    </AuthScreenShell>
  );
}
