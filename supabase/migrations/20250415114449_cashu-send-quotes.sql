create table "wallet"."cashu_send_quotes" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone not null,
    "user_id" uuid not null,
    "account_id" uuid not null,
    "currency" text not null,
    "unit" text not null,
    "payment_request" text not null,
    "amount_requested" numeric not null,
    "currency_requested" text not null,
    "amount_requested_in_msat" bigint not null,
    "amount_to_send" numeric not null,
    "fee_reserve" numeric not null,
    "quote_id" text not null,
    "proofs" text not null,
    "keyset_id" text not null,
    "keyset_counter" integer not null,
    "number_of_change_outputs" integer not null,
    "state" text not null default 'UNPAID',
    "payment_preimage" text,
    "amount_spent" numeric,
    "failure_reason" text,
    "version" integer not null default 0
);


alter table "wallet"."cashu_send_quotes" enable row level security;

CREATE UNIQUE INDEX cashu_send_quotes_pkey ON wallet.cashu_send_quotes USING btree (id);

alter table "wallet"."cashu_send_quotes" add constraint "cashu_send_quotes_pkey" PRIMARY KEY using index "cashu_send_quotes_pkey";

alter table "wallet"."cashu_send_quotes" add constraint "cashu_send_quotes_account_id_fkey" FOREIGN KEY (account_id) REFERENCES wallet.accounts(id) not valid;

alter table "wallet"."cashu_send_quotes" validate constraint "cashu_send_quotes_account_id_fkey";

alter table "wallet"."cashu_send_quotes" add constraint "cashu_send_quotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."cashu_send_quotes" validate constraint "cashu_send_quotes_user_id_fkey";

grant delete on table "wallet"."cashu_send_quotes" to "anon";

grant insert on table "wallet"."cashu_send_quotes" to "anon";

grant references on table "wallet"."cashu_send_quotes" to "anon";

grant select on table "wallet"."cashu_send_quotes" to "anon";

grant trigger on table "wallet"."cashu_send_quotes" to "anon";

grant truncate on table "wallet"."cashu_send_quotes" to "anon";

grant update on table "wallet"."cashu_send_quotes" to "anon";

grant delete on table "wallet"."cashu_send_quotes" to "authenticated";

grant insert on table "wallet"."cashu_send_quotes" to "authenticated";

grant references on table "wallet"."cashu_send_quotes" to "authenticated";

grant select on table "wallet"."cashu_send_quotes" to "authenticated";

grant trigger on table "wallet"."cashu_send_quotes" to "authenticated";

grant truncate on table "wallet"."cashu_send_quotes" to "authenticated";

grant update on table "wallet"."cashu_send_quotes" to "authenticated";

grant delete on table "wallet"."cashu_send_quotes" to "service_role";

grant insert on table "wallet"."cashu_send_quotes" to "service_role";

grant references on table "wallet"."cashu_send_quotes" to "service_role";

grant select on table "wallet"."cashu_send_quotes" to "service_role";

grant trigger on table "wallet"."cashu_send_quotes" to "service_role";

grant truncate on table "wallet"."cashu_send_quotes" to "service_role";

grant update on table "wallet"."cashu_send_quotes" to "service_role";

alter publication supabase_realtime add table wallet.cashu_send_quotes;

create type wallet.create_cashu_send_quote_result as (
  created_quote wallet.cashu_send_quotes,
  updated_account wallet.accounts
);

create or replace function wallet.create_cashu_send_quote(
  p_user_id uuid,
  p_account_id uuid,
  p_currency text,
  p_unit text,
  p_payment_request text,
  p_expires_at timestamptz,
  p_amount_requested numeric,
  p_currency_requested text,
  p_amount_requested_in_msat bigint,
  p_amount_to_send numeric,
  p_fee_reserve numeric,
  p_quote_id text,
  p_keyset_id text,
  p_keyset_counter integer,
  p_number_of_change_outputs integer,
  p_proofs_to_send text,
  p_account_version integer,
  p_proofs_to_keep text
) returns wallet.create_cashu_send_quote_result
language plpgsql
as $$
declare
  v_created_quote wallet.cashu_send_quotes;
  v_updated_account wallet.accounts;
  v_updated_counter integer;
begin
  -- Calculate new counter value
  v_updated_counter := p_keyset_counter + p_number_of_change_outputs;

  -- Insert the new cashu send quote
  insert into wallet.cashu_send_quotes (
    user_id,
    account_id,
    currency,
    unit,
    payment_request,
    expires_at,
    amount_requested,
    currency_requested,
    amount_requested_in_msat,
    amount_to_send,
    fee_reserve,
    quote_id,
    proofs,
    keyset_id,
    keyset_counter,
    number_of_change_outputs
  ) values (
    p_user_id,
    p_account_id,
    p_currency,
    p_unit,
    p_payment_request,
    p_expires_at,
    p_amount_requested,
    p_currency_requested,
    p_amount_requested_in_msat,
    p_amount_to_send,
    p_fee_reserve,
    p_quote_id,
    p_proofs_to_send,
    p_keyset_id,
    p_keyset_counter,
    p_number_of_change_outputs
  )
  returning * into v_created_quote;

  -- Update the account with optimistic concurrency check
  update wallet.accounts
  set details = jsonb_set(
        jsonb_set(details, '{proofs}', to_jsonb(p_proofs_to_keep)),
        array['keyset_counters', p_keyset_id],
        to_jsonb(v_updated_counter),
        true
      ),
      version = version + 1
  where id = v_created_quote.account_id and version = p_account_version
  returning * into v_updated_account;

  -- Check if account was updated
  if v_updated_account is null then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_created_quote.account_id, p_account_version;
  end if;

  return (v_created_quote, v_updated_account);
end;
$$;

