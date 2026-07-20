import type { CreditStatus } from '../../db/schema'
import { AppError } from '../../http/errors'
import { creditRepository, type CreditRepository } from './credits.repository'
import { businessesService } from '../businesses/businesses.service'
import { customerRepository } from '../customers/customers.repository'
import {
  type CreditResponse,
  type CreditPaymentResponse,
  type CreateCreditInput,
  type CreateCreditPaymentInput,
  type CancelCreditInput,
  type CancelPaymentInput,
} from './types/credits.types'

function toPaymentResponse(payment: {
  id: string
  creditId: string
  cashMovementId: string
  amount: number
  paymentDate: string
  note: string | null
  status: string
  cancellationReason: string | null
  cancelledAt: Date | null
}): CreditPaymentResponse {
  return {
    id: payment.id,
    creditId: payment.creditId,
    cashMovementId: payment.cashMovementId,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    note: payment.note,
    status: payment.status,
    cancellationReason: payment.cancellationReason,
    cancelledAt: payment.cancelledAt?.toISOString() ?? null,
  }
}

export function createCreditsService(repository: CreditRepository = creditRepository) {
  return {
    async create(userId: string, businessId: string, input: CreateCreditInput) {
      await businessesService.get(userId, businessId)

      const customer = await customerRepository.findByIdAndBusiness(input.customerId, businessId)
      if (!customer) {
        throw new AppError('CUSTOMER_NOT_FOUND', 404, 'The customer was not found in this business.')
      }

      const now = new Date()
      const credit = await repository.createCredit({
        id: crypto.randomUUID(),
        userId,
        businessId,
        customerId: input.customerId,
        originalAmount: input.originalAmount,
        description: input.description ?? null,
        creditDate: input.creditDate,
        status: 'PENDING',
        version: 1,
        createdAt: now,
        updatedAt: now,
      })

      return toCreditResponse(credit, [], 0)
    },

    async list(
      userId: string,
      businessId: string,
      filters?: { customerId?: string; status?: CreditStatus; from?: string; to?: string; limit?: number; cursor?: string },
    ) {
      await businessesService.get(userId, businessId)

      const creditRecords = await repository.findCreditsByBusiness(businessId, filters)

      return Promise.all(
        creditRecords.map(async (credit) => {
          const payments = await repository.findPaymentsByCreditId(credit.id)
          const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
          return toCreditResponse(credit, payments, totalPaid)
        }),
      )
    },

    async getById(userId: string, creditId: string, businessId: string) {
      await businessesService.get(userId, businessId)

      const credit = await repository.findCreditById(creditId)
      if (!credit) {
        throw new AppError('CREDIT_NOT_FOUND', 404, 'The credit was not found.')
      }
      if (credit.businessId !== businessId) {
        throw new AppError('BUSINESS_ACCESS_DENIED', 403, 'The credit does not belong to this business.')
      }

      const payments = await repository.findPaymentsByCreditId(creditId)
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
      return toCreditResponse(credit, payments, totalPaid)
    },

    async createPayment(
      userId: string,
      businessId: string,
      creditId: string,
      input: CreateCreditPaymentInput,
    ) {
      await businessesService.get(userId, businessId)

      const credit = await repository.findCreditById(creditId)
      if (!credit) {
        throw new AppError('CREDIT_NOT_FOUND', 404, 'The credit was not found.')
      }
      if (credit.status !== 'PENDING') {
        throw new AppError('CREDIT_NOT_PENDING', 400, 'The credit is not pending.')
      }
      if (credit.businessId !== businessId) {
        throw new AppError('BUSINESS_ACCESS_DENIED', 403, 'The credit does not belong to this business.')
      }

      const currentPaid = await repository.getCreditTotalPaid(creditId)
      const remaining = credit.originalAmount - currentPaid

      if (input.amount > remaining) {
        throw new AppError('PAYMENT_EXCEEDS_BALANCE', 400, `The payment exceeds the remaining balance of ${remaining}.`)
      }

      const now = new Date()
      await repository.createPayment(
        {
          userId,
          businessId,
          creditId,
          customerId: credit.customerId,
          amount: input.amount,
          paymentDate: input.paymentDate,
          note: input.note ?? null,
          status: 'ACTIVE',
        },
        {
          id: crypto.randomUUID(),
          userId,
          businessId,
          type: 'CREDIT_PAYMENT',
          amount: input.amount,
          category: null,
          note: input.note ?? null,
          businessDate: input.paymentDate,
          occurredAt: now,
          status: 'ACTIVE',
          sourceType: 'CREDIT',
          sourceId: creditId,
          version: 1,
          createdAt: now,
          updatedAt: now,
        },
      )

      const totalPaid = await repository.getCreditTotalPaid(creditId)

      if (totalPaid >= credit.originalAmount) {
        await repository.updateCreditStatus(creditId, 'PAID', new Date())
      }

      const allPayments = await repository.findPaymentsByCreditId(creditId)
      return toCreditResponse(credit, allPayments, totalPaid)
    },

    async listPayments(userId: string, creditId: string, businessId: string) {
      await businessesService.get(userId, businessId)

      const credit = await repository.findCreditById(creditId)
      if (!credit) {
        throw new AppError('CREDIT_NOT_FOUND', 404, 'The credit was not found.')
      }
      if (credit.businessId !== businessId) {
        throw new AppError('BUSINESS_ACCESS_DENIED', 403, 'The credit does not belong to this business.')
      }

      const payments = await repository.findPaymentsByCreditId(creditId)
      return payments.map(toPaymentResponse)
    },

    async cancelPayment(
      userId: string,
      creditId: string,
      paymentId: string,
      businessId: string,
      input: CancelPaymentInput,
    ) {
      await businessesService.get(userId, businessId)

      const credit = await repository.findCreditById(creditId)
      if (!credit) {
        throw new AppError('CREDIT_NOT_FOUND', 404, 'The credit was not found.')
      }
      if (credit.businessId !== businessId) {
        throw new AppError('BUSINESS_ACCESS_DENIED', 403, 'The credit does not belong to this business.')
      }

      const payment = await repository.findPaymentByIdAndCredit(paymentId, creditId)
      if (!payment) {
        throw new AppError('PAYMENT_NOT_FOUND', 404, 'The payment was not found.')
      }
      if (payment.status !== 'ACTIVE') {
        throw new AppError('ALREADY_CANCELLED', 400, 'The payment is already cancelled.')
      }

      const { payment: cancelledPayment } = await repository.cancelPayment(paymentId, creditId, input.reason)

      const totalPaid = await repository.getCreditTotalPaid(creditId)

      // If the credit was PAID and now totalPaid < originalAmount, revert to PENDING
      if (credit.status === 'PAID' && totalPaid < credit.originalAmount) {
        await repository.updateCreditStatus(creditId, 'PENDING', new Date())
      }

      return toCreditResponse(credit, await repository.findPaymentsByCreditId(creditId), totalPaid)
    },

    async cancel(userId: string, creditId: string, businessId: string, input: CancelCreditInput) {
      await businessesService.get(userId, businessId)

      const credit = await repository.findCreditById(creditId)
      if (!credit) {
        throw new AppError('CREDIT_NOT_FOUND', 404, 'The credit was not found.')
      }
      if (credit.status !== 'PENDING') {
        throw new AppError('CREDIT_NOT_PENDING', 400, 'The credit cannot be cancelled.')
      }
      if (credit.businessId !== businessId) {
        throw new AppError('BUSINESS_ACCESS_DENIED', 403, 'The credit does not belong to this business.')
      }

      // Check if it has active payments
      const activePayments = await repository.findPaymentsByCreditId(creditId)
      if (activePayments.length > 0) {
        throw new AppError('CREDIT_HAS_ACTIVE_PAYMENTS', 400, 'The credit has active payments and cannot be cancelled.')
      }

      const cancelled = await repository.cancelCredit(creditId, input.reason)
      if (!cancelled) {
        throw new AppError('CANCEL_FAILED', 409, 'Could not cancel the credit.')
      }

      const payments = await repository.findPaymentsByCreditId(creditId)
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
      return toCreditResponse(cancelled, payments, totalPaid)
    },
  }
}

function toCreditResponse(
  credit: {
    id: string
    customerId: string
    originalAmount: number
    description: string | null
    creditDate: string
    status: string
    cancellationReason: string | null
    cancelledAt: Date | null
    paidAt: Date | null
    createdAt: Date
    updatedAt: Date
  },
  payments: {
    id: string
    creditId: string
    cashMovementId: string
    amount: number
    paymentDate: string
    note: string | null
    status: string
    cancellationReason: string | null
    cancelledAt: Date | null
  }[],
  totalPaid: number,
): CreditResponse {
  return {
    id: credit.id,
    customerId: credit.customerId,
    originalAmount: credit.originalAmount,
    paidAmount: totalPaid,
    remainingAmount: Math.max(0, credit.originalAmount - totalPaid),
    description: credit.description,
    creditDate: credit.creditDate,
    status: credit.status,
    cancellationReason: credit.cancellationReason,
    cancelledAt: credit.cancelledAt?.toISOString() ?? null,
    paidAt: credit.paidAt?.toISOString() ?? null,
    payments: payments.map(toPaymentResponse),
    createdAt: credit.createdAt.toISOString(),
    updatedAt: credit.updatedAt.toISOString(),
  }
}

export const creditsService = createCreditsService()
