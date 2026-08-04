import type { BusinessPaymentMethod } from "../../db/schema";
import { AppError } from "../../http/errors";
import { membersService, permissions } from "./members.service";
import {
	DEFAULT_PAYMENT_METHODS,
	paymentMethodRepository,
	type PaymentMethodRepository,
} from "./payment-methods.repository";

export type PaymentMethodResponse = {
	id: string;
	businessId: string;
	name: string;
	status: string;
	createdAt: string;
	updatedAt: string;
};

function toPaymentMethodResponse(
	method: BusinessPaymentMethod,
): PaymentMethodResponse {
	return {
		id: method.id,
		businessId: method.businessId,
		name: method.name,
		status: method.status,
		createdAt: method.createdAt.toISOString(),
		updatedAt: method.updatedAt.toISOString(),
	};
}

export function createPaymentMethodsService(
	repository: PaymentMethodRepository = paymentMethodRepository,
) {
	return {
		async ensureDefaults(businessId: string) {
			const existing = await repository.findManyByBusiness(businessId);
			if (existing.length) return existing;

			const now = new Date();
			return repository.createMany(
				DEFAULT_PAYMENT_METHODS.map((name) => ({
					id: crypto.randomUUID(),
					businessId,
					name,
					status: "ACTIVE" as const,
					createdAt: now,
					updatedAt: now,
				})),
			);
		},

		async validateActiveMethod(businessId: string, name?: string | null) {
			if (!name) return null;
			await this.ensureDefaults(businessId);
			const method = await repository.findActiveByName(businessId, name);
			if (!method) {
				throw new AppError(
					"PAYMENT_METHOD_NOT_FOUND",
					400,
					"The payment method is not active for this business.",
				);
			}
			return method.name;
		},

		async list(userId: string, businessId: string) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashRead,
			);
			const methods = await this.ensureDefaults(businessId);
			return methods.map(toPaymentMethodResponse);
		},

		async create(userId: string, businessId: string, input: { name: string }) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashCreate,
			);
			const now = new Date();
			const method = await repository.create({
				id: crypto.randomUUID(),
				businessId,
				name: input.name,
				status: "ACTIVE",
				createdAt: now,
				updatedAt: now,
			});
			return toPaymentMethodResponse(method);
		},

		async update(
			userId: string,
			businessId: string,
			paymentMethodId: string,
			input: { name: string },
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashCreate,
			);
			const method = await repository.updateByIdAndBusiness(
				paymentMethodId,
				businessId,
				{
					name: input.name,
					updatedAt: new Date(),
				},
			);
			if (!method)
				throw new AppError(
					"PAYMENT_METHOD_NOT_FOUND",
					404,
					"The payment method was not found.",
				);
			return toPaymentMethodResponse(method);
		},

		async deactivate(
			userId: string,
			businessId: string,
			paymentMethodId: string,
		) {
			await membersService.requirePermission(
				userId,
				businessId,
				permissions.cashCancel,
			);
			const method = await repository.deactivateByIdAndBusiness(
				paymentMethodId,
				businessId,
				new Date(),
			);
			if (!method)
				throw new AppError(
					"PAYMENT_METHOD_NOT_FOUND",
					404,
					"The payment method was not found.",
				);
			return toPaymentMethodResponse(method);
		},
	};
}

export const paymentMethodsService = createPaymentMethodsService();
