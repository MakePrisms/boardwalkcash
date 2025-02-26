alter table "wallet"."users" add column "username" text not null default ''::text;

CREATE UNIQUE INDEX users_username_key ON wallet.users USING btree (username);

alter table "wallet"."users" add constraint "users_username_key" UNIQUE using index "users_username_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION wallet.set_default_username()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
    -- Set the username field to "user-" concatenated with the last 12 characters of the id
    NEW.username := 'user-' || RIGHT(NEW.id::text, 12);
    
    -- Return the modified record
    RETURN NEW;
END;$function$
;

CREATE TRIGGER set_default_username_trigger BEFORE INSERT ON wallet.users FOR EACH ROW EXECUTE FUNCTION wallet.set_default_username();


