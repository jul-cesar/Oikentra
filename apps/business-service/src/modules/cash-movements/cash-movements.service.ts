import { AppError } from "../../http/errors";
import {
	cashMovementRepository,
	type CashMovementRepository,
} from "./cash-movements.repository";
import { membersService, permissions } from "../businesses/members.service";
import type {
	CashMovementResponse,
	CreateCashMovementInput,
	CancelCashMovementInput,
	CashMovementRecord,
} from "./types/cash-movements.types";
import { paymentMethodsService } from "../businesses/payment-methods.service";

function toCashMovementResponse(
	movement: CashMovementRecord,
): CashMovementResponse {
	return {
		id: movement.id,
		userId: movement.userId,
		businessId: movement.businessId,
		type: movement.type,
		amount: movement.amount,
		category: movement.category,
		paymentMethod: movement.paymentMethod,
		note: movement.note,
		businessDate: movement.businessDate,
		occurredAt: movement.occurredAt.toISOString(),
		status: movement.status,
		sourceType: movement.sourceType,
		sourceId: movement.sourceId,
		sourceCustomer: movement.sourceCustomer ?? null,
		cancellationReason: movement.cancellationReason,
		cancelledAt: movement.cancelledAt?.toISOString() ?? null,
		version: movement.version,
		createdAt: movement.createdAt.toISOString(),
		updatedAt: movement.updatedAt.toISOString(),
	};
}

export function createCashMovementsService(
	repository: CashMovementRepository = cashMovementRepository,
) {
	async function existingMovement(
		userId: string,
		businessId: string,
		id: string | undefined,
		type: "SALE" | "EXPENSE",
	) {
		if (!id) return null;

		const movement = await repository.findByIdAndBusiness(id, businessId);
		if (!movement) return null;
		if (movement.userId !== userId || movement.type !== type) {
			throw new AppError(
				"IDEMPOTENCY_KEY_REUSED",
				409,
				"The movement id is already in use.",
			);
		}
		return toCashMovementResponse(movement);
	}

	return {
		async createSale(
			userId: string,
			businessId: string,
			input: CreateCashMovementInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashCreate,
			);

			const previous = await existingMovement(
				userId,
				businessId,
				input.id,
				"SALE",
			);
			if (previous) return previous;

			const paymentMethod = await paymentMethodsService.validateActiveMethod(
				businessId,
				input.paymentMethod,
			);
			const now = new Date();
			const movement = await repository.create({
				id: input.id ?? crypto.randomUUID(),
				userId,
				businessId,
				type: "SALE",
				amount: input.amount,
				category: input.category ?? null,
				paymentMethod,
				note: input.note ?? null,
				businessDate: input.businessDate,
				occurredAt: new Date(input.occurredAt),
				status: "ACTIVE",
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			return toCashMovementResponse(movement);
		},

		async createExpense(
			userId: string,
			businessId: string,
			input: CreateCashMovementInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashCreate,
			);

			const previous = await existingMovement(
				userId,
				businessId,
				input.id,
				"EXPENSE",
			);
			if (previous) return previous;

			const now = new Date();
			const movement = await repository.create({
				id: input.id ?? crypto.randomUUID(),
				userId,
				businessId,
				type: "EXPENSE",
				amount: input.amount,
				category: input.category ?? null,
				paymentMethod: null,
				note: input.note ?? null,
				businessDate: input.businessDate,
				occurredAt: new Date(input.occurredAt),
				status: "ACTIVE",
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			return toCashMovementResponse(movement);
		},

		async list(userId: string, businessId: string) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashRead,
			);

			const records = await repository.findManyByBusiness(businessId);
			return records.map(toCashMovementResponse);
		},

		async cancel(
			userId: string,
			movementId: string,
			businessId: string,
			input: CancelCashMovementInput,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashCancel,
			);

			const movement = await repository.cancelByIdAndBusiness(
				movementId,
				businessId,
				input,
			);

			if (!movement) {
				throw new AppError(
					"MOVEMENT_NOT_FOUND",
					404,
					"The cash movement was not found.",
				);
			}

			return toCashMovementResponse(movement);
		},
	};
}

export const cashMovementsService = createCashMovementsService();
