create table "wallet"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "transaction_id" uuid,
    "type" text not null,
    "read_at" timestamp with time zone
);


alter table "wallet"."notifications" enable row level security;

CREATE UNIQUE INDEX notifications_pkey ON wallet.notifications USING btree (id);

alter table "wallet"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "wallet"."notifications" add constraint "notifications_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES wallet.transactions(id) not valid;

alter table "wallet"."notifications" validate constraint "notifications_transaction_id_fkey";

alter table "wallet"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."notifications" validate constraint "notifications_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION wallet.complete_cashu_receive_quote(p_quote_id uuid, p_quote_version integer, p_proofs jsonb, p_account_version integer)
 RETURNS wallet.cashu_receive_quotes
 LANGUAGE plpgsql
AS $function$
declare
    v_quote wallet.cashu_receive_quotes;
    v_updated_quote wallet.cashu_receive_quotes;
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

    update wallet.cashu_receive_quotes
    set state = 'COMPLETED'
    where id = v_quote.id and version = p_quote_version
    returning * into v_updated_quote;

    if not found then
        raise exception 'Concurrency error: Quote % was modified by another transaction. Expected version %, but found different one', v_quote.id, p_quote_version;
    end if;

    update wallet.accounts
    set details = jsonb_set(details, '{proofs}', p_proofs, true),
        version = version + 1
    where id = v_quote.account_id and version = p_account_version;

    if not found then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, p_account_version;
    end if;

    -- Update the transaction state to COMPLETED
    update wallet.transactions
    set state = 'COMPLETED',
        completed_at = now()
    where id = v_quote.transaction_id;

    -- Create a notification for the completed payment
    insert into wallet.notifications (user_id, transaction_id, type)
    select t.user_id, t.id, 'PAYMENT_RECEIVED'
    from wallet.transactions t
    where t.id = v_quote.transaction_id;

    return v_updated_quote;
end;
$function$
;

create or replace function wallet.complete_cashu_token_swap(
    p_token_hash text,
    p_user_id uuid,
    p_swap_version integer,
    p_proofs jsonb,
    p_account_version integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_token_swap wallet.cashu_token_swaps;
    v_reversed_transaction_id uuid;
    v_send_swap wallet.cashu_send_swaps;
begin
    select * into v_token_swap
    from wallet.cashu_token_swaps
    where token_hash = p_token_hash and user_id = p_user_id;

    if v_token_swap is null then
        raise exception 'token swap for token hash % not found', p_token_hash;
    end if;

    if v_token_swap.state != 'PENDING' then
        raise exception 'token swap for token hash % cannot be completed because it is not in pending state. current state: %', p_token_hash, v_token_swap.state;
    end if;

    -- update account with optimistic concurrency
    update wallet.accounts
    set details = jsonb_set(details, '{proofs}', p_proofs, true),
        version = version + 1
    where id = v_token_swap.account_id and version = p_account_version;

    if not found then
        raise exception 'concurrency error: account % was modified by another transaction. expected version %, but found different one', v_token_swap.account_id, p_account_version;
    end if;

    update wallet.cashu_token_swaps
    set state = 'COMPLETED',
        version = version + 1
    where token_hash = p_token_hash and user_id = p_user_id and version = p_swap_version;

    if not found then
        raise exception 'concurrency error: token swap % was modified by another transaction. expected version %, but found different one', p_token_hash, p_swap_version;
    end if;

    update wallet.transactions
    set state = 'COMPLETED',
        completed_at = now()
    where id = v_token_swap.transaction_id
    returning reversed_transaction_id into v_reversed_transaction_id;

    -- Create a notification for the completed token swap
    insert into wallet.notifications (user_id, transaction_id, type)
    select t.user_id, t.id, 'PAYMENT_RECEIVED'
    from wallet.transactions t
    where t.id = v_token_swap.transaction_id;

    -- if not reversing a send swap, we're done
    if v_reversed_transaction_id is null then
        return;
    end if;

    -- find the send swap that would be reversed
    select * into v_send_swap
    from wallet.cashu_send_swaps
    where transaction_id = v_reversed_transaction_id
    for update;

    if v_send_swap is null then
        raise exception 'no send swap found for reversed transaction %', v_reversed_transaction_id;
    end if;

    -- check if the send swap can be reversed
    if v_send_swap.state = 'REVERSED' then
        -- already reversed, nothing to do
        return;
    end if;

    -- update send swap (already locked for update)
    update wallet.cashu_send_swaps
    set state = 'REVERSED',
        version = version + 1
    where id = v_send_swap.id;

    if not found then
        raise exception 'send swap % not found for update', v_send_swap.id;
    end if;

    -- update the reversed transaction
    update wallet.transactions
    set state = 'REVERSED',
        reversed_at = now()
    where id = v_reversed_transaction_id;

    return;
end;
$$;

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
