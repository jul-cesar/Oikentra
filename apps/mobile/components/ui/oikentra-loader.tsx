import { BrandMark } from '@/components/auth/brand-mark';
import { cn } from '@/lib/utils';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/ui/text';

type OikentraLoaderProps = {
  label?: string;
  className?: string;
};

export function OikentraLoader({
  label = 'Preparando tu espacio',
  className,
}: OikentraLoaderProps) {
  return (
    <View
      className={cn('flex-1 items-center justify-center gap-5 px-6', className)}
      accessibilityRole="progressbar"
      accessibilityLabel={label}>
      <View className="items-center justify-center">
        <BrandMark compact />
        <View className="mt-5">
          <ActivityIndicator size="small" />
        </View>
      </View>
      <Text variant="muted" className="text-center">
        {label}
      </Text>
    </View>
  );
}
