import { SignUpForm } from '@/components/sign-up-form';
import { View } from 'react-native';

export default function SignUpScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <SignUpForm />
    </View>
  );
}
