"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search01Icon,
  UserAdd01Icon,
  Wallet01Icon,
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
import { useCreditSummary, useCustomers } from "@/lib/queries/fiados";
import type { Customer } from "@/lib/fiados-api";
import { CreateCreditDialog } from "./create-credit-dialog";
import { CustomerDetail } from "./customer-detail";

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function FiadosPage({ businessId }: { businessId: string }) {
  const customersQuery = useCustomers(businessId);
  const summaryQuery = useCreditSummary(businessId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "debt" | "clear" | "old">("all");
  const [sort, setSort] = useState<"debt" | "name">("debt");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [initialCustomer, setInitialCustomer] = useState<Customer | null>(null);
  const customers = useMemo(
    () => customersQuery.data ?? [],
    [customersQuery.data],
  );
  const filtered = useMemo(
    () =>
      customers
        .filter((customer) => {
          const matches = customer.name
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase());
          const matchesFilter =
            filter === "all" ||
            (filter === "debt" && customer.totalDebt > 0) ||
            (filter === "clear" && customer.totalDebt === 0) ||
            (filter === "old" && customer.oldDebt);
          return matches && matchesFilter;
        })
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : b.totalDebt - a.totalDebt,
        ),
    [customers, filter, search, sort],
  );
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleCustomers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  function newCredit(customer?: Customer) {
    setInitialCustomer(customer ?? null);
    setCreateOpen(true);
  }
  if (customersQuery.isLoading || summaryQuery.isLoading)
    return <OikentraLoader label="Cargando fiados" className="min-h-[60vh]" />;
  if (customersQuery.error || summaryQuery.error)
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-muted-foreground">No pudimos cargar tus fiados.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            void customersQuery.refetch();
            void summaryQuery.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  const summary = summaryQuery.data ?? {
    totalDebt: 0,
    customersWithDebt: 0,
    oldDebts: 0,
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium">Control de deudas</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Fiados</h1>
          <p className="mt-2 text-muted-foreground">
            Mira quién te debe y registra sus pagos en segundos.
          </p>
        </div>
        <Button onClick={() => newCredit()}>
          <HugeiconsIcon icon={Wallet01Icon} size={18} />
          Nuevo fiado
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Me deben"
          value={money(summary.totalDebt)}
          detail="saldo pendiente"
        />
        <Metric
          label="Clientes con deuda"
          value={String(summary.customersWithDebt)}
          detail="personas pendientes"
        />
        <Metric
          label="Deudas antiguas"
          value={String(summary.oldDebts)}
          detail="más de 15 días"
        />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Tus clientes</CardTitle>
              <CardDescription>Ordenados por cuánto deben.</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <HugeiconsIcon
                icon={Search01Icon}
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="pl-9"
                placeholder="Buscar cliente"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Todos"],
                ["debt", "Con deuda"],
                ["clear", "Sin deuda"],
                ["old", "Antiguas"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? "default" : "outline"}
                onClick={() => { setFilter(value); setPage(1); }}
              >
                {label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => { setSort(sort === "debt" ? "name" : "debt"); setPage(1); }}
            >
              {sort === "debt" ? "Ordenar por nombre" : "Ordenar por deuda"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!customers.length ? (
            <div className="py-12 text-center">
              <HugeiconsIcon
                icon={UserAdd01Icon}
                size={32}
                className="mx-auto text-muted-foreground"
              />
              <h3 className="mt-3 font-medium">Aún no tienes clientes</h3>
              <p className="mt-1 text-sm text-muted-foreground">
Crea primero un cliente desde la sección Clientes.
              </p>
              <Button className="mt-4" render={<Link href={`/dashboard/${businessId}/clientes`} />}>
                Ir a Clientes
              </Button>
            </div>
          ) : !filtered.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No encontramos clientes con ese filtro.
            </p>
          ) : (
            <div className="divide-y">
              {visibleCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <button
                      className="truncate text-left font-medium hover:underline"
                      onClick={() => {
                        setDetail(customer);
                        setDetailOpen(true);
                      }}
                    >
                      {customer.name}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone || "Sin teléfono"} ·{" "}
                      {customer.activeCredits} fiado
                      {customer.activeCredits === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <p
                        className={
                          customer.totalDebt
                            ? "font-semibold"
                            : "font-medium text-muted-foreground"
                        }
                      >
                        {customer.totalDebt
                          ? money(customer.totalDebt)
                          : "Al día"}
                      </p>
                      {customer.totalDebt ? (
                        <p className="text-xs text-muted-foreground">
                          pendiente
                        </p>
                      ) : null}
                    </div>
                    {customer.totalDebt > 0 ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setDetail(customer);
                          setDetailOpen(true);
                        }}
                      >
                        Ver y abonar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => newCredit(customer)}
                      >
                        Nuevo fiado
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length > pageSize ? <div className="mt-5 flex items-center justify-between border-t pt-4"><p className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button><Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</Button></div></div> : null}
            </div>
          )}
        </CardContent>
      </Card>
      <CreateCreditDialog
        key={`${createOpen}-${initialCustomer?.id ?? "new"}`}
        businessId={businessId}
        customers={customers}
        open={createOpen}
        initialCustomer={initialCustomer}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setInitialCustomer(null);
        }}
      />
      <CustomerDetail
        businessId={businessId}
        customer={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onNewCredit={() => {
          setDetailOpen(false);
          newCredit(detail ?? undefined);
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