create type wallet.update_cashu_send_quote_result as (
  updated_quote wallet.cashu_send_quotes,
  updated_account wallet.accounts
);

create or replace function wallet.complete_cashu_send_quote(
  p_quote_id uuid,
  p_quote_version integer,
  p_payment_preimage text,
  p_amount_spent numeric,
  p_account_proofs text,
  p_account_version integer
) returns wallet.update_cashu_send_quote_result
language plpgsql
as $$
declare
  v_updated_quote wallet.cashu_send_quotes;
  v_updated_account wallet.accounts;
  v_quote wallet.cashu_send_quotes;
  v_quote_exists boolean;
begin
  -- Get the quote and check if it exists and its state
  select * into v_quote
  from wallet.cashu_send_quotes
  where id = p_quote_id;

  if v_quote is null then
    raise exception 'Cashu send quote with id % not found', p_quote_id;
  end if;

  if v_quote.state not in ('UNPAID', 'PENDING') then
    raise exception 'Cannot complete cashu send quote with id %. Current state is %, but must be UNPAID or PENDING', p_quote_id, v_quote.state;
  end if;

  -- Update the quote with optimistic concurrency check
  update wallet.cashu_send_quotes
  set state = 'PAID',
      payment_preimage = p_payment_preimage,
      amount_spent = p_amount_spent,
      version = version + 1
  where id = p_quote_id and version = p_quote_version
  returning * into v_updated_quote;

  -- Check if quote was updated
  if v_updated_quote is null then
    raise exception 'Concurrency error: Cashu send quote % was modified by another transaction. Expected version %, but found different one.', p_quote_id, p_quote_version;
  end if;

  -- Update the account with optimistic concurrency check
  update wallet.accounts
  set details = jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
      version = version + 1
  where id = v_quote.account_id and version = p_account_version
  returning * into v_updated_account;

  -- Check if account was updated
  if v_updated_account is null then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, p_account_version;
  end if;

  return (v_updated_quote, v_updated_account);
end;
$$;

create or replace function wallet.expire_cashu_send_quote(
  p_quote_id uuid,
  p_quote_version integer,
  p_account_proofs text,
  p_account_version integer
) returns wallet.update_cashu_send_quote_result
language plpgsql
as $$
declare
  v_quote wallet.cashu_send_quotes;
  v_updated_quote wallet.cashu_send_quotes;
  v_updated_account wallet.accounts;
begin
  select * into v_quote
  from wallet.cashu_send_quotes
  where id = p_quote_id;

  if v_quote is null then
    raise exception 'Cashu send quote with id % not found', p_quote_id;
  end if;

  if v_quote.state != 'UNPAID' then
    raise exception 'Cannot expire cashu send quote with id %. Current state is %, but must be UNPAID', p_quote_id, v_quote.state;
  end if;

  if v_quote.expires_at > now() then
    raise exception 'Cannot expire cashu send quote with id % that has not expired yet', p_quote_id;
  end if;

  update wallet.cashu_send_quotes
  set state = 'EXPIRED',
      version = version + 1
  where id = p_quote_id and version = p_quote_version
  returning * into v_updated_quote;

  if v_updated_quote is null then
    raise exception 'Concurrency error: Cashu send quote % was modified by another transaction. Expected version %, but found different one.', p_quote_id, p_quote_version;
  end if;

  update wallet.accounts
  set details = jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
      version = version + 1
  where id = v_quote.account_id and version = p_account_version
  returning * into v_updated_account;

  if v_updated_account is null then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, p_account_version;
  end if;

  return (v_updated_quote, v_updated_account);
end;
$$;

create or replace function wallet.fail_cashu_send_quote(
  p_quote_id uuid,
  p_failure_reason text,
  p_quote_version integer,
  p_account_proofs text,
  p_account_version integer
) returns wallet.update_cashu_send_quote_result
language plpgsql
as $$
declare
  v_quote wallet.cashu_send_quotes;
  v_updated_quote wallet.cashu_send_quotes;
  v_updated_account wallet.accounts;
begin
  select * into v_quote
  from wallet.cashu_send_quotes
  where id = p_quote_id;

  if v_quote is null then
    raise exception 'Cashu send quote with id % not found', p_quote_id;
  end if;

  if v_quote.state not in ('UNPAID', 'PENDING') then
    raise exception 'Cannot fail cashu send quote with id %. Current state is %, but must be UNPAID or PENDING', p_quote_id, v_quote.state;
  end if;

  update wallet.cashu_send_quotes
  set state = 'FAILED',
      failure_reason = p_failure_reason,
      version = version + 1
  where id = p_quote_id and version = p_quote_version
  returning * into v_updated_quote;

  if v_updated_quote is null then
    raise exception 'Concurrency error: Cashu send quote % was modified by another transaction. Expected version %, but found different one.', p_quote_id, p_quote_version;
  end if;

  update wallet.accounts
  set details = jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
      version = version + 1
  where id = v_quote.account_id and version = p_account_version
  returning * into v_updated_account;

  if v_updated_account is null then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, p_account_version;
  end if;

  return (v_updated_quote, v_updated_account);
end;
$$;

create policy "Enable CRUD for cashu send quotes based on user_id"
on "wallet"."cashu_send_quotes"
as permissive
for all
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));

-- Cleanup expired and completed send quotes every day at midnight
select cron.schedule('cleanup-cashu-send-quotes', '0 0 * * *', $$
  DELETE FROM wallet.cashu_send_quotes
  WHERE state IN ('EXPIRED', 'COMPLETED') AND created_at < NOW() - INTERVAL '1 day';
$$);

-- Create index to make cleanup-cashu-send-quotes cron job query efficient
CREATE INDEX idx_cashu_send_quotes_state_created_at
ON wallet.cashu_receive_quotes (state, created_at);