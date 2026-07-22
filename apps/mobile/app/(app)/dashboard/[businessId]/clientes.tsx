import { DashboardHeader } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useBusinessContext } from '@/app/(app)/dashboard/[businessId]/_layout';
import {
  useCreateCustomer,
  useDeleteCustomer,
  useCustomers,
  useUpdateCustomer,
} from '@/lib/queries/fiados';
import type { Customer } from '@/lib/fiados-api';
import * as React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

const money = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
export default function CustomersScreen() {
  const business = useBusinessContext();
  const query = useCustomers(business.id);
  const remove = useDeleteCustomer(business.id);
  const create = useCreateCustomer(business.id);
  const update = useUpdateCustomer(business.id);
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const customers = (query.data ?? []).filter((c) =>
    c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  function openForm(customer?: Customer) {
    setEditing(customer ?? null);
    setName(customer?.name ?? '');
    setPhone(customer?.phone ?? '');
    setNotes(customer?.notes ?? '');
    setOpen(true);
  }
  async function save() {
    if (!name.trim()) return;
    if (editing)
      await update.mutateAsync({
        customerId: editing.id,
        input: { name: name.trim(), phone: phone || null, notes: notes || null },
      });
    else
      await create.mutateAsync({
        name: name.trim(),
        phone: phone || undefined,
        notes: notes || undefined,
      });
    setOpen(false);
  }
  function deactivate(c: Customer) {
    Alert.alert('Desactivar cliente', `¿Desactivar a ${c.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desactivar', style: 'destructive', onPress: () => void remove.mutateAsync(c.id) },
    ]);
  }
  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-10">
      <DashboardHeader
        eyebrow="Catálogo de clientes"
        title="Clientes"
        subtitle="Administra sus datos y consulta sus fiados."
      />
      <Button onPress={() => openForm()}>
        <Text>+ Nuevo cliente</Text>
      </Button>
      <Input
        className="mt-4"
        placeholder="Buscar cliente"
        value={search}
        onChangeText={setSearch}
      />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Tu lista de clientes</CardTitle>
          <CardDescription>
            {customers.length} cliente{customers.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          {query.isPending ? (
            <Text>Cargando clientes...</Text>
          ) : customers.length ? (
            customers.map((c) => (
              <View key={c.id} className="border-border gap-2 border-b py-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold">{c.name}</Text>
                    <Text className="text-muted-foreground text-sm">
                      {c.phone || 'Sin teléfono'}
                    </Text>
                  </View>
                  <Text className={c.totalDebt ? 'font-semibold' : 'text-muted-foreground'}>
                    {c.totalDebt ? money(c.totalDebt) : 'Al día'}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Button size="sm" variant="outline" onPress={() => openForm(c)}>
                    <Text>Editar</Text>
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => deactivate(c)}>
                    <Text>Desactivar</Text>
                  </Button>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-muted-foreground py-8 text-center">Aún no tienes clientes.</Text>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <View className="gap-4">
            <View className="gap-2">
              <Label>Nombre</Label>
              <Input value={name} onChangeText={setName} placeholder="Nombre completo" />
            </View>
            <View className="gap-2">
              <Label>Teléfono</Label>
              <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
            <View className="gap-2">
              <Label>Notas</Label>
              <Input value={notes} onChangeText={setNotes} />
            </View>
          </View>
          <DialogFooter>
            <Button
              onPress={() => void save()}
              disabled={!name.trim() || create.isPending || update.isPending}>
              <Text>Guardar</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}
