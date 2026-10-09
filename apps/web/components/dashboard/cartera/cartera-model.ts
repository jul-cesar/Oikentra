import type { Credit, CreditSummary, Customer } from "../../../lib/fiados-api";
import type { Loan, LoanSummary } from "../../../lib/loans-api";

export type PortfolioType = "CREDIT" | "LOAN";
export type PortfolioFilter = "ALL" | PortfolioType;
export type PortfolioStatus = "ACTIVE" | "OVERDUE" | "PAID" | "CANCELLED";

const DAY_MS = 86_400_000;
const OLD_CREDIT_DAYS = 15;

export type PortfolioItem = {
  id: string;
  type: PortfolioType;
  customerId: string;
  customerName: string;
  originalAmount: number;
  remainingAmount: number;
  startDate: string;
  dueDate: string | null;
  status: PortfolioStatus;
  old: boolean;
  detailHref: string;
  interestRate?: number;
  installmentAmount?: number;
  frequency?: Loan["frequency"];
};

export type PortfolioSummary = {
  totalDebt: number;
  creditDebt: number;
  loanDebt: number;
  creditCustomers: number;
  loanCustomers: number;
  oldCredits: number;
  overdueLoans: number;
};

function creditStatus(credit: Credit, today: Date): PortfolioStatus {
  if (credit.status === "PAID" || credit.status === "CANCELLED") {
    return credit.status;
  }
  return credit.dueDate &&
    credit.remainingAmount > 0 &&
    credit.dueDate < today.toISOString().slice(0, 10)
    ? "OVERDUE"
    : "ACTIVE";
}

function isOldCredit(credit: Credit, today: Date): boolean {
  // ponytail: mirrors the backend threshold; return this flag from the API if the rule becomes configurable.
  const age = Math.floor(
    (today.getTime() - new Date(`${credit.creditDate}T00:00:00Z`).getTime()) /
      DAY_MS,
  );
  return credit.status === "PENDING" && credit.remainingAmount > 0 && age > OLD_CREDIT_DAYS;
}

function loanStatus(loan: Loan): PortfolioStatus {
  if (loan.status === "PAID" || loan.status === "CANCELLED") {
    return loan.status;
  }
  return loan.status === "DEFAULT" ||
    loan.installments.some((installment) => installment.status === "OVERDUE")
    ? "OVERDUE"
    : "ACTIVE";
}

export function buildPortfolioItems(
  credits: Credit[],
  loans: Loan[],
  customers: Customer[],
  today: Date,
): PortfolioItem[] {
  const customerNames = new Map(customers.map(({ id, name }) => [id, name]));
  const nameFor = (customerId: string) =>
    customerNames.get(customerId) ?? "Cliente desconocido";

  return [
    ...credits.map((credit) => ({
      id: credit.id,
      type: "CREDIT" as const,
      customerId: credit.customerId,
      customerName: nameFor(credit.customerId),
      originalAmount: credit.originalAmount,
      remainingAmount: credit.status === "PENDING" ? credit.remainingAmount : 0,
      startDate: credit.creditDate,
      dueDate: credit.dueDate,
      status: creditStatus(credit, today),
      old: isOldCredit(credit, today),
      detailHref: `/fiados/${credit.customerId}`,
    })),
    ...loans.map((loan) => ({
      id: loan.id,
      type: "LOAN" as const,
      customerId: loan.customerId,
      customerName: nameFor(loan.customerId),
      originalAmount: loan.totalAmount,
      remainingAmount:
        loan.status === "PAID" || loan.status === "CANCELLED"
          ? 0
          : loan.remainingAmount,
      startDate: loan.startDate,
      dueDate: loan.dueDate,
      status: loanStatus(loan),
      old: false,
      detailHref: `/prestamos/${loan.id}`,
      interestRate: loan.interestRate,
      installmentAmount: loan.installmentAmount,
      frequency: loan.frequency,
    })),
  ];
}

export function portfolioFilterFromQuery(value: string | null): PortfolioFilter {
  if (value === "fiados") return "CREDIT";
  if (value === "prestamos") return "LOAN";
  return "ALL";
}

export function filterPortfolioItems(
  items: PortfolioItem[],
  filter: PortfolioFilter,
  search: string,
): PortfolioItem[] {
  const query = search.trim().toLocaleLowerCase();
  return items
    .filter(
      (item) =>
        (filter === "ALL" || item.type === filter) &&
        (!query || item.customerName.toLocaleLowerCase().includes(query)),
    )
    .sort((a, b) => b.remainingAmount - a.remainingAmount);
}

export function buildPortfolioSummary(
  creditSummary: CreditSummary,
  loanSummary: LoanSummary,
): PortfolioSummary {
  return {
    totalDebt: creditSummary.totalDebt + loanSummary.totalDebt,
    creditDebt: creditSummary.totalDebt,
    loanDebt: loanSummary.totalDebt,
    creditCustomers: creditSummary.customersWithDebt,
    loanCustomers: loanSummary.customersWithDebt,
    oldCredits: creditSummary.oldDebts,
    overdueLoans: loanSummary.overdueLoans,
  };
}
