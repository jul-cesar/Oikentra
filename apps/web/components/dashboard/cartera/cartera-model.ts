import type { Credit, CreditSummary, Customer } from "../../../lib/fiados-api";
import type { Loan, LoanSummary } from "../../../lib/loans-api";

export type PortfolioType = "CREDIT" | "LOAN";
export type PortfolioStatus = "ACTIVE" | "OVERDUE" | "PAID" | "CANCELLED";

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
    new Date(credit.dueDate).getTime() < today.getTime()
    ? "OVERDUE"
    : "ACTIVE";
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
      remainingAmount: credit.remainingAmount,
      startDate: credit.creditDate,
      dueDate: credit.dueDate,
      status: creditStatus(credit, today),
      detailHref: `/fiados/${credit.customerId}`,
    })),
    ...loans.map((loan) => ({
      id: loan.id,
      type: "LOAN" as const,
      customerId: loan.customerId,
      customerName: nameFor(loan.customerId),
      originalAmount: loan.totalAmount,
      remainingAmount: loan.remainingAmount,
      startDate: loan.startDate,
      dueDate: loan.dueDate,
      status: loanStatus(loan),
      detailHref: `/prestamos/${loan.id}`,
      interestRate: loan.interestRate,
      installmentAmount: loan.installmentAmount,
      frequency: loan.frequency,
    })),
  ];
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
