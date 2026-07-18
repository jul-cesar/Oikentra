import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { signUpSchema, type SignUpFormValues } from '@/lib/validation/auth-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, type TextInput, View } from 'react-native';

export function SignUpForm() {
  const router = useRouter();
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);

  const [error, setError] = React.useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit(values: SignUpFormValues) {
    setError(null);

    try {
      // Better Auth requires a name even though registration only collects credentials.
      const { error: signUpError } = await authClient.signUp.email({
        name: values.email.split('@')[0],
        email: values.email,
        password: values.password,
        callbackURL: `oikentra://auth/verify?verified=1&email=${encodeURIComponent(values.email)}`,
      });

      if (signUpError) {
        setError('No pudimos crear tu cuenta. Revisa los datos e intenta nuevamente.');
        return;
      }

      router.replace({
        pathname: '/(auth)/verify',
        params: { email: values.email, sent: '1' },
      });
    } catch {
      setError('Ocurrió un problema inesperado. Intenta nuevamente.');
    }
  }

  return (
    <View className="gap-7 pb-4">
      <View className="gap-3">
        <Text className="text-foreground text-3xl font-extrabold tracking-tight">
          Crea tu cuenta
        </Text>
        <Text className="text-muted-foreground text-base leading-6">
          Completa tus datos para empezar a llevar el control de tu negocio.
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
                ref={emailInputRef}
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
          <View className="flex-row items-center">
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
                placeholder="Mínimo 8 caracteres"
                secureTextEntry
                autoComplete="new-password"
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
          accessibilityLabel={isSubmitting ? 'Creando cuenta' : 'Crear cuenta'}>
          <Text className="text-base font-semibold">
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
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
        <Text className="text-muted-foreground text-sm">¿Ya tienes una cuenta?</Text>
        <Pressable
          className="min-h-11 justify-center px-2"
          onPress={() => router.push('/(auth)/sign-in')}
          accessibilityRole="button">
          <Text className="text-primary text-sm font-semibold">Inicia sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}
