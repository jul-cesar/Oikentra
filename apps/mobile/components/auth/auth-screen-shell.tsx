import { BrandMark } from '@/components/auth/brand-mark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react-native';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthScreenShellProps = {
  children: React.ReactNode;
  onBack?: () => void;
  showBrand?: boolean;
  contentContainerClassName?: string;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

export function AuthScreenShell({
  children,
  onBack,
  showBrand = true,
  contentContainerClassName = '',
  keyboardShouldPersistTaps = 'handled',
}: AuthScreenShellProps) {
  return (
    <SafeAreaView className="bg-background" style={{ flex: 1 }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}>
          <View
            className={cn(
              'mx-auto w-full max-w-lg flex-1 px-6 pt-3 pb-8',
              contentContainerClassName
            )}>
            <View className="min-h-12 flex-row items-center">
              {onBack ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 size-12 rounded-full"
                  onPress={onBack}
                  accessibilityLabel="Volver">
                  <ArrowLeft size={23} />
                </Button>
              ) : null}
            </View>
            {showBrand ? <BrandMark compact /> : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
