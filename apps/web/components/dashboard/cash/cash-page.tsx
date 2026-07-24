"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon, Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CashMovement, CashMovementType } from "@/lib/cash-api";
import { useCancelCashMovement, useCashMovements, useCreateExpense, useCreateSale } from "@/lib/queries/cash";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
const formatDateTime = (value: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const typeLabel: Record<CashMovementType, string> = {
  SALE: "Venta",
  EXPENSE: "Gasto",
  CREDIT_PAYMENT: "Abono fiado",
};

type MovementKind = "SALE" | "EXPENSE";
type SortKey = "occurredAt-desc" | "occurredAt-asc" | "amount-desc" | "amount-asc";

export function CashPage({ businessId }: { businessId: string }) {
  const movements = useCashMovements(businessId);
  const createSale = useCreateSale(businessId);
  const createExpense = useCreateExpense(businessId);
  const cancel = useCancelCashMovement(businessId);
  const [kind, setKind] = React.useState<MovementKind>("SALE");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [category, setCategory] = React.useState("");
  const [note, setNote] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("occurredAt-desc");
  const [message, setMessage] = React.useState("");

  const rows = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = (movements.data ?? []).filter((movement) => {
      if (typeFilter !== "ALL" && movement.type !== typeFilter) return false;
      if (from && movement.businessDate < from) return false;
      if (to && movement.businessDate > to) return false;
      if (!normalized) return true;
      return [movement.note, movement.category, movement.userId, typeLabel[movement.type]].filter(Boolean).join(" ").toLowerCase().includes(normalized);
    });
    return filtered.sort((a, b) => {
      if (sort === "amount-asc") return a.amount - b.amount;
      if (sort === "amount-desc") return b.amount - a.amount;
      const diff = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      return sort === "occurredAt-asc" ? diff : -diff;
    });
  }, [movements.data, query, typeFilter, from, to, sort]);

  const totals = React.useMemo(() => rows.reduce((acc, movement) => {
    if (movement.type === "EXPENSE") acc.out += movement.amount;
    else acc.in += movement.amount;
    return acc;
  }, { in: 0, out: 0 }), [rows]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return setMessage("Ingresa un monto válido.");
    const occurredAt = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    try {
      if (kind === "SALE") {
        await createSale.mutateAsync({ amount: numericAmount, businessDate: date, occurredAt, ...(note.trim() ? { note: note.trim() } : {}) });
      } else {
        await createExpense.mutateAsync({ amount: numericAmount, businessDate: date, occurredAt, category: category.trim() || "Gasto", ...(note.trim() ? { note: note.trim() } : {}) });
      }
      setAmount(""); setNote(""); setCategory("");
      setMessage("Movimiento registrado.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No pudimos guardar el movimiento.");
    }
  }

  if (movements.isLoading) return <OikentraLoader label="Cargando movimientos" className="min-h-[60vh]" />;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-medium">Caja diaria</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Ventas y movimientos</h1><p className="mt-2 text-muted-foreground">Registra ventas, gastos y revisa el historial con filtros.</p></div>
    </div>

    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader><CardTitle>Registrar movimiento</CardTitle><CardDescription>La hora se guarda automáticamente.</CardDescription></CardHeader>
        <CardContent><form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2"><Label>Tipo</Label><Select value={kind} onValueChange={(value) => setKind(value as MovementKind)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SALE">Venta</SelectItem><SelectItem value="EXPENSE">Gasto</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Monto</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" step="1" inputMode="numeric" placeholder="0" /></div>
          <div className="space-y-2"><Label>Fecha</Label><DatePicker value={date} onChange={setDate} /></div>
          {kind === "EXPENSE" ? <div className="space-y-2"><Label>Categoría</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej. mercado, arriendo" /></div> : null}
          <div className="space-y-2"><Label>Nota (opcional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalle corto" /></div>
          {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={createSale.isPending || createExpense.isPending}>Guardar</Button>
        </form></CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3"><Summary label="Entró" value={money(totals.in)} tone="in" /><Summary label="Salió" value={money(totals.out)} tone="out" /><Summary label="Balance" value={money(totals.in - totals.out)} /></div>
        <Card>
          <CardHeader><CardTitle>Historial</CardTitle><CardDescription>{rows.length} movimiento{rows.length === 1 ? "" : "s"} encontrados.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_160px_180px]">
              <div className="relative"><HugeiconsIcon icon={Search01Icon} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nota, categoría o usuario" /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem><SelectItem value="SALE">Ventas</SelectItem><SelectItem value="EXPENSE">Gastos</SelectItem><SelectItem value="CREDIT_PAYMENT">Abonos</SelectItem></SelectContent></Select>
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="occurredAt-desc">Más recientes</SelectItem><SelectItem value="occurredAt-asc">Más antiguos</SelectItem><SelectItem value="amount-desc">Mayor monto</SelectItem><SelectItem value="amount-asc">Menor monto</SelectItem></SelectContent></Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><DatePicker value={from} onChange={setFrom} placeholder="Desde" /><DatePicker value={to} onChange={setTo} placeholder="Hasta" /></div>
            <div className="grid gap-3">
              {rows.length ? rows.map((movement) => <MovementCard key={movement.id} movement={movement} onCancel={() => { const reason = window.prompt("Motivo de anulación"); if (reason) void cancel.mutateAsync({ movementId: movement.id, reason }); }} />) : <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">No hay movimientos para estos filtros.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>;
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "in" | "out" }) {
  return <Card><CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className={tone === "in" ? "text-emerald-600" : tone === "out" ? "text-rose-600" : ""}>{value}</CardTitle></CardHeader></Card>;
}

function MovementCard({ movement, onCancel }: { movement: CashMovement; onCancel: () => void }) {
  const incoming = movement.type !== "EXPENSE";
  return <div className="rounded-xl border bg-card p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3"><div className={incoming ? "rounded-full bg-emerald-100 p-2 text-emerald-700" : "rounded-full bg-rose-100 p-2 text-rose-700"}><HugeiconsIcon icon={incoming ? ArrowDown01Icon : ArrowUp01Icon} size={18} /></div><div className="min-w-0"><p className="font-medium">{typeLabel[movement.type]}{movement.category ? ` · ${movement.category}` : ""}</p><p className="text-sm text-muted-foreground">{movement.note || "Sin nota"}</p><p className="mt-1 text-xs text-muted-foreground">Hecho por {movement.userId} · {formatDateTime(movement.occurredAt)} · creado {formatDateTime(movement.createdAt)}</p></div></div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><p className={incoming ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>{incoming ? "+" : "-"}{money(movement.amount)}</p>{movement.sourceType ? <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{movement.sourceType}</span> : <Button size="sm" variant="ghost" onClick={onCancel}><HugeiconsIcon icon={Cancel01Icon} size={14} />Anular</Button>}</div>
    </div>
  </div>;
}
