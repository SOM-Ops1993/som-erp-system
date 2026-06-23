-- CreateTable: customer_profile
CREATE TABLE IF NOT EXISTS "customer_profile" (
    "id"            TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "company"       TEXT NOT NULL DEFAULT '',
    "order_type"    TEXT NOT NULL DEFAULT 'DOMESTIC',
    "order_count"   INTEGER NOT NULL DEFAULT 1,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_profile_customer_name_key"
    ON "customer_profile"("customer_name");
