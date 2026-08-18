-- The portfolio_movements ledger is the wallet isolated from operational cash.
ALTER TABLE "loans" ADD COLUMN "interest_rate" numeric(7, 4) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "frequency" text DEFAULT 'MONTHLY' NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "installment_amount" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_installments" ADD COLUMN "principal_amount" bigint;--> statement-breakpoint
ALTER TABLE "loan_installments" ADD COLUMN "interest_amount" bigint;--> statement-breakpoint
ALTER TABLE "loan_installments" ADD COLUMN "total_amount" bigint;--> statement-breakpoint
ALTER TABLE "loan_installments" ADD COLUMN "paid_amount" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_installments" ADD COLUMN "status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint

-- Legacy loans did not retain the principal/interest split. Preserve their balance
-- as principal so historical collections remain reconcilable after the refactor.
UPDATE "loan_installments"
SET "principal_amount" = "amount", "interest_amount" = 0, "total_amount" = "amount"
WHERE "principal_amount" IS NULL;--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "principal_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "interest_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "total_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_installments" DROP COLUMN "amount";--> statement-breakpoint

UPDATE "loans"
SET "installment_amount" = ROUND("total_amount"::numeric / GREATEST("term_count", 1))::bigint,
    "status" = 'ACTIVE'
WHERE "status" = 'PENDING';--> statement-breakpoint

CREATE UNIQUE INDEX "loan_installments_loan_id_number_unique"
ON "loan_installments" USING btree ("loan_id", "number");
