"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search01Icon,
  CashierIcon,
  Tag01Icon,
  Money02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useCashMovements } from "@/lib/queries/cash-movements";
import type { CashMovement } from "@/lib/cash-movements-api";
import { CreateSaleDialog } from "./create-sale-dialog";
import { CreateExpenseDialog } from "./create-expense-dialog";
import { CancelMovementDialog } from "./cancel-movement-dialog";

type FilterType = "ALL" | "SALE" | "EXPENSE";

const PAGE_SIZE = 20;

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function VentasPage({ businessId }: { businessId: string }) {
  const movementsQuery = useCashMovements(businessId);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [page, setPage] = useState(1);
  const [createSaleOpen, setCreateSaleOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CashMovement | null>(null);

  const movements = useMemo(
    () => movementsQuery.data ?? [],
    [movementsQuery.data],
  );

  const filtered = useMemo(() => {
    setPage(1);
    return movements.filter((m) => {
      if (typeFilter !== "ALL" && m.type !== typeFilter) return false;
      if (!search) return true;
      const term = search.toLocaleLowerCase();
      return (
        m.category?.toLocaleLowerCase().includes(term) ||
        m.note?.toLocaleLowerCase().includes(term) ||
        money(m.amount).includes(term)
      );
    });
  }, [movements, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const totalSales = useMemo(
    () =>
      movements
        .filter((m) => m.type === "SALE" && m.status === "ACTIVE")
        .reduce((sum, m) => sum + m.amount, 0),
    [movements],
  );

  const totalExpenses = useMemo(
    () =>
      movements
        .filter((m) => m.type === "EXPENSE" && m.status === "ACTIVE")
        .reduce((sum, m) => sum + m.amount, 0),
    [movements],
  );

  if (movementsQuery.isLoading)
    return (
      <OikentraLoader
        label="Cargando movimientos"
        className="min-h-[60vh]"
      />
    );

  if (movementsQuery.error)
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-muted-foreground">
          No pudimos cargar tus movimientos.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void movementsQuery.refetch()}
        >
          Reintentar
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium">Control de caja</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Movimientos
            </h1>
            <p className="mt-2 text-muted-foreground">
              Registra ventas, gastos y consulta el movimiento de tu caja.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href={`/dashboard/${businessId}/ventas/categorias`} />}>
              <HugeiconsIcon icon={Tag01Icon} size={18} />
              Categorías
            </Button>
            <Button variant="outline" onClick={() => setCreateExpenseOpen(true)}>
              <HugeiconsIcon icon={Money02Icon} size={18} />
              Nuevo gasto
            </Button>
            <Button onClick={() => setCreateSaleOpen(true)}>
              <HugeiconsIcon icon={CashierIcon} size={18} />
              Nueva venta
            </Button>
          </div>
        </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Ventas totales"
          value={money(totalSales)}
          detail="ingresos registrados"
        />
        <Metric
          label="Gastos totales"
          value={money(totalExpenses)}
          detail="salidas registradas"
        />
        <Metric
          label="Movimientos"
          value={String(
            movements.filter((m) => m.status === "ACTIVE").length,
          )}
          detail="registros activos"
        />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Movimientos de caja</CardTitle>
              <CardDescription>
                Todos los ingresos y egresos de tu negocio.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border p-0.5">
                {([
                  ["ALL", "Todos"],
                  ["SALE", "Ventas"],
                  ["EXPENSE", "Gastos"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setTypeFilter(value)}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                      typeFilter === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-56">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-9"
                  placeholder="Buscar movimiento"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!movements.length ? (
            <div className="py-12 text-center">
              <HugeiconsIcon
                icon={CashierIcon}
                size={32}
                className="mx-auto text-muted-foreground"
              />
              <h3 className="mt-3 font-medium">
                Aún no hay movimientos
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Registra tu primer movimiento para empezar.
              </p>
              <Button
                className="mt-4"
                onClick={() => setCreateSaleOpen(true)}
              >
                Registrar movimiento
              </Button>
            </div>
          ) : !filtered.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No encontramos movimientos con esa búsqueda.
            </p>
          ) : (
            <>
              <div className="divide-y">
                {paginated.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            movement.type === "SALE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : movement.type === "EXPENSE"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {movement.type === "SALE"
                            ? "Venta"
                            : movement.type === "EXPENSE"
                              ? "Gasto"
                              : "Pago fiado"}
                        </span>
                        {movement.category ? (
                          <span className="text-sm text-muted-foreground">
                            {movement.category}
                          </span>
                        ) : null}
                      </div>
                      {movement.note ? (
                        <p className="mt-1 text-sm text-muted-foreground truncate max-w-md">
                          {movement.note}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(movement.businessDate)} ·{" "}
                        {formatTime(movement.occurredAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <p
                        className={`text-lg font-semibold ${
                          movement.type === "EXPENSE"
                            ? "text-red-600 dark:text-red-400"
                            : ""
                        }`}
                      >
                        {movement.type === "EXPENSE" ? "-" : "+"}
                        {money(movement.amount)}
                      </p>
                      {movement.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCancelTarget(movement)}
                        >
                          Anular
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Anulado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} resultado{filtered.length === 1 ? "" : "s"} · Página {safePage} de {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateSaleDialog
        businessId={businessId}
        open={createSaleOpen}
        onOpenChange={setCreateSaleOpen}
      />
      <CreateExpenseDialog
        businessId={businessId}
        open={createExpenseOpen}
        onOpenChange={setCreateExpenseOpen}
      />
      <CancelMovementDialog
        businessId={businessId}
        movement={cancelTarget}
        open={Boolean(cancelTarget)}
        onOpenChange={(value) => {
          if (!value) setCancelTarget(null);
        }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {detail}
      </CardContent>
    </Card>
  );
}
