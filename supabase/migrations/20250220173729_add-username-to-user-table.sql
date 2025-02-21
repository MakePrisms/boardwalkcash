alter table "wallet"."users" add column "username" text not null default substr(md5(random()::text), 1, 12);

alter table "wallet"."users" add constraint "users_username_unique" unique ("username");

CREATE INDEX users_username_idx ON wallet.users USING btree (username);
