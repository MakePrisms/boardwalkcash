create table "wallet"."accounts" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "name" text not null,
    "type" text not null,
    "currency" text not null
);


alter table "wallet"."accounts" enable row level security;

create table "wallet"."users" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now()
);


alter table "wallet"."users" enable row level security;

CREATE UNIQUE INDEX accounts_pkey ON wallet.accounts USING btree (id);

CREATE UNIQUE INDEX users_pkey ON wallet.users USING btree (id);

alter table "wallet"."accounts" add constraint "accounts_pkey" PRIMARY KEY using index "accounts_pkey";

alter table "wallet"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "wallet"."accounts" add constraint "accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."accounts" validate constraint "accounts_user_id_fkey";

grant delete on table "wallet"."accounts" to "anon";

grant insert on table "wallet"."accounts" to "anon";

grant references on table "wallet"."accounts" to "anon";

grant select on table "wallet"."accounts" to "anon";

grant trigger on table "wallet"."accounts" to "anon";

grant truncate on table "wallet"."accounts" to "anon";

grant update on table "wallet"."accounts" to "anon";

grant delete on table "wallet"."accounts" to "authenticated";

grant insert on table "wallet"."accounts" to "authenticated";

grant references on table "wallet"."accounts" to "authenticated";

grant select on table "wallet"."accounts" to "authenticated";

grant trigger on table "wallet"."accounts" to "authenticated";

grant truncate on table "wallet"."accounts" to "authenticated";

grant update on table "wallet"."accounts" to "authenticated";

grant delete on table "wallet"."accounts" to "service_role";

grant insert on table "wallet"."accounts" to "service_role";

grant references on table "wallet"."accounts" to "service_role";

grant select on table "wallet"."accounts" to "service_role";

grant trigger on table "wallet"."accounts" to "service_role";

grant truncate on table "wallet"."accounts" to "service_role";

grant update on table "wallet"."accounts" to "service_role";

grant delete on table "wallet"."users" to "anon";

grant insert on table "wallet"."users" to "anon";

grant references on table "wallet"."users" to "anon";

grant select on table "wallet"."users" to "anon";

grant trigger on table "wallet"."users" to "anon";

grant truncate on table "wallet"."users" to "anon";

grant update on table "wallet"."users" to "anon";

grant delete on table "wallet"."users" to "authenticated";

grant insert on table "wallet"."users" to "authenticated";

grant references on table "wallet"."users" to "authenticated";

grant select on table "wallet"."users" to "authenticated";

grant trigger on table "wallet"."users" to "authenticated";

grant truncate on table "wallet"."users" to "authenticated";

grant update on table "wallet"."users" to "authenticated";

grant delete on table "wallet"."users" to "service_role";

grant insert on table "wallet"."users" to "service_role";

grant references on table "wallet"."users" to "service_role";

grant select on table "wallet"."users" to "service_role";

grant trigger on table "wallet"."users" to "service_role";

grant truncate on table "wallet"."users" to "service_role";

grant update on table "wallet"."users" to "service_role";


