drop function if exists "wallet"."upsert_user_with_accounts"(user_id uuid, email text, email_verified boolean, accounts jsonb[]);

create table "wallet"."public_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "username" text not null,
    "user_id" uuid
);

alter table "wallet"."public_profiles" enable row level security;

alter table "wallet"."users" add column "profile_id" uuid;

CREATE UNIQUE INDEX public_profiles_pkey ON wallet.public_profiles USING btree (id);

CREATE UNIQUE INDEX public_profiles_username_key ON wallet.public_profiles USING btree (username);

alter table "wallet"."public_profiles" add constraint "public_profiles_pkey" PRIMARY KEY using index "public_profiles_pkey";

alter table "wallet"."public_profiles" add constraint "public_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."public_profiles" validate constraint "public_profiles_user_id_fkey";

alter table "wallet"."public_profiles" add constraint "public_profiles_username_key" UNIQUE using index "public_profiles_username_key";

alter table "wallet"."users" add constraint "users_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES wallet.public_profiles(id) not valid;

alter table "wallet"."users" validate constraint "users_profile_id_fkey";

ALTER TABLE "wallet"."public_profiles" ENABLE ROW LEVEL SECURITY;

-- Create a security definer function that will bypass RLS for search
CREATE FUNCTION wallet.search_for_user_by_username(query text)
RETURNS TABLE (
  id uuid,
  username text,
  user_id uuid,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER -- This is the key part - function runs with definer's privileges
SET search_path = wallet
AS $function$
BEGIN
  -- Return empty result if query is less than 3 characters
  IF length(query) < 3 THEN
    RETURN;
  END IF;
  
  -- Return only the first 10 matching user profiles
  RETURN QUERY
  SELECT p.id, p.username, p.user_id, p.created_at
  FROM wallet.public_profiles p
  WHERE p.username ILIKE '%' || query || '%'
  LIMIT 10;
END;
$function$;

-- Policy for authenticated users to manage their own profiles
CREATE POLICY "Users can manage their own profiles"
ON "wallet"."public_profiles"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant execute permission to the search function
GRANT EXECUTE ON FUNCTION wallet.search_for_user_by_username(text) TO public;
GRANT EXECUTE ON FUNCTION wallet.search_for_user_by_username(text) TO authenticated;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION wallet.upsert_user_with_accounts(user_id uuid, email text, email_verified boolean, accounts jsonb[], profile jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  result_user jsonb;
  existing_accounts jsonb;
  existing_profile jsonb;
  acct jsonb;
  new_acc wallet.accounts%ROWTYPE;
  new_profile wallet.public_profiles%ROWTYPE;
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
    'profile_id', u.profile_id,
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

  -- Select existing profile
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'created_at', p.created_at
  ) into existing_profile
  from wallet.public_profiles p
  where p.user_id = upsert_user_with_accounts.user_id;

  -- If user already has accounts and profile, return user with accounts and profile
  if jsonb_array_length(coalesce(existing_accounts, '[]'::jsonb)) > 0 then    
    result_user := jsonb_set(result_user, '{accounts}', existing_accounts);
    if existing_profile is not null then
      result_user := jsonb_set(result_user, '{profile}', existing_profile);
    end if;
    return result_user;
  end if;

  -- Validate profile to insert
  if profile is null then
    raise exception 'Profile is required for new users';
  end if;

  if profile->>'username' is null then
    raise exception 'Username is required in profile';
  end if;

  -- Insert profile
  insert into wallet.public_profiles (username, user_id)
  values (profile->>'username', user_id)
  returning * into new_profile;

  -- Update user with profile_id
  update wallet.users
  set profile_id = new_profile.id
  where id = user_id;

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
    'profile_id', u.profile_id,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'accounts', added_accounts,
    'profile', jsonb_build_object(
      'id', new_profile.id,
      'username', new_profile.username,
      'created_at', new_profile.created_at
    )
  ) into result_user;

  return result_user;

end;
$function$
;

grant delete on table "wallet"."public_profiles" to "anon";

grant insert on table "wallet"."public_profiles" to "anon";

grant references on table "wallet"."public_profiles" to "anon";

grant select on table "wallet"."public_profiles" to "anon";

grant trigger on table "wallet"."public_profiles" to "anon";

grant truncate on table "wallet"."public_profiles" to "anon";

grant update on table "wallet"."public_profiles" to "anon";

grant delete on table "wallet"."public_profiles" to "authenticated";

grant insert on table "wallet"."public_profiles" to "authenticated";

grant references on table "wallet"."public_profiles" to "authenticated";

grant select on table "wallet"."public_profiles" to "authenticated";

grant trigger on table "wallet"."public_profiles" to "authenticated";

grant truncate on table "wallet"."public_profiles" to "authenticated";

grant update on table "wallet"."public_profiles" to "authenticated";

grant delete on table "wallet"."public_profiles" to "service_role";

grant insert on table "wallet"."public_profiles" to "service_role";

grant references on table "wallet"."public_profiles" to "service_role";

grant select on table "wallet"."public_profiles" to "service_role";

grant trigger on table "wallet"."public_profiles" to "service_role";

grant truncate on table "wallet"."public_profiles" to "service_role";

grant update on table "wallet"."public_profiles" to "service_role";



