ALTER TABLE "production_plan" ADD COLUMN IF NOT EXISTS "no_of_cycles"    INTEGER;
ALTER TABLE "production_plan" ADD COLUMN IF NOT EXISTS "cycle_batch_size" DOUBLE PRECISION;
