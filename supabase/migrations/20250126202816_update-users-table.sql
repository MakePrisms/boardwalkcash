drop policy "Enable update for users based on email" on "wallet"."users";

alter table "wallet"."users" add column "email" text;

alter table "wallet"."users" add column "email_verified" boolean not null;

alter table "wallet"."users" add column "updated_at" timestamp with time zone not null default now();

CREATE UNIQUE INDEX users_email_key ON wallet.users USING btree (email);

alter table "wallet"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

create policy "Enable CRUD for users based on id"
on "wallet"."users"
as permissive
for all
to authenticated
using ((( SELECT auth.uid() AS uid) = id))
with check ((( SELECT auth.uid() AS uid) = id));



