import { DashboardHeader } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { useBusinessContext } from '@/app/(app)/dashboard/[businessId]/_layout';
import type { CashMovement, CashMovementType } from '@/lib/cash-api';
import { useCashMovements, useCreateExpense, useCreateSale } from '@/lib/queries/cash';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const formatDateTime = (value: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const typeLabel: Record<CashMovementType, string> = { SALE: 'Venta', EXPENSE: 'Gasto', CREDIT_PAYMENT: 'Abono fiado' };
const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

type Kind = 'SALE' | 'EXPENSE';
type SortKey = 'new' | 'old' | 'high' | 'low';

export default function VentasScreen() {
  const business = useBusinessContext();
  const movements = useCashMovements(business.id);
  const createSale = useCreateSale(business.id);
  const createExpense = useCreateExpense(business.id);
  const [kind, setKind] = React.useState<Kind>('SALE');
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(new Date());
  const [category, setCategory] = React.useState('');
  const [note, setNote] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('ALL');
  const [sort, setSort] = React.useState<SortKey>('new');
  const [message, setMessage] = React.useState('');

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(movements.data ?? [])].filter((m) => {
      if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
      if (!q) return true;
      return [m.note, m.category, m.userId, typeLabel[m.type]].filter(Boolean).join(' ').toLowerCase().includes(q);
    }).sort((a, b) => {
      if (sort === 'high') return b.amount - a.amount;
      if (sort === 'low') return a.amount - b.amount;
      const diff = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      return sort === 'old' ? diff : -diff;
    });
  }, [movements.data, query, typeFilter, sort]);

  async function save() {
    setMessage('');
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return setMessage('Ingresa un monto válido.');
    const occurredAt = new Date(`${toDateOnly(date)}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    try {
      if (kind === 'SALE') await createSale.mutateAsync({ amount: numericAmount, businessDate: toDateOnly(date), occurredAt, ...(note.trim() ? { note: note.trim() } : {}) });
      else await createExpense.mutateAsync({ amount: numericAmount, businessDate: toDateOnly(date), occurredAt, category: category.trim() || 'Gasto', ...(note.trim() ? { note: note.trim() } : {}) });
      setAmount(''); setNote(''); setCategory(''); setMessage('Movimiento registrado.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No pudimos guardar el movimiento.'); }
  }

  return <ScrollView className="flex-1" contentContainerClassName="pb-10">
    <DashboardHeader eyebrow="Control diario" title="Caja" subtitle="Registra ventas y gastos, y revisa todos tus movimientos." />
    <Card><CardHeader><CardTitle>Registrar movimiento</CardTitle><CardDescription>La hora se guarda automáticamente.</CardDescription></CardHeader><CardContent className="gap-4">
      <View className="gap-2"><Label>Tipo</Label><Select value={{ value: kind, label: kind === 'SALE' ? 'Venta' : 'Gasto' }} onValueChange={(option) => setKind(option?.value as Kind)}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="SALE" label="Venta" /><SelectItem value="EXPENSE" label="Gasto" /></SelectContent></Select></View>
      <View className="gap-2"><Label>Monto</Label><Input value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" /></View>
      <View className="gap-2"><Label>Fecha</Label><DatePicker value={date} onChange={setDate} /></View>
      {kind === 'EXPENSE' ? <View className="gap-2"><Label>Categoría</Label><Input value={category} onChangeText={setCategory} placeholder="Ej. mercado" /></View> : null}
      <View className="gap-2"><Label>Nota</Label><Input value={note} onChangeText={setNote} placeholder="Detalle corto" /></View>
      {message ? <Text variant="muted">{message}</Text> : null}
      <Button onPress={() => void save()}><Text>{kind === 'SALE' ? 'Registrar venta' : 'Registrar gasto'}</Text></Button>
    </CardContent></Card>

    <Card className="mt-4"><CardHeader><CardTitle>Movimientos</CardTitle><CardDescription>{rows.length} movimientos encontrados.</CardDescription></CardHeader><CardContent className="gap-3">
      <Input placeholder="Buscar nota, categoría o usuario" value={query} onChangeText={setQuery} />
      <View className="flex-col gap-3 sm:flex-row">
        <Select value={{ value: typeFilter, label: typeFilter === 'ALL' ? 'Todos' : typeLabel[typeFilter as CashMovementType] }} onValueChange={(option) => setTypeFilter(option?.value ?? 'ALL')}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="ALL" label="Todos" /><SelectItem value="SALE" label="Ventas" /><SelectItem value="EXPENSE" label="Gastos" /><SelectItem value="CREDIT_PAYMENT" label="Abonos" /></SelectContent></Select>
        <Select value={{ value: sort, label: sort === 'new' ? 'Más recientes' : sort === 'old' ? 'Más antiguos' : sort === 'high' ? 'Mayor monto' : 'Menor monto' }} onValueChange={(option) => setSort((option?.value ?? 'new') as SortKey)}><SelectTrigger><SelectValue placeholder="Orden" /></SelectTrigger><SelectContent><SelectItem value="new" label="Más recientes" /><SelectItem value="old" label="Más antiguos" /><SelectItem value="high" label="Mayor monto" /><SelectItem value="low" label="Menor monto" /></SelectContent></Select>
      </View>
      {movements.isPending ? <Text>Cargando movimientos...</Text> : rows.length ? rows.map((m) => <MovementCard key={m.id} movement={m} />) : <Text className="text-muted-foreground py-8 text-center">No hay movimientos para estos filtros.</Text>}
    </CardContent></Card>
  </ScrollView>;
}

function MovementCard({ movement }: { movement: CashMovement }) {
  const incoming = movement.type !== 'EXPENSE';
  return <View className="border-border rounded-xl border p-3"><View className="flex-row items-start justify-between gap-3"><View className="flex-1"><Text className="font-semibold">{typeLabel[movement.type]}{movement.category ? ` · ${movement.category}` : ''}</Text><Text className="text-muted-foreground text-sm">{movement.note || 'Sin nota'}</Text><Text className="text-muted-foreground mt-1 text-xs">Hecho por {movement.userId} · {formatDateTime(movement.occurredAt)}</Text></View><Text className={incoming ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{incoming ? '+' : '-'}{money(movement.amount)}</Text></View></View>;
}
