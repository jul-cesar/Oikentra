import assert from "node:assert/strict";
import test from "node:test";

import type { Credit, CreditSummary, Customer } from "../../../lib/fiados-api";
import type { Loan, LoanSummary } from "../../../lib/loans-api";
import {
  buildPortfolioItems,
  buildPortfolioSummary,
  filterPortfolioItems,
  portfolioFilterFromQuery,
} from "./cartera-model";

const customer: Customer = {
  id: "customer-1",
  businessId: "business-1",
  name: "Ana Pérez",
  phone: null,
  notes: null,
  status: "ACTIVE",
  totalDebt: 0,
  activeCredits: 0,
  oldDebt: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function credit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: "credit-1",
    userId: "user-1",
    customerId: customer.id,
    originalAmount: 100,
    paidAmount: 20,
    remainingAmount: 80,
    description: null,
    creditDate: "2026-01-01",
    dueDate: "2026-02-01",
    status: "PENDING",
    cancellationReason: null,
    cancelledAt: null,
    paidAt: null,
    payments: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "loan-1",
    userId: "user-1",
    customerId: customer.id,
    capitalAmount: 200,
    interestRate: 10,
    frequency: "MONTHLY",
    installmentAmount: 55,
    interestAmount: 20,
    totalAmount: 220,
    paidAmount: 55,
    remainingAmount: 165,
    termCount: 4,
    description: null,
    startDate: "2026-01-01",
    dueDate: "2026-05-01",
    status: "ACTIVE",
    cancellationReason: null,
    cancelledAt: null,
    paidAt: null,
    installments: [],
    payments: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const today = new Date("2026-03-01T00:00:00.000Z");

test("normalizes a pending credit as active before its due date", () => {
  const [item] = buildPortfolioItems(
    [credit({ dueDate: "2026-03-02" })],
    [],
    [customer],
    today,
  );

  assert.equal(item.status, "ACTIVE");
  assert.equal(item.customerName, "Ana Pérez");
});

test("normalizes a pending credit with an expired balance as overdue", () => {
  const [item] = buildPortfolioItems(
    [credit({ dueDate: "2026-02-28", remainingAmount: 1 })],
    [],
    [customer],
    today,
  );

  assert.equal(item.status, "OVERDUE");
});

test("normalizes defaulted loans and loans with overdue installments as overdue", () => {
  const defaulted = loan({ id: "loan-default", status: "DEFAULT" });
  const lateInstallment = loan({
    id: "loan-installment",
    installments: [
      {
        id: "installment-1",
        number: 1,
        dueDate: "2026-02-01",
        principalAmount: 50,
        interestAmount: 5,
        totalAmount: 55,
        paidAmount: 0,
        status: "OVERDUE",
      },
    ],
  });

  const items = buildPortfolioItems([], [defaulted, lateInstallment], [customer], today);

  assert.deepEqual(items.map((item) => item.status), ["OVERDUE", "OVERDUE"]);
});

test("preserves paid and cancelled states", () => {
  const items = buildPortfolioItems(
    [credit({ id: "credit-paid", status: "PAID" })],
    [loan({ id: "loan-cancelled", status: "CANCELLED" })],
    [customer],
    today,
  );

  assert.deepEqual(items.map((item) => item.status), ["PAID", "CANCELLED"]);
});

test("builds stable detail links for credits and loans", () => {
  const items = buildPortfolioItems([credit()], [loan()], [customer], today);

  assert.deepEqual(items.map((item) => item.detailHref), [
    "/fiados/customer-1",
    "/prestamos/loan-1",
  ]);
});

test("maps supported query values to portfolio filters", () => {
  assert.equal(portfolioFilterFromQuery("fiados"), "CREDIT");
  assert.equal(portfolioFilterFromQuery("prestamos"), "LOAN");
  assert.equal(portfolioFilterFromQuery("otro"), "ALL");
  assert.equal(portfolioFilterFromQuery(null), "ALL");
});

test("filters by type and customer name and orders by remaining balance", () => {
  const secondCustomer = { ...customer, id: "customer-2", name: "Beatriz" };
  const items = buildPortfolioItems(
    [credit({ remainingAmount: 80 })],
    [loan({ customerId: secondCustomer.id, remainingAmount: 165 })],
    [customer, secondCustomer],
    today,
  );

  assert.deepEqual(
    filterPortfolioItems(items, "ALL", "").map((item) => item.remainingAmount),
    [165, 80],
  );
  assert.deepEqual(
    filterPortfolioItems(items, "CREDIT", "ana").map((item) => item.type),
    ["CREDIT"],
  );
  assert.deepEqual(filterPortfolioItems(items, "LOAN", "ana"), []);
});

test("combines debt totals without combining customer counts", () => {
  const creditSummary: CreditSummary = {
    totalDebt: 80,
    customersWithDebt: 1,
    oldDebts: 2,
  };
  const loanSummary: LoanSummary = {
    totalDebt: 165,
    customersWithDebt: 1,
    overdueLoans: 3,
  };

  assert.deepEqual(buildPortfolioSummary(creditSummary, loanSummary), {
    totalDebt: 245,
    creditDebt: 80,
    loanDebt: 165,
    creditCustomers: 1,
    loanCustomers: 1,
    oldCredits: 2,
    overdueLoans: 3,
  });
});
