create table "wallet"."cashu_receive_quotes" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "quote_id" text not null,
    "account_id" uuid not null,
    "user_id" uuid not null,
    "amount" numeric not null,
    "unit" text not null,
    "description" text,
    "expires_at" timestamp with time zone not null,
    "state" text not null,
    "payment_request" text not null,
    "currency" text not null,
    "keyset_id" text,
    "keyset_counter" integer,
    "number_of_blinded_messages" integer,
    "version" integer not null default 0
);


alter table "wallet"."cashu_receive_quotes" enable row level security;

alter table "wallet"."accounts" add column "version" integer not null default 0;

CREATE UNIQUE INDEX cashu_receive_quotes_pkey ON wallet.cashu_receive_quotes USING btree (id);

alter table "wallet"."cashu_receive_quotes" add constraint "cashu_receive_quotes_pkey" PRIMARY KEY using index "cashu_receive_quotes_pkey";

alter table "wallet"."accounts" add constraint "accounts_version_check" CHECK ((version >= 0)) not valid;

alter table "wallet"."accounts" validate constraint "accounts_version_check";

alter table "wallet"."cashu_receive_quotes" add constraint "cashu_receive_quotes_account_id_fkey" FOREIGN KEY (account_id) REFERENCES wallet.accounts(id) not valid;

alter table "wallet"."cashu_receive_quotes" validate constraint "cashu_receive_quotes_account_id_fkey";

alter table "wallet"."cashu_receive_quotes" add constraint "cashu_receive_quotes_keyset_counter_check" CHECK ((keyset_counter >= 0)) not valid;

alter table "wallet"."cashu_receive_quotes" validate constraint "cashu_receive_quotes_keyset_counter_check";

alter table "wallet"."cashu_receive_quotes" add constraint "cashu_receive_quotes_number_of_blinded_messages_check" CHECK ((number_of_blinded_messages > 0)) not valid;

alter table "wallet"."cashu_receive_quotes" validate constraint "cashu_receive_quotes_number_of_blinded_messages_check";

alter table "wallet"."cashu_receive_quotes" add constraint "cashu_receive_quotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."cashu_receive_quotes" validate constraint "cashu_receive_quotes_user_id_fkey";

alter table "wallet"."cashu_receive_quotes" add constraint "cashu_receive_quotes_version_check" CHECK ((version >= 0)) not valid;

alter table "wallet"."cashu_receive_quotes" validate constraint "cashu_receive_quotes_version_check";

set check_function_bodies = off;

create type "wallet"."cashu_receive_quote_payment_result" as ("updated_quote" wallet.cashu_receive_quotes, "updated_account" wallet.accounts);

CREATE OR REPLACE FUNCTION wallet.complete_cashu_receive_quote(p_quote_id uuid, quote_version integer, proofs jsonb, account_version integer)
 RETURNS wallet.cashu_receive_quotes
 LANGUAGE plpgsql
AS $function$
declare
  v_quote wallet.cashu_receive_quotes;
begin
  select * into v_quote
  from wallet.cashu_receive_quotes
  where id = p_quote_id;

  if v_quote is null then
    raise exception 'Quote % not found', p_quote_id;
  end if;

  if v_quote.state != 'PAID' then
    raise exception 'Quote % has not been paid yet', v_quote.id;
  end if;

  delete from wallet.cashu_receive_quotes
  where id = v_quote.id and version = quote_version;

  if not found then
    raise exception 'Concurrency error: Quote % was modified by another transaction. Expected version %, but found different one', v_quote.id, quote_version
      using errcode = '40001';
  end if;

  update wallet.accounts
  set details = jsonb_set(details, '{proofs}', proofs, true),
      version = version + 1
  where id = v_quote.account_id and version = account_version;

  if not found then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, account_version
      using errcode = '40001';
  end if;

  return v_quote;
end;
$function$
;

CREATE OR REPLACE FUNCTION wallet.expire_cashu_receive_quote(quote_id uuid, quote_version integer)
 RETURNS wallet.cashu_receive_quotes
 LANGUAGE plpgsql
AS $function$
declare
  v_quote wallet.cashu_receive_quotes;
