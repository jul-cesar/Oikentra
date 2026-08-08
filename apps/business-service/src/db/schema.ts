import {
	bigint,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// ─── Businesses ───────────────────────────────────────────────

export const businessTypes = ["STORE", "RESTAURANT", "OTHER"] as const;

export type BusinessType = (typeof businessTypes)[number];

export const businessStatuses = ["ACTIVE", "INACTIVE"] as const;

export type BusinessStatus = (typeof businessStatuses)[number];

export const businesses = pgTable(
	"businesses",
	{
		id: text("id").primaryKey(),
		ownerUserId: text("owner_user_id").notNull(),
		name: text("name").notNull(),
		businessType: text("business_type", { enum: businessTypes }),
		currencyCode: text("currency_code").notNull().default("COP"),
		timezone: text("timezone").notNull().default("America/Bogota"),
		status: text("status", { enum: businessStatuses })
			.notNull()
			.default("ACTIVE"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("businesses_owner_user_id_idx").on(table.ownerUserId),
		index("businesses_owner_user_id_status_idx").on(
			table.ownerUserId,
			table.status,
		),
	],
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;

// ─── Business members ────────────────────────────────────────

export const memberRoles = ["OWNER", "MANAGER", "OPERATOR"] as const;
export type MemberRole = (typeof memberRoles)[number];
export const memberStatuses = ["ACTIVE", "INVITED", "INACTIVE"] as const;
export type MemberStatus = (typeof memberStatuses)[number];

export const businessMembers = pgTable(
	"business_members",
	{
		id: text("id").primaryKey(),
		businessId: text("business_id").notNull(),
		userId: text("user_id").notNull(),
		role: text("role", { enum: memberRoles }).notNull().default("OPERATOR"),
		status: text("status", { enum: memberStatuses })
			.notNull()
			.default("ACTIVE"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		uniqueIndex("business_members_business_user_unique").on(
			table.businessId,
			table.userId,
		),
		index("business_members_user_status_idx").on(table.userId, table.status),
		index("business_members_business_status_idx").on(
			table.businessId,
			table.status,
		),
	],
);

export type BusinessMember = typeof businessMembers.$inferSelect;
export type NewBusinessMember = typeof businessMembers.$inferInsert;

export const invitationIdentifierTypes = ["EMAIL", "PHONE"] as const;
export type InvitationIdentifierType =
	(typeof invitationIdentifierTypes)[number];
export const invitationStatuses = [
	"PENDING",
	"ACCEPTED",
	"REVOKED",
	"EXPIRED",
] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

export const businessInvitations = pgTable(
	"business_invitations",
	{
		id: text("id").primaryKey(),
		businessId: text("business_id").notNull(),
		invitedByUserId: text("invited_by_user_id").notNull(),
		targetUserId: text("target_user_id"),
		identifier: text("identifier").notNull(),
		identifierType: text("identifier_type", {
			enum: invitationIdentifierTypes,
		}).notNull(),
		role: text("role", { enum: memberRoles }).notNull().default("OPERATOR"),
		status: text("status", { enum: invitationStatuses })
			.notNull()
			.default("PENDING"),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("business_invitations_business_status_idx").on(
			table.businessId,
			table.status,
		),
		index("business_invitations_identifier_status_idx").on(
			table.identifier,
			table.status,
		),
	],
);

export type BusinessInvitation = typeof businessInvitations.$inferSelect;
export type NewBusinessInvitation = typeof businessInvitations.$inferInsert;

// ─── Customers ───────────────────────────────────────────────

export const customerStatuses = ["ACTIVE", "INACTIVE"] as const;

export type CustomerStatus = (typeof customerStatuses)[number];

export const customers = pgTable(
	"customers",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		businessId: text("business_id").notNull(),
		name: text("name").notNull(),
		phone: text("phone"),
		notes: text("notes"),
		status: text("status", { enum: customerStatuses })
			.notNull()
			.default("ACTIVE"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("customers_business_id_idx").on(table.businessId),
		index("customers_business_id_name_idx").on(table.businessId, table.name),
		index("customers_business_id_status_idx").on(
			table.businessId,
			table.status,
		),
	],
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

// ─── Cash Movements ──────────────────────────────────────────

export const cashMovementTypes = [
	"SALE",
	"EXPENSE",
	"CREDIT_PAYMENT",
	"LOAN_DISBURSEMENT",
	"LOAN_PAYMENT",
] as const;

export type CashMovementType = (typeof cashMovementTypes)[number];

export const cashMovementStatuses = ["ACTIVE", "CANCELLED"] as const;

export type CashMovementStatus = (typeof cashMovementStatuses)[number];

export const cashMovements = pgTable(
	"cash_movements",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		businessId: text("business_id").notNull(),
		type: text("type", { enum: cashMovementTypes }).notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		category: text("category"),
		paymentMethod: text("payment_method"),
		note: text("note"),
		businessDate: date("business_date").notNull(),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		status: text("status", { enum: cashMovementStatuses })
			.notNull()
			.default("ACTIVE"),
		sourceType: text("source_type"),
		sourceId: text("source_id"),
		cancellationReason: text("cancellation_reason"),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("cash_movements_business_date_idx").on(
			table.businessId,
			table.businessDate,
		),
		index("cash_movements_business_type_date_idx").on(
			table.businessId,
			table.type,
			table.businessDate,
		),
		index("cash_movements_business_status_date_idx").on(
			table.businessId,
			table.status,
			table.businessDate,
		),
		index("cash_movements_source_type_source_id_idx").on(
			table.sourceType,
			table.sourceId,
		),
	],
);

export type CashMovement = typeof cashMovements.$inferSelect;
export type NewCashMovement = typeof cashMovements.$inferInsert;

// ─── Cash Movement Categories ────────────────────────────────

export const cashMovementCategoryStatuses = ["ACTIVE", "INACTIVE"] as const;

export type CashMovementCategoryStatus =
	(typeof cashMovementCategoryStatuses)[number];

export const cashMovementCategories = pgTable(
	"cash_movement_categories",
	{
		id: text("id").primaryKey(),
		businessId: text("business_id").notNull(),
		name: text("name").notNull(),
		status: text("status", { enum: cashMovementCategoryStatuses })
			.notNull()
			.default("ACTIVE"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("cash_movement_categories_business_id_idx").on(table.businessId),
		index("cash_movement_categories_business_status_idx").on(
			table.businessId,
			table.status,
		),
		uniqueIndex("cash_movement_categories_business_name_unique").on(
			table.businessId,
			table.name,
		),
	],
);

export type CashMovementCategory = typeof cashMovementCategories.$inferSelect;
export type NewCashMovementCategory =
	typeof cashMovementCategories.$inferInsert;

// ─── Business Payment Methods ────────────────────────────────

export const businessPaymentMethodStatuses = ["ACTIVE", "INACTIVE"] as const;

export type BusinessPaymentMethodStatus =
	(typeof businessPaymentMethodStatuses)[number];

export const businessPaymentMethods = pgTable(
	"business_payment_methods",
	{
		id: text("id").primaryKey(),
		businessId: text("business_id").notNull(),
		name: text("name").notNull(),
		status: text("status", { enum: businessPaymentMethodStatuses })
			.notNull()
			.default("ACTIVE"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("business_payment_methods_business_id_idx").on(table.businessId),
		index("business_payment_methods_business_status_idx").on(
			table.businessId,
			table.status,
		),
		uniqueIndex("business_payment_methods_business_name_unique").on(
			table.businessId,
			table.name,
		),
	],
);

export type BusinessPaymentMethod = typeof businessPaymentMethods.$inferSelect;
export type NewBusinessPaymentMethod =
	typeof businessPaymentMethods.$inferInsert;

// ─── Credits ─────────────────────────────────────────────────

export const creditStatuses = ["PENDING", "PAID", "CANCELLED"] as const;

export type CreditStatus = (typeof creditStatuses)[number];

export const credits = pgTable(
	"credits",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		businessId: text("business_id").notNull(),
		customerId: text("customer_id").notNull(),
		originalAmount: bigint("original_amount", { mode: "number" }).notNull(),
		description: text("description"),
		creditDate: date("credit_date").notNull(),
		status: text("status", { enum: creditStatuses })
			.notNull()
			.default("PENDING"),
		cancellationReason: text("cancellation_reason"),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("credits_business_id_status_idx").on(table.businessId, table.status),
		index("credits_customer_id_status_idx").on(table.customerId, table.status),
		index("credits_business_id_credit_date_idx").on(
			table.businessId,
			table.creditDate,
		),
	],
);

export type Credit = typeof credits.$inferSelect;
export type NewCredit = typeof credits.$inferInsert;

// ─── Credit Payments ─────────────────────────────────────────

export const paymentStatuses = ["ACTIVE", "CANCELLED"] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const creditPayments = pgTable(
	"credit_payments",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		businessId: text("business_id").notNull(),
		creditId: text("credit_id").notNull(),
		customerId: text("customer_id").notNull(),
		cashMovementId: text("cash_movement_id").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		paymentDate: date("payment_date").notNull(),
		note: text("note"),
		status: text("status", { enum: paymentStatuses })
			.notNull()
			.default("ACTIVE"),
		cancellationReason: text("cancellation_reason"),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		uniqueIndex("credit_payments_cash_movement_id_unique").on(
			table.cashMovementId,
		),
		index("credit_payments_credit_id_status_idx").on(
			table.creditId,
			table.status,
		),
		index("credit_payments_customer_id_date_idx").on(
			table.customerId,
			table.paymentDate,
		),
		index("credit_payments_business_id_date_idx").on(
			table.businessId,
			table.paymentDate,
		),
	],
);

export type CreditPayment = typeof creditPayments.$inferSelect;
export type NewCreditPayment = typeof creditPayments.$inferInsert;

// ─── Loans (Préstamos) ───────────────────────────────────────

export const loanStatuses = ["PENDING", "PAID", "CANCELLED"] as const;

export type LoanStatus = (typeof loanStatuses)[number];

export const loans = pgTable(
	"loans",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		businessId: text("business_id").notNull(),
		customerId: text("customer_id").notNull(),
		capitalAmount: bigint("capital_amount", { mode: "number" }).notNull(),
		interestAmount: bigint("interest_amount", { mode: "number" })
			.notNull()
			.default(0),
		totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
		termCount: integer("term_count").notNull().default(1),
		description: text("description"),
		loanDate: date("loan_date").notNull(),
		dueDate: date("due_date").notNull(),
		status: text("status", { enum: loanStatuses })
			.notNull()
			.default("PENDING"),
		cancellationReason: text("cancellation_reason"),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("loans_business_id_status_idx").on(table.businessId, table.status),
		index("loans_customer_id_status_idx").on(table.customerId, table.status),
		index("loans_business_id_loan_date_idx").on(
			table.businessId,
			table.loanDate,
		),
	],
);

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

// ─── Loan Installments (Cuotas de préstamo) ──────────────────

export const loanInstallments = pgTable(
	"loan_installments",
	{
		id: text("id").primaryKey(),
		loanId: text("loan_id").notNull(),
		number: integer("number").notNull(),
		dueDate: date("due_date").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("loan_installments_loan_id_idx").on(table.loanId),
	],
);

export type LoanInstallment = typeof loanInstallments.$inferSelect;
export type NewLoanInstallment = typeof loanInstallments.$inferInsert;

// ─── Loan Payments (Abonos de préstamo) ──────────────────────

export const loanPayments = pgTable(
	"loan_payments",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		businessId: text("business_id").notNull(),
		loanId: text("loan_id").notNull(),
		customerId: text("customer_id").notNull(),
		cashMovementId: text("cash_movement_id").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		paymentDate: date("payment_date").notNull(),
		note: text("note"),
		status: text("status", { enum: paymentStatuses })
			.notNull()
			.default("ACTIVE"),
		cancellationReason: text("cancellation_reason"),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		uniqueIndex("loan_payments_cash_movement_id_unique").on(
			table.cashMovementId,
		),
		index("loan_payments_loan_id_status_idx").on(table.loanId, table.status),
		index("loan_payments_customer_id_date_idx").on(
			table.customerId,
			table.paymentDate,
		),
		index("loan_payments_business_id_date_idx").on(
			table.businessId,
			table.paymentDate,
		),
	],
);

export type LoanPayment = typeof loanPayments.$inferSelect;
export type NewLoanPayment = typeof loanPayments.$inferInsert;
