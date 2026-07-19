import { BrandMark } from '@/components/auth/brand-mark';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { HandCoins, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="bg-background" style={{ flex: 1 }}>
      <View className="mx-auto w-full max-w-lg flex-1 px-6 pt-5 pb-7">
        <BrandMark />

        <View className="flex-1 justify-center gap-8 py-8">
          <View className="bg-primary/10 overflow-hidden rounded-[32px] p-5">
            <View className="bg-card border-border gap-4 rounded-3xl border p-5 shadow-sm shadow-black/10">
              <View className="gap-1">
                <Text className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  Tu negocio, hoy
                </Text>
                <Text className="text-xl font-bold">Lo importante, claro</Text>
              </View>
              <View className="flex-row gap-2">
                <View className="bg-muted flex-1 items-center gap-2 rounded-2xl px-2 py-4">
                  <TrendingUp className="text-primary" size={20} />
                  <Text className="text-sm font-semibold">Entró</Text>
                </View>
                <View className="bg-muted flex-1 items-center gap-2 rounded-2xl px-2 py-4">
                  <TrendingDown className="text-primary" size={20} />
                  <Text className="text-sm font-semibold">Salió</Text>
                </View>
                <View className="bg-muted flex-1 items-center gap-2 rounded-2xl px-2 py-4">
                  <HandCoins className="text-primary" size={20} />
                  <Text className="text-sm font-semibold">Me deben</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-foreground text-4xl leading-[44px] font-extrabold tracking-tight">
              Bienvenido a Oikentra
            </Text>
            <Text className="text-muted-foreground max-w-md text-lg leading-7">
              Registra ventas, gastos, fiados y abonos en pocos segundos, incluso cuando no tengas
              conexión.
            </Text>
          </View>
        </View>

        <View className="gap-4">
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl"
            onPress={() => router.push('/(auth)/sign-up')}
            accessibilityLabel="Empezar y crear una cuenta">
            <Text className="text-base font-semibold">Empezar</Text>
          </Button>
          <View className="flex-row flex-wrap items-center justify-center gap-1">
            <Text className="text-muted-foreground">¿Ya tienes una cuenta?</Text>
            <Pressable
              className="min-h-11 justify-center px-2"
              onPress={() => router.push('/(auth)/sign-in')}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión">
              <Text className="text-primary font-semibold">Iniciar sesión</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