begin
  select * into v_quote
  from wallet.cashu_receive_quotes
  where id = quote_id;

  if v_quote is null then
    raise exception 'Quote % not found', quote_id;
  end if;

  if v_quote.expires_at > now() then
    raise exception 'Quote % has not expired yet', quote_id;
  end if;

  if v_quote.state = 'PAID' then
    raise exception 'Quote % has been paid already', quote_id;
  end if;

  delete from wallet.cashu_receive_quotes
  where id = quote_id and version = quote_version;

  if not found then
    raise exception 'Concurrency error: Quote % was modified by another transaction. Expected version %, but different one', quote_id, quote_version
      using errcode = '40001';
  end if;

  return v_quote;
end;
$function$
;

CREATE OR REPLACE FUNCTION wallet.process_cashu_receive_quote_payment(p_quote_id uuid, quote_version integer, p_keyset_id text, p_keyset_counter integer, p_number_of_blinded_messages smallint, account_version integer)
 RETURNS wallet.cashu_receive_quote_payment_result
 LANGUAGE plpgsql
AS $function$
declare
  v_quote wallet.cashu_receive_quotes;
  v_account wallet.accounts;
  v_updated_counter integer;
  v_updated_quote wallet.cashu_receive_quotes;
  v_updated_account wallet.accounts;
begin
  -- Check if the quote is already PAID and if yes return the quote and account without doing any updates
  select * into v_quote
  from wallet.cashu_receive_quotes
  where id = p_quote_id
  for update;

  if v_quote.state = 'PAID' then
    select * into v_account
    from wallet.accounts
    where id = v_quote.account_id;

    return (v_quote, v_account);
  end if;

  -- Calculate new counter
  v_updated_counter := p_keyset_counter + p_number_of_blinded_messages;

  -- Update the quote with optimistic concurrency
  update wallet.cashu_receive_quotes q
  set 
    state = 'PAID',
    keyset_id = p_keyset_id,
    keyset_counter = p_keyset_counter,
    number_of_blinded_messages = p_number_of_blinded_messages,
    version = version + 1
  where q.id = p_quote_id and q.version = quote_version
  returning * into v_updated_quote;

  if not found then
    raise exception 'Concurrency error: Quote % was modified by another transaction. Expected version %, but found different one', p_quote_id, quote_version
      using errcode = '40001';
  end if;

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
  where a.id = v_updated_quote.account_id and a.version = account_version
  returning * into v_updated_account;

  if not found then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one', v_updated_quote.account_id, account_version
      using errcode = '40001';
  end if;

  return (v_updated_quote, v_updated_account);
end;
$function$
;

