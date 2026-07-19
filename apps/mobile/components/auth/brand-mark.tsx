import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Store } from 'lucide-react-native';
import { View } from 'react-native';

type BrandMarkProps = {
  compact?: boolean;
};

// Replace this component when the final Oikentra brand asset is available.
export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <View className="flex-row items-center gap-3" accessibilityLabel="Oikentra">
      <View
        className={cn(
          'bg-primary items-center justify-center shadow-sm shadow-black/10',
          compact ? 'size-10 rounded-xl' : 'size-14 rounded-2xl'
        )}>
        <Store color="#f7fffc" size={compact ? 21 : 28} strokeWidth={2.4} />
      </View>
      <Text className={cn('font-bold tracking-tight', compact ? 'text-xl' : 'text-2xl')}>
        Oikentra
      </Text>
    </View>
  );
}
