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
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { useBusinessContext } from '@/app/(app)/dashboard/[businessId]/_layout';
import {
  useCreateCredit,
  useCreatePayment,
  useCreditSummary,
  useCredits,
  useCustomers,
} from '@/lib/queries/fiados';
import type { Customer, Credit } from '@/lib/fiados-api';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
const money = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export default function FiadosScreen() {
  const business = useBusinessContext();
  const customers = useCustomers(business.id);
  const credits = useCredits(business.id);
  const summary = useCreditSummary(business.id);
  const create = useCreateCredit(business.id);
  const pay = useCreatePayment(business.id);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'debt' | 'clear' | 'old'>('all');
  const [creditOpen, setCreditOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Customer | null>(null);
  const [selectedCredit, setSelectedCredit] = React.useState<Credit | null>(null);
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [creditDate, setCreditDate] = React.useState(new Date());
  const [paymentDate, setPaymentDate] = React.useState(new Date());
  const list = (customers.data ?? [])
    .filter((c) => c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    .filter(
      (c) =>
        filter === 'all' ||
        (filter === 'debt' && c.totalDebt > 0) ||
        (filter === 'clear' && c.totalDebt === 0) ||
        (filter === 'old' && c.oldDebt)
    )
    .sort((a, b) => b.totalDebt - a.totalDebt);
  function openCredit(c?: Customer) {
    setSelected(c ?? null);
    setAmount('');
    setDescription('');
    setCreditDate(new Date());
    setCreditOpen(true);
  }
  async function saveCredit() {
    if (!selected || Number(amount) <= 0) return;
    await create.mutateAsync({
      customerId: selected.id,
      originalAmount: Number(amount),
      description: description || undefined,
      creditDate: toDateOnly(creditDate),
    });
    setCreditOpen(false);
  }
  function openPayment(c: Customer) {
    const credit = (credits.data ?? []).find(
      (x) => x.customerId === c.id && x.status === 'PENDING'
    );
    if (!credit) return;
    setSelected(c);
    setSelectedCredit(credit);
    setAmount(String(credit.remainingAmount));
    setPaymentDate(new Date());
    setPaymentOpen(true);
  }
  async function savePayment() {
    if (!selectedCredit || Number(amount) <= 0) return;
    await pay.mutateAsync({
      creditId: selectedCredit.id,
      input: { amount: Number(amount), paymentDate: toDateOnly(paymentDate) },
    });
    setPaymentOpen(false);
  }
  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-10">
      <DashboardHeader
        eyebrow="Control de deudas"
        title="Fiados"
        subtitle="Mira quién te debe y registra sus pagos."
      />
      <Button onPress={() => openCredit()}>
        <Text>+ Nuevo fiado</Text>
      </Button>
      <View className="mt-4 flex-row gap-2">
        <Metric label="Me deben" value={money(summary.data?.totalDebt ?? 0)} />
        <Metric label="Con deuda" value={String(summary.data?.customersWithDebt ?? 0)} />
      </View>
      <Input
        className="mt-4"
        placeholder="Buscar cliente"
        value={search}
        onChangeText={setSearch}
      />
      <View className="mt-3 flex-row flex-wrap gap-2">
        {[
          ['all', 'Todos'],
          ['debt', 'Con deuda'],
          ['clear', 'Sin deuda'],
          ['old', 'Antiguas'],
        ].map(([v, l]) => (
          <Button
            key={v}
            size="sm"
            variant={filter === v ? 'default' : 'outline'}
            onPress={() => setFilter(v as typeof filter)}>
            <Text>{l}</Text>
          </Button>
        ))}
      </View>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Tus clientes</CardTitle>
          <CardDescription>Ordenados por cuánto deben.</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          {customers.isPending ? (
            <Text>Cargando fiados...</Text>
          ) : list.length ? (
            list.map((c) => (
              <View key={c.id} className="border-border flex-row items-center gap-3 border-b py-3">
                <View className="flex-1">
                  <Text className="font-semibold">{c.name}</Text>
                  <Text className="text-muted-foreground text-sm">
                    {c.activeCredits} fiado{c.activeCredits === 1 ? '' : 's'}
                  </Text>
                </View>
                <View className="items-end gap-2">
                  <Text className={c.totalDebt ? 'font-semibold' : 'text-muted-foreground'}>
                    {c.totalDebt ? money(c.totalDebt) : 'Al día'}
                  </Text>
                  {c.totalDebt ? (
                    <Button size="sm" onPress={() => openPayment(c)}>
                      <Text>Ver y abonar</Text>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onPress={() => openCredit(c)}>
                      <Text>Nuevo fiado</Text>
                    </Button>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text className="text-muted-foreground py-8 text-center">
              No encontramos clientes con ese filtro.
            </Text>
          )}
        </CardContent>
      </Card>
      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo fiado</DialogTitle>
          </DialogHeader>
          <View className="gap-4">
            <Label>Cliente</Label>
            <Select
              value={selected ? { value: selected.id, label: selected.name } : undefined}
              onValueChange={(option) => {
                const customer = (customers.data ?? []).find((item) => item.id === option?.value);
                setSelected(customer ?? null);
              }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {(customers.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id} label={c.name} />
                ))}
              </SelectContent>
            </Select>
            <Label>Fecha del fiado</Label>
            <DatePicker value={creditDate} onChange={setCreditDate} />
            <Label>Monto</Label>
            <Input value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />
            <Label>Descripción</Label>
            <Input value={description} onChangeText={setDescription} />
          </View>
          <DialogFooter>
            <Button onPress={() => void saveCredit()} disabled={!selected || Number(amount) <= 0}>
              <Text>Registrar fiado</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abonar {selected?.name}</DialogTitle>
          </DialogHeader>
          <Text className="text-muted-foreground">
            Saldo pendiente: {selectedCredit ? money(selectedCredit.remainingAmount) : ''}
          </Text>
          {selectedCredit ? (
            <Text className="text-muted-foreground text-xs">
              Fiado creado {formatDateTime(selectedCredit.createdAt)} · por {selectedCredit.userId}
            </Text>
          ) : null}
          <Label>Fecha del abono</Label>
          <DatePicker value={paymentDate} onChange={setPaymentDate} />
          <Label>Monto del abono</Label>
          <Input value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <DialogFooter>
            <Button onPress={() => void savePayment()} disabled={Number(amount) <= 0}>
              <Text>Registrar abono</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-lg">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
