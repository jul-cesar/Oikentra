DROP INDEX "cash_movements_source_unique";--> statement-breakpoint
CREATE INDEX "cash_movements_source_type_source_id_idx" ON "cash_movements" USING btree ("source_type","source_id");