create table "wallet"."cashu_token_swaps" (
    "token_hash" text not null,
    "created_at" timestamp with time zone not null default now(),
    "token_proofs" text not null,
    "account_id" uuid not null,
    "user_id" uuid not null,
    "currency" text not null,
    "unit" text not null,
    "keyset_id" text not null,
    "keyset_counter" integer not null,
    "output_amounts" integer[] not null,
    "amount" numeric not null,
    "state" text not null default 'PENDING',
    "version" integer not null default 0
);

alter table "wallet"."cashu_token_swaps" enable row level security;

CREATE UNIQUE INDEX cashu_token_swaps_pkey ON wallet.cashu_token_swaps USING btree (token_hash);

alter table "wallet"."cashu_token_swaps" add constraint "cashu_token_swaps_pkey" PRIMARY KEY using index "cashu_token_swaps_pkey";

alter table "wallet"."cashu_token_swaps" add constraint "cashu_token_swaps_account_id_fkey" FOREIGN KEY (account_id) REFERENCES wallet.accounts(id) not valid;

alter table "wallet"."cashu_token_swaps" validate constraint "cashu_token_swaps_account_id_fkey";

alter table "wallet"."cashu_token_swaps" add constraint "cashu_token_swaps_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."cashu_token_swaps" validate constraint "cashu_token_swaps_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION wallet.create_cashu_token_swap(
  p_token_hash text,
  p_token_proofs text,
  p_account_id uuid,
  p_user_id uuid,
  p_currency text,
  p_unit text,
  p_keyset_id text,
  p_keyset_counter integer,
  p_output_amounts integer[],
  p_amount integer,
  p_account_version integer
) RETURNS wallet.cashu_token_swaps
 LANGUAGE plpgsql
AS $function$
declare
  v_token_swap wallet.cashu_token_swaps;
  v_updated_counter integer;
begin
  -- Calculate new counter
  v_updated_counter := p_keyset_counter + array_length(p_output_amounts, 1);

  -- Update the account with optimistic concurrency
  update wallet.accounts a
  set 
    details = jsonb_set(
      details, 
      array['keyset_counters', p_keyset_id], 
      to_jsonb(v_updated_counter), 
      true
    ),
    version = version + 1
  where a.id = p_account_id and a.version = p_account_version;

  if not found then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one', p_account_id, p_account_version;
  end if;

  insert into wallet.cashu_token_swaps (
    token_hash,
    token_proofs,
    account_id,
    user_id,
    currency,
    unit,
    keyset_id,
    keyset_counter,
    output_amounts,
    amount,
    state,
    version
  ) values (
    p_token_hash,
    p_token_proofs,
    p_account_id,
    p_user_id,
    p_currency,
    p_unit,
    p_keyset_id,
    p_keyset_counter,
    p_output_amounts,
    p_amount,
    'PENDING',
    0
  ) returning * into v_token_swap;

  return v_token_swap;
end;
$function$
;

CREATE OR REPLACE FUNCTION wallet.complete_cashu_token_swap(
  p_token_hash text,
  p_swap_version integer,
  p_proofs jsonb,
  p_account_version integer
) RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_token_swap wallet.cashu_token_swaps;
begin
  select * into v_token_swap
  from wallet.cashu_token_swaps
  where token_hash = p_token_hash
  for update;

  if v_token_swap is null then
    raise exception 'Token swap for token hash % not found', p_token_hash;
  end if;

  -- Update the account with optimistic concurrency
  update wallet.accounts
  set details = jsonb_set(details, '{proofs}', p_proofs, true),
      version = version + 1
  where id = v_token_swap.account_id and version = p_account_version;

  if not found then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one', v_token_swap.account_id, p_account_version;
  end if;

  -- Update the token swap to completed
  update wallet.cashu_token_swaps
  set state = 'COMPLETED',
      version = version + 1
  where token_hash = p_token_hash and version = p_swap_version;

  if not found then
    raise exception 'Concurrency error: Token swap % was modified by another transaction. Expected version %, but found different one', p_token_hash, p_swap_version;
  end if;

  return;
end;
$function$
;

grant delete on table "wallet"."cashu_token_swaps" to "anon";

grant insert on table "wallet"."cashu_token_swaps" to "anon";

grant references on table "wallet"."cashu_token_swaps" to "anon";

grant select on table "wallet"."cashu_token_swaps" to "anon";

grant trigger on table "wallet"."cashu_token_swaps" to "anon";

grant truncate on table "wallet"."cashu_token_swaps" to "anon";

grant update on table "wallet"."cashu_token_swaps" to "anon";

grant delete on table "wallet"."cashu_token_swaps" to "authenticated";

grant insert on table "wallet"."cashu_token_swaps" to "authenticated";

grant references on table "wallet"."cashu_token_swaps" to "authenticated";

grant select on table "wallet"."cashu_token_swaps" to "authenticated";

grant trigger on table "wallet"."cashu_token_swaps" to "authenticated";

grant truncate on table "wallet"."cashu_token_swaps" to "authenticated";

grant update on table "wallet"."cashu_token_swaps" to "authenticated";

grant delete on table "wallet"."cashu_token_swaps" to "service_role";

grant insert on table "wallet"."cashu_token_swaps" to "service_role";

grant references on table "wallet"."cashu_token_swaps" to "service_role";

grant select on table "wallet"."cashu_token_swaps" to "service_role";

grant trigger on table "wallet"."cashu_token_swaps" to "service_role";

grant truncate on table "wallet"."cashu_token_swaps" to "service_role";

grant update on table "wallet"."cashu_token_swaps" to "service_role";

create policy "Enable CRUD based on user_id"
on "wallet"."cashu_token_swaps"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));

alter publication supabase_realtime add table wallet.cashu_token_swaps;
