CREATE OR REPLACE FUNCTION wallet.search_users_by_partial_username(partial_username text)
RETURNS TABLE (username text, id uuid) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF length(partial_username) < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.username, u.id
  FROM wallet.users u 
  WHERE u.username ILIKE partial_username || '%'
  ORDER BY u.username ASC;
END;
$$;

--  QUESTION: should we only allow this for authenticated users?
GRANT EXECUTE ON FUNCTION wallet.search_users_by_partial_username TO anon;

create table "wallet"."contacts" (
    "id" uuid default gen_random_uuid() not null,
    "created_at" timestamp with time zone not null default now(),
    "owner_id" uuid not null,
    -- defined if another boardwalk user is the contact
    "username" text 
);

alter table "wallet"."contacts" enable row level security;

CREATE UNIQUE INDEX contacts_pkey ON wallet.contacts USING btree (id);

alter table "wallet"."contacts" add constraint "contacts_pkey" PRIMARY KEY using index "contacts_pkey";

alter table "wallet"."contacts" add constraint "contacts_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."contacts" validate constraint "contacts_owner_id_fkey";

alter table "wallet"."contacts" add constraint "contacts_username_fkey" FOREIGN KEY (username) REFERENCES wallet.users(username) ON UPDATE CASCADE not valid;

alter table "wallet"."contacts" validate constraint "contacts_username_fkey";

-- TODO: see about making no self referencing contacts a policy. 
-- Damian was having issues with it, the check was not being enforced.
-- 
--  This is the policy I was trying:
-- 
-- CREATE POLICY prevent_self_contact_insert ON wallet.contacts
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--     username IS NULL OR username <> (SELECT u.username FROM wallet.users u WHERE u.id = auth.uid())
-- );
-- 
-- CREATE POLICY prevent_self_contact_update ON wallet.contacts
-- FOR UPDATE
-- TO authenticated
-- WITH CHECK (
--     username IS NULL OR username <> (SELECT u.username FROM wallet.users u WHERE u.id = auth.uid())
-- );
-- 
-- using this function instead of a policy works.
CREATE OR REPLACE FUNCTION wallet.check_not_self_contact(owner_id uuid, contact_username text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM wallet.users 
    WHERE id = owner_id AND username = contact_username
  );
END;
$$ LANGUAGE plpgsql;


ALTER TABLE wallet.contacts
ADD CONSTRAINT prevent_self_contact
CHECK (
  username IS NULL OR 
  wallet.check_not_self_contact(owner_id, username)
);

-- can't add same contact twice.
ALTER TABLE wallet.contacts
ADD CONSTRAINT contacts_owner_id_username_key
UNIQUE (owner_id, username);

grant delete on table "wallet"."contacts" to "anon";

grant insert on table "wallet"."contacts" to "anon";

grant references on table "wallet"."contacts" to "anon";

grant select on table "wallet"."contacts" to "anon";

grant trigger on table "wallet"."contacts" to "anon";

grant truncate on table "wallet"."contacts" to "anon";

grant update on table "wallet"."contacts" to "anon";

grant delete on table "wallet"."contacts" to "authenticated";

grant insert on table "wallet"."contacts" to "authenticated";

grant references on table "wallet"."contacts" to "authenticated";

grant select on table "wallet"."contacts" to "authenticated";

grant trigger on table "wallet"."contacts" to "authenticated";

grant truncate on table "wallet"."contacts" to "authenticated";

grant update on table "wallet"."contacts" to "authenticated";

grant delete on table "wallet"."contacts" to "service_role";

grant insert on table "wallet"."contacts" to "service_role";

grant references on table "wallet"."contacts" to "service_role";

grant select on table "wallet"."contacts" to "service_role";

grant trigger on table "wallet"."contacts" to "service_role";

grant truncate on table "wallet"."contacts" to "service_role";

grant update on table "wallet"."contacts" to "service_role";

create policy "users_can_crud_their_contacts"
on "wallet"."contacts"
as permissive
for all
to authenticated
using ((( SELECT auth.uid() AS uid) = owner_id))
with check ((( SELECT auth.uid() AS uid) = owner_id));



