-- Make inhouse_product_name nullable on sales_order_item
-- Sales orders can now be created without an inhouse product mapped yet

ALTER TABLE "sales_order_item"
  ALTER COLUMN "inhouse_product_name" DROP NOT NULL;
