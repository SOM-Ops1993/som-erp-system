-- Add quantity column to packing_material table
ALTER TABLE "packing_materials" ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 0;
