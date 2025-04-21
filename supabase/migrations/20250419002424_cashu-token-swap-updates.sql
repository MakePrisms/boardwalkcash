alter table "wallet"."cashu_token_swaps" drop constraint "cashu_token_swaps_pkey";

drop index if exists "wallet"."cashu_token_swaps_pkey";

alter table "wallet"."cashu_token_swaps" add column "failure_reason" text;

CREATE UNIQUE INDEX cashu_token_swaps_pkey ON wallet.cashu_token_swaps USING btree (token_hash, user_id);

alter table "wallet"."cashu_token_swaps" add constraint "cashu_token_swaps_pkey" PRIMARY KEY using index "cashu_token_swaps_pkey";


