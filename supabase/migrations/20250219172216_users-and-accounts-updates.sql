alter table "wallet"."users" add column "default_btc_account_id" uuid;

alter table "wallet"."users" add column "default_currency" text not null default 'BTC'::text;

alter table "wallet"."users" add column "default_usd_account_id" uuid;

CREATE UNIQUE INDEX cashu_accounts_user_currency_mint_url_unique ON wallet.accounts USING btree (user_id, currency, ((details ->> 'mint_url'::text))) WHERE (type = 'cashu'::text);

alter table "wallet"."users" add constraint "users_default_btc_account_id_fkey" FOREIGN KEY (default_btc_account_id) REFERENCES wallet.accounts(id) not valid;

alter table "wallet"."users" validate constraint "users_default_btc_account_id_fkey";

alter table "wallet"."users" add constraint "users_default_usd_account_id_fkey" FOREIGN KEY (default_usd_account_id) REFERENCES wallet.accounts(id) not valid;

alter table "wallet"."users" validate constraint "users_default_usd_account_id_fkey";

set check_function_bodies = off;

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
    'created_at', a.created_at
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
      'details', new_acc.details
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


