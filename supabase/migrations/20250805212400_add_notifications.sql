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

-- add index for lookup by transaction_id used during reversals
create index idx_notifications_transaction_id on wallet.notifications (transaction_id);

-- Create a composite type to return transaction with its notifications
-- This uses the actual column types from the transactions table
create type wallet.transaction_with_notifications as (
  id uuid,
  user_id uuid,
  direction text,
  type text,
  state text,
  account_id uuid,
  currency text,
  created_at timestamptz,
  pending_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  reversed_transaction_id uuid,
  reversed_at timestamptz,
  state_sort_order integer,
  encrypted_transaction_details text,
  notifications wallet.notifications[] -- Array of notification records (null if no notifications)
);

-- Drop the existing function since we're changing its return type
drop function if exists wallet.list_transactions(uuid, integer, timestamptz, uuid, integer);

-- Function to list user transactions with pagination and notifications
-- Updated to return both transactions and their associated notifications in a single query
create or replace function wallet.list_transactions(
  p_user_id uuid,
  p_cursor_state_sort_order integer default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_page_size integer default 25
)
returns setof wallet.transaction_with_notifications
language plpgsql
stable
security definer
as $$
begin
  -- Check if cursor data is provided
  if p_cursor_created_at is null then
    -- Initial page load (no cursor)
    return query
          select 
        -- Return individual transaction fields to match composite type
        t.id,
        t.user_id,
        t.direction,
        t.type,
        t.state,
        t.account_id,
        t.currency,
        t.created_at,
        t.pending_at,
        t.completed_at,
        t.failed_at,
        t.reversed_transaction_id,
        t.reversed_at,
        t.state_sort_order,
        t.encrypted_transaction_details,
        -- Aggregate all notifications for this transaction into an array
        -- Uses filter to exclude null notifications (when no notifications exist)
        array_agg(n.*::wallet.notifications) filter (where n.id is not null) as notifications
    from wallet.transactions t
    -- LEFT JOIN ensures we get transactions even if they have no notifications
    left join wallet.notifications n on t.id = n.transaction_id
    where t.user_id = p_user_id
      and t.state in ('PENDING', 'COMPLETED', 'REVERSED')
          -- GROUP BY all transaction fields to enable aggregation of notifications
      group by t.id, t.user_id, t.direction, t.type, t.state, t.account_id, t.currency, 
               t.created_at, t.pending_at, t.completed_at, t.failed_at, t.reversed_transaction_id, 
               t.reversed_at, t.state_sort_order, t.encrypted_transaction_details
    order by t.state_sort_order desc, t.created_at desc, t.id desc
    limit p_page_size;
  else
    -- Subsequent pages (with cursor)
    return query
          select 
        -- Same structure as above but with cursor filtering
        t.id,
        t.user_id,
        t.direction,
        t.type,
        t.state,
        t.account_id,
        t.currency,
        t.created_at,
        t.pending_at,
        t.completed_at,
        t.failed_at,
        t.reversed_transaction_id,
        t.reversed_at,
        t.state_sort_order,
        t.encrypted_transaction_details,
        array_agg(n.*::wallet.notifications) filter (where n.id is not null) as notifications
    from wallet.transactions t
    left join wallet.notifications n on t.id = n.transaction_id
    where t.user_id = p_user_id
      and t.state in ('PENDING', 'COMPLETED', 'REVERSED')
      -- Cursor-based pagination using composite comparison for consistent ordering
      and (t.state_sort_order, t.created_at, t.id) < (
        p_cursor_state_sort_order,
        p_cursor_created_at,
        p_cursor_id
      )
          group by t.id, t.user_id, t.direction, t.type, t.state, t.account_id, t.currency, 
               t.created_at, t.pending_at, t.completed_at, t.failed_at, t.reversed_transaction_id, 
               t.reversed_at, t.state_sort_order, t.encrypted_transaction_details
    order by t.state_sort_order desc, t.created_at desc, t.id desc
    limit p_page_size;
  end if;
end;
$$;
