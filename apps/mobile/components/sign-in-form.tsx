import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { signInSchema, type SignInFormValues } from '@/lib/validation/auth-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, type TextInput, View } from 'react-native';

export function SignInForm() {
  const router = useRouter();
  const passwordInputRef = React.useRef<TextInput>(null);

  const [error, setError] = React.useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit(values: SignInFormValues) {
    setError(null);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: true,
      });

      if (signInError) {
        if (signInError.code === 'EMAIL_NOT_VERIFIED') {
          router.replace({ pathname: '/(auth)/verify', params: { email: values.email } });
          return;
        }

        setError('No pudimos iniciar sesión. Revisa tu correo y contraseña.');
        return;
      }

      const { data: activeSession } = await authClient.getSession();
      if (!activeSession?.session) {
        setError('Iniciamos sesión, pero no pudimos abrir tu cuenta. Intenta nuevamente.');
        return;
      }

      router.replace('/(app)');
    } catch {
      setError('Ocurrió un problema inesperado. Intenta nuevamente.');
    }
  }

  return (
    <View className="gap-7 pb-4">
      <View className="gap-3">
        <Text className="text-foreground text-3xl font-extrabold tracking-tight">
          Qué bueno verte
        </Text>
        <Text className="text-muted-foreground text-base leading-6">
          Inicia sesión para seguir llevando el control de tu negocio.
        </Text>
      </View>

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
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
            )}
          />
          {errors.email ? (
            <Text className="text-destructive text-sm">{errors.email.message}</Text>
          ) : null}
        </View>
        <View className="gap-2">
          <View className="min-h-6 flex-row items-center">
            <Label htmlFor="password">Contraseña</Label>
          </View>
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                ref={passwordInputRef}
                id="password"
                className="h-14 rounded-xl px-4"
                placeholder="Tu contraseña"
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="send"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />
          {errors.password ? (
            <Text className="text-destructive text-sm">{errors.password.message}</Text>
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
          disabled={isSubmitting}
          accessibilityLabel={isSubmitting ? 'Iniciando sesión' : 'Iniciar sesión'}>
          <Text className="text-base font-semibold">
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Text>
        </Button>
      </View>

      <View className="flex-row items-center">
        <Separator className="flex-1" />
        <Text className="text-muted-foreground px-4 text-sm">o continúa con</Text>
        <Separator className="flex-1" />
      </View>
      <SocialConnections />

      <View className="flex-row items-center justify-center gap-1">
        <Text className="text-muted-foreground text-sm">¿No tienes una cuenta?</Text>
        <Pressable
          className="min-h-11 justify-center px-2"
          onPress={() => router.push('/(auth)/sign-up')}
          accessibilityRole="button">
          <Text className="text-primary text-sm font-semibold">Regístrate</Text>
        </Pressable>
      </View>
    </View>
  );
}
