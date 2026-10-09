"use client";

import {
  ArrowRight01Icon,
  BankIcon,
  PlusSignIcon,
  Search01Icon,
  UserMultipleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { CreateCreditDialog } from "@/components/dashboard/fiados/create-credit-dialog";
import { CreateLoanDialog } from "@/components/dashboard/prestamos/create-loan-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useCreditSummary, useCredits, useCustomers } from "@/lib/queries/fiados";
import { useLoans, useLoanSummary } from "@/lib/queries/loans";
import { cn } from "@/lib/utils";

import {
  buildPortfolioItems,
  buildPortfolioSummary,
  filterPortfolioItems,
  portfolioFilterFromQuery,
  type PortfolioFilter,
  type PortfolioItem,
  type PortfolioStatus,
} from "./cartera-model";

const FILTERS: [PortfolioFilter, string][] = [
  ["ALL", "Todos"],
  ["CREDIT", "Fiados"],
  ["LOAN", "Préstamos"],
];

const STATUS: Record<PortfolioStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: "Activo",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  OVERDUE: {
    label: "Vencido",
    className: "bg-destructive/10 text-destructive",
  },
  PAID: {
    label: "Pagado",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  CANCELLED: {
    label: "Anulado",
    className: "bg-muted text-muted-foreground",
  },
};

const FREQUENCY = {
  DAILY: "diaria",
  WEEKLY: "semanal",
  BIWEEKLY: "quincenal",
  MONTHLY: "mensual",
} as const;

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function CarteraPage({ businessId }: { businessId: string }) {
  const customersQuery = useCustomers(businessId);
  const creditsQuery = useCredits(businessId);
  const creditSummaryQuery = useCreditSummary(businessId);
  const loansQuery = useLoans(businessId);
  const loanSummaryQuery = useLoanSummary(businessId);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [creditOpen, setCreditOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const filter = portfolioFilterFromQuery(searchParams.get("tipo"));

  const queries = [
    customersQuery,
    creditsQuery,
    creditSummaryQuery,
    loansQuery,
    loanSummaryQuery,
  ];

  if (queries.some((query) => query.isLoading)) {
    return <OikentraLoader label="Cargando cartera" className="min-h-[60vh]" />;
  }

  if (queries.some((query) => query.error)) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-muted-foreground">No pudimos cargar tu cartera.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            for (const query of queries) void query.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  const customers = customersQuery.data ?? [];
  const items = buildPortfolioItems(
    creditsQuery.data ?? [],
    loansQuery.data ?? [],
    customers,
    new Date(),
  );
  const filtered = filterPortfolioItems(items, filter, search);
  const summary = buildPortfolioSummary(
    creditSummaryQuery.data ?? { totalDebt: 0, customersWithDebt: 0, oldDebts: 0 },
    loanSummaryQuery.data ?? {
      totalDebt: 0,
      customersWithDebt: 0,
      overdueLoans: 0,
    },
  );

  function selectFilter(next: PortfolioFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "ALL") params.delete("tipo");
    else params.set("tipo", next === "CREDIT" ? "fiados" : "prestamos");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 py-5 sm:px-4 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Control de cartera</p>
          <h1 className="mt-1 text-balance text-3xl font-semibold tracking-tight">
            Cartera
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Fiados y préstamos pendientes de tus clientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setCreditOpen(true)}>
            <HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
            Nuevo fiado
          </Button>
          <Button className="rounded-xl" onClick={() => setLoanOpen(true)}>
            <HugeiconsIcon icon={PlusSignIcon} size={16} aria-hidden="true" />
            Nuevo préstamo
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Resumen de cartera">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground md:col-span-3">
          <div
            className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-primary-foreground/10 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2">
            <HugeiconsIcon icon={Wallet01Icon} size={16} aria-hidden="true" />
            <span className="text-sm font-medium opacity-90">Total por cobrar</span>
          </div>
          <p className="relative mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {money(summary.totalDebt)}
          </p>
        </div>
        <SummaryCard
          icon={Wallet01Icon}
          title="Fiados"
          amount={summary.creditDebt}
          rows={[
            ["Clientes con deuda", summary.creditCustomers],
            ["Deudas antiguas", summary.oldCredits],
          ]}
        />
        <SummaryCard
          icon={BankIcon}
          title="Préstamos"
          amount={summary.loanDebt}
          rows={[
            ["Clientes con deuda", summary.loanCustomers],
            ["Préstamos vencidos", summary.overdueLoans],
          ]}
        />
      </section>

      <section className="rounded-3xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold tracking-tight">Obligaciones</h2>
            <p className="text-sm text-muted-foreground">Ordenadas por mayor saldo pendiente.</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="rounded-xl pl-9"
              aria-label="Buscar por cliente"
              placeholder="Buscar cliente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-1 rounded-full bg-muted p-1 sm:w-fit">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => selectFilter(value)}
              className={cn(
                "flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                filter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {!items.length ? (
            <EmptyState onCredit={() => setCreditOpen(true)} onLoan={() => setLoanOpen(true)} />
          ) : !filtered.length ? (
            <div className="rounded-2xl border border-dashed py-14 text-center">
              <HugeiconsIcon
                icon={Search01Icon}
                size={28}
                className="mx-auto text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                No encontramos obligaciones con esa búsqueda o filtro.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((item) => (
                <PortfolioRow key={`${item.type}-${item.id}`} businessId={businessId} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      <CreateCreditDialog
        key={String(creditOpen)}
        businessId={businessId}
        customers={customers}
        open={creditOpen}
        onOpenChange={setCreditOpen}
      />
      <CreateLoanDialog
        key={String(loanOpen)}
        businessId={businessId}
        customers={customers}
        open={loanOpen}
        onOpenChange={setLoanOpen}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  amount,
  rows,
}: {
  icon: typeof Wallet01Icon;
  title: string;
  amount: number;
  rows: [string, number][];
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 md:col-span-1">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <HugeiconsIcon icon={icon} size={16} aria-hidden="true" />
        {title}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{money(amount)}</p>
      <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PortfolioRow({
  businessId,
  item,
}: {
  businessId: string;
  item: PortfolioItem;
}) {
  const status = STATUS[item.status];
  return (
    <Link
      href={`/dashboard/${businessId}${item.detailHref}`}
      className="group flex flex-col gap-4 rounded-2xl border border-border/60 p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 sm:flex-row sm:items-center"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20" aria-hidden="true">
        {initials(item.customerName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium group-hover:text-primary">{item.customerName}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {item.type === "CREDIT" ? "Fiado" : "Préstamo"}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", status.className)}>
            {status.label}
          </span>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {item.startDate} · {item.dueDate ? `vence ${item.dueDate}` : "sin vencimiento"}
        </span>
        {item.type === "LOAN" ? (
          <span className="mt-1 block text-xs text-muted-foreground">
            Interés {item.interestRate}% · cuota {money(item.installmentAmount ?? 0)} · {FREQUENCY[item.frequency ?? "MONTHLY"]}
          </span>
        ) : null}
      </span>
      <span className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="text-right">
          <span className="block text-lg font-semibold tabular-nums">{money(item.remainingAmount)}</span>
          <span className="block text-xs text-muted-foreground">de {money(item.originalAmount)}</span>
        </span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-muted-foreground" aria-hidden="true" />
      </span>
    </Link>
  );
}

function EmptyState({ onCredit, onLoan }: { onCredit: () => void; onLoan: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed py-14 text-center">
      <HugeiconsIcon icon={UserMultipleIcon} size={30} className="mx-auto text-muted-foreground" aria-hidden="true" />
      <h3 className="mt-3 font-medium">Aún no hay obligaciones</h3>
      <p className="mt-1 text-sm text-muted-foreground">Registra el primer fiado o préstamo.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={onCredit}>Nuevo fiado</Button>
        <Button onClick={onLoan}>Nuevo préstamo</Button>
      </div>
    </div>
  );
}
