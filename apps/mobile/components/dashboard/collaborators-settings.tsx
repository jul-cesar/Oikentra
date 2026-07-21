import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  useCreateInvitation,
  useInvitations,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from '@/lib/queries/members';
import * as React from 'react';
import { View } from 'react-native';
export function CollaboratorsSettings({ businessId }: { businessId: string }) {
  const [identifier, setIdentifier] = React.useState('');
  const [role, setRole] = React.useState<'OPERATOR' | 'MANAGER'>('OPERATOR');
  const [message, setMessage] = React.useState('');
  const members = useMembers(businessId);
  const invitations = useInvitations(businessId);
  const create = useCreateInvitation(businessId);
  const revoke = useRevokeInvitation(businessId);
  const update = useUpdateMemberRole(businessId);
  const remove = useRemoveMember(businessId);
  async function invite() {
    try {
      await create.mutateAsync({ identifier, role });
      setIdentifier('');
      setMessage('Invitación creada correctamente.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No pudimos crear la invitación.');
    }
  }
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Colaboradores e invitaciones</CardTitle>
        <CardDescription>Invita a alguien por correo o teléfono y define su rol.</CardDescription>
      </CardHeader>
      <CardContent className="gap-5">
        {message ? <Text className="text-primary">{message}</Text> : null}
        <Input placeholder="Correo o teléfono" value={identifier} onChangeText={setIdentifier} />
        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant={role === 'OPERATOR' ? 'default' : 'outline'}
            onPress={() => setRole('OPERATOR')}>
            <Text>Operador</Text>
          </Button>
          <Button
            size="sm"
            variant={role === 'MANAGER' ? 'default' : 'outline'}
            onPress={() => setRole('MANAGER')}>
            <Text>Administrador</Text>
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onPress={() => void invite()}
            disabled={!identifier || create.isPending}>
            <Text>Invitar</Text>
          </Button>
        </View>
        {members.data?.length ? (
          <View className="gap-2">
            <Text className="font-semibold">Miembros activos</Text>
            {members.data.map((m) => (
              <View
                key={m.id}
                className="border-border flex-row items-center justify-between border-b py-2">
                <View>
                  <Text>{m.role === 'OWNER' ? 'Propietario' : m.userId}</Text>
                  <Text className="text-muted-foreground text-xs">{m.status}</Text>
                </View>
                {m.role !== 'OWNER' ? (
                  <View className="flex-row gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() =>
                        void update.mutateAsync({
                          memberId: m.id,
                          role: m.role === 'MANAGER' ? 'OPERATOR' : 'MANAGER',
                        })
                      }>
                      <Text>{m.role === 'MANAGER' ? 'Operador' : 'Admin'}</Text>
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => void remove.mutateAsync(m.id)}>
                      <Text>Retirar</Text>
                    </Button>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
        {invitations.data?.length ? (
          <View className="gap-2">
            <Text className="font-semibold">Invitaciones</Text>
            {invitations.data.map((i) => (
              <View
                key={i.id}
                className="border-border flex-row items-center justify-between border-b py-2">
                <View>
                  <Text>{i.identifier}</Text>
                  <Text className="text-muted-foreground text-xs">
                    {i.role === 'MANAGER' ? 'Administrador' : 'Operador'} · {i.status}
                  </Text>
                </View>
                {i.status === 'PENDING' ? (
                  <Button size="sm" variant="ghost" onPress={() => void revoke.mutateAsync(i.id)}>
                    <Text>Revocar</Text>
                  </Button>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}
