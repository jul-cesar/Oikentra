import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, type TextInput, View } from 'react-native';

export function SignUpForm() {
  const router = useRouter();
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  function onNameSubmitEditing() {
    emailInputRef.current?.focus();
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit() {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Name is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name: trimmedName,
        email: email.trim(),
        password,
        callbackURL: 'oikentra://auth/verify',
      });

      if (signUpError) {
        setError(signUpError.message ?? 'Sign up failed. Please try again.');
        return;
      }

      setSuccessMessage('Account created. Check your email to verify your account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Create your account</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome! Please fill in the details to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                autoComplete="name"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                onSubmitEditing={onNameSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInputRef}
                id="email"
                placeholder="m@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
            </View>
            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password">Password</Label>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                secureTextEntry
                returnKeyType="send"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={onSubmit}
              />
            </View>
            {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
            {successMessage ? (
              <Text className="text-sm text-green-600">{successMessage}</Text>
            ) : null}
            <Button className="w-full" onPress={onSubmit} disabled={isSubmitting}>
              <Text>{isSubmitting ? 'Creating account...' : 'Continue'}</Text>
            </Button>
          </View>
          <Text className="text-center text-sm">
            Already have an account?{' '}
            <Pressable onPress={() => router.push('/(auth)/sign-in')}>
              <Text className="text-sm underline underline-offset-4">Sign in</Text>
            </Pressable>
          </Text>
          <View className="flex-row items-center">
            <Separator className="flex-1" />
            <Text className="text-muted-foreground px-4 text-sm">or</Text>
            <Separator className="flex-1" />
          </View>
          <SocialConnections />
        </CardContent>
      </Card>
    </View>
  );
}
