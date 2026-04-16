-- CreateTable
CREATE TABLE "rm_master" (
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_master_pkey" PRIMARY KEY ("item_code")
);

-- CreateTable
CREATE TABLE "product_master" (
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "plant" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_master_pkey" PRIMARY KEY ("product_code")
);

-- CreateTable
CREATE TABLE "equipment_master" (
    "equip_id" TEXT NOT NULL,
    "equip_name" TEXT NOT NULL,
    "plant" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_master_pkey" PRIMARY KEY ("equip_id")
);

-- CreateTable
CREATE TABLE "lot_sequence" (
    "item_code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lot_sequence_pkey" PRIMARY KEY ("item_code","year")
);

-- CreateTable
CREATE TABLE "print_master" (
    "pack_id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "bag_no" INTEGER NOT NULL,
    "pack_qty" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL,
    "supplier" TEXT,
    "invoice_no" TEXT,
    "received_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'AWAITING_INWARD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_master_pkey" PRIMARY KEY ("pack_id")
);

-- CreateTable
CREATE TABLE "inward_session" (
    "session_id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL,
    "expected_bags" INTEGER NOT NULL,
    "scanned_pack_ids" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inward_session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "inward" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "bag_no" INTEGER NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "inward_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouse" TEXT NOT NULL,

    CONSTRAINT "inward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_balance" (
    "pack_id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "total_qty" DOUBLE PRECISION NOT NULL,
    "remaining_qty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pack_balance_pkey" PRIMARY KEY ("pack_id")
);

-- CreateTable
CREATE TABLE "container_master" (
    "container_id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "current_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uom" TEXT NOT NULL,

    CONSTRAINT "container_master_pkey" PRIMARY KEY ("container_id")
);

-- CreateTable
CREATE TABLE "recipe_db" (
    "id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "rm_code" TEXT NOT NULL,
    "rm_name" TEXT NOT NULL,
    "qty_per_unit" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL,

    CONSTRAINT "recipe_db_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indent_master" (
    "indent_id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "batch_size" DOUBLE PRECISION NOT NULL,
    "batch_no" TEXT NOT NULL,
    "di_no" TEXT NOT NULL,
    "plant" TEXT NOT NULL DEFAULT '',
    "equipment" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indent_master_pkey" PRIMARY KEY ("indent_id")
);

-- CreateTable
CREATE TABLE "indent_details" (
    "id" TEXT NOT NULL,
    "indent_id" TEXT NOT NULL,
    "rm_code" TEXT NOT NULL,
    "rm_name" TEXT NOT NULL,
    "required_qty" DOUBLE PRECISION NOT NULL,
    "issued_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_qty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "indent_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outward" (
    "id" TEXT NOT NULL,
    "indent_id" TEXT,
    "source_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "rm_code" TEXT NOT NULL,
    "qty_issued" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ledger" (
    "id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "in_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "out_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rm_master_item_name_key" ON "rm_master"("item_name");

-- CreateIndex
CREATE UNIQUE INDEX "product_master_product_name_key" ON "product_master"("product_name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_master_equip_name_key" ON "equipment_master"("equip_name");

-- CreateIndex
CREATE UNIQUE INDEX "print_master_item_code_lot_no_bag_no_key" ON "print_master"("item_code", "lot_no", "bag_no");

-- CreateIndex
CREATE UNIQUE INDEX "container_master_item_code_key" ON "container_master"("item_code");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_db_product_code_rm_code_key" ON "recipe_db"("product_code", "rm_code");

-- AddForeignKey
ALTER TABLE "indent_details" ADD CONSTRAINT "indent_details_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "indent_master"("indent_id") ON DELETE RESTRICT ON UPDATE CASCADE;