CREATE OR REPLACE FUNCTION wallet.upsert_user_with_accounts(user_id uuid, email text, email_verified boolean, accounts jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  result_user jsonb;
  existing_accounts jsonb;
  acct jsonb;
  new_acc wallet.accounts%ROWTYPE;
  added_accounts jsonb := '[]'::jsonb;
  usd_account_id uuid := null;
  btc_account_id uuid := null;
begin
  -- Upsert user
  insert into wallet.users (id, email, email_verified)
  values (upsert_user_with_accounts.user_id, upsert_user_with_accounts.email, email_verified)
  on conflict (id) do update set
    email = coalesce(EXCLUDED.email, wallet.users.email),
    email_verified = EXCLUDED.email_verified;

  -- Select and lock the user row
  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'email_verified', u.email_verified,
    'default_usd_account_id', u.default_usd_account_id,
    'default_btc_account_id', u.default_btc_account_id,
    'default_currency', u.default_currency,
    'created_at', u.created_at,
    'updated_at', u.updated_at
  ) into result_user
  from wallet.users u
  where u.id = upsert_user_with_accounts.user_id
  for update;

  -- Select existing accounts
  select jsonb_agg(jsonb_build_object(
    'id', a.id,
    'type', a.type,
    'currency', a.currency,
    'name', a.name,
    'details', a.details,
    'created_at', a.created_at,
    'version', a.version
  )) into existing_accounts
  from wallet.accounts a
  where a.user_id = upsert_user_with_accounts.user_id;

  -- If user already has accounts, return user with accounts
  if jsonb_array_length(coalesce(existing_accounts, '[]'::jsonb)) > 0 then    
    result_user := jsonb_set(result_user, '{accounts}', existing_accounts);
    return result_user;
  end if;

  -- Validate accounts to insert
  if array_length(accounts, 1) is null then
    raise exception 'Accounts array cannot be empty';
  end if;

  if not jsonb_path_exists(array_to_json(accounts)::jsonb, '$[*] ? (@.currency == "USD")') then
    raise exception 'At least one USD account is required';
  end if;

  if not jsonb_path_exists(array_to_json(accounts)::jsonb, '$[*] ? (@.currency == "BTC")') then
    raise exception 'At least one BTC account is required';
  end if;

  -- Insert accounts
  foreach acct in array accounts loop
    insert into wallet.accounts (user_id, type, currency, name, details)
    values (
      upsert_user_with_accounts.user_id,
      acct->>'type',
      acct->>'currency',
      acct->>'name',
      acct->'details'
    )
    returning * into new_acc;

    -- Append to added accounts list
    added_accounts := added_accounts || jsonb_build_object(
      'id', new_acc.id,
      'user_id', new_acc.user_id,
      'type', new_acc.type,
      'currency', new_acc.currency,
      'name', new_acc.name,
      'details', new_acc.details,
      'version', new_acc.version,
      'created_at', new_acc.created_at
    );

    -- Set default account IDs
    if new_acc.currency = 'USD' then
      usd_account_id := new_acc.id;
    elsif new_acc.currency = 'BTC' then
      btc_account_id := new_acc.id;
    end if;
  end loop;

  -- Update user with default account IDs (keeping existing values)
  update wallet.users u
  set 
    default_usd_account_id = coalesce(usd_account_id, u.default_usd_account_id),
    default_btc_account_id = coalesce(btc_account_id, u.default_btc_account_id)
  where id = upsert_user_with_accounts.user_id
  returning jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'email_verified', u.email_verified,
    'default_usd_account_id', u.default_usd_account_id,
    'default_btc_account_id', u.default_btc_account_id,
    'default_currency', u.default_currency,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'accounts', added_accounts
  ) into result_user;

  return result_user;

end;
$function$
;

grant delete on table "wallet"."cashu_receive_quotes" to "anon";

grant insert on table "wallet"."cashu_receive_quotes" to "anon";

grant references on table "wallet"."cashu_receive_quotes" to "anon";

grant select on table "wallet"."cashu_receive_quotes" to "anon";

grant trigger on table "wallet"."cashu_receive_quotes" to "anon";

grant truncate on table "wallet"."cashu_receive_quotes" to "anon";

grant update on table "wallet"."cashu_receive_quotes" to "anon";

grant delete on table "wallet"."cashu_receive_quotes" to "authenticated";

grant insert on table "wallet"."cashu_receive_quotes" to "authenticated";

grant references on table "wallet"."cashu_receive_quotes" to "authenticated";

grant select on table "wallet"."cashu_receive_quotes" to "authenticated";

grant trigger on table "wallet"."cashu_receive_quotes" to "authenticated";

grant truncate on table "wallet"."cashu_receive_quotes" to "authenticated";

grant update on table "wallet"."cashu_receive_quotes" to "authenticated";

grant delete on table "wallet"."cashu_receive_quotes" to "service_role";

grant insert on table "wallet"."cashu_receive_quotes" to "service_role";

grant references on table "wallet"."cashu_receive_quotes" to "service_role";

grant select on table "wallet"."cashu_receive_quotes" to "service_role";

grant trigger on table "wallet"."cashu_receive_quotes" to "service_role";

grant truncate on table "wallet"."cashu_receive_quotes" to "service_role";

grant update on table "wallet"."cashu_receive_quotes" to "service_role";

create policy "Enable CRUD for cashu receive quotes based on user_id"
on "wallet"."cashu_receive_quotes"
as permissive
for all
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));

alter publication supabase_realtime add table wallet.cashu_receive_quotes;

