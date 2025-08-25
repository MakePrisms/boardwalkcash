create table "wallet"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "transaction_id" uuid,
    "type" text not null
);

alter table "wallet"."notifications" enable row level security;

CREATE UNIQUE INDEX notifications_pkey ON wallet.notifications USING btree (id);

alter table "wallet"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "wallet"."notifications" add constraint "notifications_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES wallet.transactions(id) not valid;

alter table "wallet"."notifications" validate constraint "notifications_transaction_id_fkey";

alter table "wallet"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."notifications" validate constraint "notifications_user_id_fkey";

set check_function_bodies = off;

grant delete on table "wallet"."notifications" to "anon";

grant insert on table "wallet"."notifications" to "anon";

grant references on table "wallet"."notifications" to "anon";

grant select on table "wallet"."notifications" to "anon";

grant trigger on table "wallet"."notifications" to "anon";

grant truncate on table "wallet"."notifications" to "anon";

grant update on table "wallet"."notifications" to "anon";

grant delete on table "wallet"."notifications" to "authenticated";

grant insert on table "wallet"."notifications" to "authenticated";

grant references on table "wallet"."notifications" to "authenticated";

grant select on table "wallet"."notifications" to "authenticated";

grant trigger on table "wallet"."notifications" to "authenticated";

grant truncate on table "wallet"."notifications" to "authenticated";

grant update on table "wallet"."notifications" to "authenticated";

grant delete on table "wallet"."notifications" to "service_role";

grant insert on table "wallet"."notifications" to "service_role";

grant references on table "wallet"."notifications" to "service_role";

grant select on table "wallet"."notifications" to "service_role";

grant trigger on table "wallet"."notifications" to "service_role";

grant truncate on table "wallet"."notifications" to "service_role";

grant update on table "wallet"."notifications" to "service_role";

create policy "Enable CRUD for notifications based on user_id"
on "wallet"."notifications"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));

alter publication supabase_realtime add table wallet.notifications;

-- Create a trigger to insert a notification whenever a RECEIVE transaction is completed
create or replace function wallet.fn_create_notification_on_receive_completed()
returns trigger
language plpgsql
as $$
begin
  -- Insert a PAYMENT_RECEIVED notification for the user when a RECEIVE transaction is marked COMPLETED
  insert into wallet.notifications (user_id, transaction_id, type)
  values (new.user_id, new.id, 'PAYMENT_RECEIVED');

  return new;
end;
$$;

drop trigger if exists trg_create_notification_on_receive_completed on wallet.transactions;
create trigger trg_create_notification_on_receive_completed
after update of state on wallet.transactions
for each row
when (
  old.state is distinct from new.state
  and new.state = 'COMPLETED'
  and new.direction = 'RECEIVE'
)
execute function wallet.fn_create_notification_on_receive_completed();
