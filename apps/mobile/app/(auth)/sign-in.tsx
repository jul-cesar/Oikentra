import { SignInForm } from '@/components/sign-in-form';
import { View } from 'react-native';

export default function SignInScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <SignInForm />
    </View>
  );
}
