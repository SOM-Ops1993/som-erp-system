-- AlterTable: add mfg_date and exp_date to sales_order_item
ALTER TABLE "sales_order_item" ADD COLUMN IF NOT EXISTS "mfg_date" TIMESTAMP(3);
ALTER TABLE "sales_order_item" ADD COLUMN IF NOT EXISTS "exp_date" TIMESTAMP(3);
