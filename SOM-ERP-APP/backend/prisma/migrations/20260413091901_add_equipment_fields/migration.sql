-- AlterTable: add workingVolume and operation to equipment_master
ALTER TABLE "equipment_master" ADD COLUMN IF NOT EXISTS "working_volume" DOUBLE PRECISION;
ALTER TABLE "equipment_master" ADD COLUMN IF NOT EXISTS "operation" TEXT NOT NULL DEFAULT '';
