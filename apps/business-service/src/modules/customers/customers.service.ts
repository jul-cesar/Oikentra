import type { Customer, Credit, CreditPayment } from "../../db/schema";
import { AppError } from "../../http/errors";
import { businessesService } from "../businesses/businesses.service";
import { customerRepository, type CustomerRepository } from "./customers.repository";
import { creditRepository } from "../credits/credits.repository";
import type { CustomerResponse, CreateCustomerInput, UpdateCustomerInput, CustomerHistoryResponse } from "./types/customers.types";

function toCustomerResponse(customer: Customer): CustomerResponse {
  return {
    id: customer.id,
    businessId: customer.businessId,
    name: customer.name,
    phone: customer.phone,
    notes: customer.notes,
    status: customer.status,
    version: customer.version,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    deletedAt: customer.deletedAt?.toISOString() ?? null,
  };
}

async function calculateCustomerDebt(
  customerId: string,
  businessId: string,
): Promise<{ totalDebt: number; activeCredits: number }> {
  const pendingCredits = await creditRepository.getActiveCreditsByCustomer(customerId, businessId);
  let totalDebt = 0;
  for (const credit of pendingCredits) {
    const paid = await creditRepository.getCreditTotalPaid(credit.id);
    totalDebt += credit.originalAmount - paid;
  }
  return { totalDebt, activeCredits: pendingCredits.length };
}

export function createCustomersService(repository: CustomerRepository = customerRepository) {
  return {
    async create(userId: string, businessId: string, input: CreateCustomerInput) {
      await businessesService.get(userId, businessId);

      const now = new Date();
      const customer = await repository.create({
        id: crypto.randomUUID(),
        userId,
        businessId,
        name: input.name,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        status: "ACTIVE",
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      return toCustomerResponse(customer);
    },

    async list(userId: string, businessId: string) {
      await businessesService.get(userId, businessId);
      const records = await repository.findManyByBusiness(businessId);
      return records.map(toCustomerResponse);
    },

    async get(userId: string, customerId: string, businessId: string) {
      await businessesService.get(userId, businessId);

      const customer = await repository.findByIdAndBusiness(customerId, businessId);
      if (!customer) {
        throw new AppError("CUSTOMER_NOT_FOUND", 404, "The customer was not found.");
      }

      const { totalDebt, activeCredits } = await calculateCustomerDebt(customerId, businessId);

      return {
        ...toCustomerResponse(customer),
        totalDebt,
        activeCredits,
      };
    },

    async update(userId: string, customerId: string, businessId: string, input: UpdateCustomerInput) {
      await businessesService.get(userId, businessId);

      const customer = await repository.updateByIdAndBusiness(customerId, businessId, input);
      if (!customer) {
        throw new AppError("CUSTOMER_NOT_FOUND", 404, "The customer was not found.");
      }
      return toCustomerResponse(customer);
    },

    async getHistory(userId: string, customerId: string, businessId: string): Promise<CustomerHistoryResponse> {
      await businessesService.get(userId, businessId);

      const customer = await repository.findByIdAndBusiness(customerId, businessId);
      if (!customer) {
        throw new AppError("CUSTOMER_NOT_FOUND", 404, "The customer was not found.");
      }

      const allCredits = await creditRepository.findCreditsByBusiness(businessId, { customerId });
      let totalDebt = 0;
      let totalPaid = 0;
      const creditsData = [];

      for (const credit of allCredits) {
        const payments = await creditRepository.findPaymentsByCreditId(credit.id);
        const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
        const remaining = credit.originalAmount - paidAmount;
        if (credit.status === "PENDING") totalDebt += remaining;
        totalPaid += paidAmount;

        creditsData.push({
          id: credit.id,
          originalAmount: credit.originalAmount,
          paidAmount,
          remainingAmount: Math.max(0, remaining),
          description: credit.description,
          creditDate: credit.creditDate,
          status: credit.status,
          payments: payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            paymentDate: p.paymentDate,
            note: p.note,
            status: p.status,
          })),
        });
      }

      return {
        customerId,
        totalCredits: allCredits.length,
        totalDebt,
        totalPaid,
        credits: creditsData,
      };
    },

    async softDelete(userId: string, customerId: string, businessId: string) {
      await businessesService.get(userId, businessId);

      const customer = await repository.softDeleteByIdAndBusiness(customerId, businessId);
      if (!customer) {
        throw new AppError("CUSTOMER_NOT_FOUND", 404, "The customer was not found.");
      }
      return toCustomerResponse(customer);
    },
  };
}

export const customersService = createCustomersService();
