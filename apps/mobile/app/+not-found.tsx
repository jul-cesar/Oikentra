import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página no encontrada' }} />
      <View>
        <Text>Esta pantalla no existe.</Text>

        <Link href="/">
          <Text>Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}
