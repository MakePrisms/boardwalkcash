ALTER TABLE "wallet"."cashu_receive_quotes" ADD COLUMN "locking_derivation_path" text;

-- Set the default value to an empty string to avoid breaking existing data
UPDATE "wallet"."cashu_receive_quotes" SET "locking_derivation_path" = '';

-- Make the column non-nullable
ALTER TABLE "wallet"."cashu_receive_quotes" ALTER COLUMN "locking_derivation_path" SET NOT NULL;
