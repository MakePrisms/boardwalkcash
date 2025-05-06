create table "wallet"."cashu_send_swaps" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid not null,
    "transaction_id" uuid not null,
    "amount_requested" numeric not null,
    "amount_to_send" numeric not null,
    "fee" numeric not null,
    "proofs_to_send" text,
    "input_proofs" text not null,
    "keyset_id" text not null,
    "keyset_counter" integer not null,
    "keep_output_data" jsonb[] not null,
    "send_output_data" jsonb[] not null,
    "mint_url" text not null,
    "currency" text not null,
    "unit" text not null,
    "state" text not null,
    "version" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
);

CREATE UNIQUE INDEX cashu_send_swaps_pkey ON wallet.cashu_send_swaps USING btree (id);

alter table "wallet"."cashu_send_swaps" add constraint "cashu_send_swaps_pkey" PRIMARY KEY using index "cashu_send_swaps_pkey";

alter table "wallet"."cashu_send_swaps" enable row level security;

alter table "wallet"."cashu_send_swaps" add constraint "cashu_send_swaps_account_id_fkey" FOREIGN KEY (account_id) REFERENCES wallet.accounts(id) not valid;

alter table "wallet"."cashu_send_swaps" validate constraint "cashu_send_swaps_account_id_fkey";

alter table "wallet"."cashu_send_swaps" add constraint "cashu_send_swaps_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES wallet.transactions(id) not valid;

alter table "wallet"."cashu_send_swaps" validate constraint "cashu_send_swaps_transaction_id_fkey";

alter table "wallet"."cashu_send_swaps" add constraint "cashu_send_swaps_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."cashu_send_swaps" validate constraint "cashu_send_swaps_user_id_fkey";

set check_function_bodies = off;
create type "wallet"."complete_cashu_send_swap_result" as ("updated_swap" wallet.cashu_send_swaps, "updated_account" wallet.accounts);

alter publication supabase_realtime add table wallet.cashu_send_swaps;

CREATE OR REPLACE FUNCTION wallet.complete_cashu_send_swap(p_swap_id uuid, p_swap_version integer, p_account_version integer, p_proofs_to_send text, p_account_proofs jsonb)
 RETURNS wallet.complete_cashu_send_swap_result
 LANGUAGE plpgsql
AS $function$
declare
    v_swap wallet.cashu_send_swaps;
    v_account_id uuid;
    v_transaction_id uuid;
    v_updated_swap wallet.cashu_send_swaps;
    v_updated_account wallet.accounts;
begin
    -- Get the swap record with optimistic concurrency check
    select * into v_swap
    from wallet.cashu_send_swaps
    where id = p_swap_id and version = p_swap_version;
    
    if v_swap is null then
        raise exception 'Concurrency error: Swap % not found or was modified by another transaction. Expected version % and state PENDING.', p_swap_id, p_swap_version;
    end if;
    
    v_account_id := v_swap.account_id;
    v_transaction_id := v_swap.transaction_id;
    
    -- Update the transaction state to PENDING
    update wallet.transactions
    set state = 'PENDING'
    where id = v_transaction_id;

    if v_swap.state != 'SWAPPING' then
        raise exception 'Swap % is not in SWAPPING state. Current state: %.', p_swap_id, v_swap.state;
    end if;
    
    -- Update the swap with new proofs and increment version
    update wallet.cashu_send_swaps
    set proofs_to_send = p_proofs_to_send,
        state = 'READY',
        version = version + 1
    where id = p_swap_id and version = p_swap_version
    returning * into v_updated_swap;
    
    -- Update the account proofs with optimistic concurrency check
    update wallet.accounts
    set details = jsonb_set(details, '{proofs}', p_account_proofs),
        version = version + 1
    where id = v_account_id and version = p_account_version
    returning * into v_updated_account;
    
    -- Check if account was updated
    if v_updated_account is null then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_account_id, p_account_version;
    end if;
    
    return (v_updated_swap, v_updated_account);
end;
$function$
;
create type "wallet"."create_cashu_send_swap_result" as ("created_swap" wallet.cashu_send_swaps, "updated_account" wallet.accounts);


CREATE OR REPLACE FUNCTION wallet.create_cashu_send_swap(p_user_id uuid, p_account_id uuid, p_amount_requested numeric, p_amount_to_send numeric, p_fee numeric, p_input_proofs text, p_account_proofs text, p_keyset_id text, p_keyset_counter integer, p_keep_output_data jsonb[], p_send_output_data jsonb[], p_currency text, p_mint_url text, p_unit text, p_state text, p_account_version integer, p_proofs_to_send text DEFAULT NULL::text)
 RETURNS wallet.create_cashu_send_swap_result
 LANGUAGE plpgsql
AS $function$
declare
    v_transaction_id uuid;
    v_swap wallet.cashu_send_swaps;
    v_updated_account wallet.accounts;
    v_updated_counter integer;
    v_transaction_state text;
begin
    -- Validate p_state is one of the allowed values
    IF p_state NOT IN ('SWAPPING', 'READY') THEN
        RAISE EXCEPTION 'Invalid state: %. State must be either SWAPPING, READY, COMPLETED or RECLAIMED.', p_state;
    END IF;

    -- Determine transaction state based on p_state
    IF p_state = 'READY' THEN
        v_transaction_state := 'PENDING';
    ELSE
        v_transaction_state := 'DRAFT';
    END IF;

    -- Create transaction record with the determined state
    insert into wallet.transactions (
        user_id,
        account_id,
        direction,
        type,
        state,
        amount,
        currency
    ) values (
        p_user_id,
        p_account_id,
        'SEND',
        'CASHU_TOKEN',
        v_transaction_state,
        p_amount_to_send,
        p_currency
    ) returning id into v_transaction_id;

    -- Create send swap record
    insert into wallet.cashu_send_swaps (
        user_id,
        account_id,
        transaction_id,
        amount_requested,
        amount_to_send,
        fee,
        input_proofs,
        proofs_to_send,
        keyset_id,
        keyset_counter,
        keep_output_data,
        send_output_data,
        mint_url,
        currency,
        unit,
        state
    ) values (
        p_user_id,
        p_account_id,
        v_transaction_id,
        p_amount_requested,
        p_amount_to_send,
        p_fee,
        p_input_proofs,
        p_proofs_to_send,
        p_keyset_id,
        p_keyset_counter,
        p_keep_output_data,
        p_send_output_data,
        p_mint_url,
        p_currency,
        p_unit,
        p_state
    ) returning * into v_swap;

    IF array_length(p_send_output_data, 1) IS NULL THEN
        RAISE EXCEPTION 'send_output_data cannot be empty';
    END IF;
    
    -- Calculate new counter value
    -- note: array_length(array) returns null if the array is empty so we coalesce to 0
    v_updated_counter := p_keyset_counter + COALESCE(array_length(p_keep_output_data, 1), 0) + array_length(p_send_output_data, 1);

    update wallet.accounts
    set details = jsonb_set(
            jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
            array['keyset_counters', p_keyset_id],
            to_jsonb(v_updated_counter),
            true
        ),
        version = version + 1
    where id = v_swap.account_id and version = p_account_version
    returning * into v_updated_account;

    -- Check if account was updated
    if v_updated_account is null then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_swap.account_id, p_account_version;
    end if;

    return (v_swap, v_updated_account);
end;
$function$
;


grant delete on table "wallet"."cashu_send_swaps" to "anon";

grant insert on table "wallet"."cashu_send_swaps" to "anon";

grant references on table "wallet"."cashu_send_swaps" to "anon";

grant select on table "wallet"."cashu_send_swaps" to "anon";

grant trigger on table "wallet"."cashu_send_swaps" to "anon";

grant truncate on table "wallet"."cashu_send_swaps" to "anon";

grant update on table "wallet"."cashu_send_swaps" to "anon";

grant delete on table "wallet"."cashu_send_swaps" to "authenticated";

grant insert on table "wallet"."cashu_send_swaps" to "authenticated";

grant references on table "wallet"."cashu_send_swaps" to "authenticated";

grant select on table "wallet"."cashu_send_swaps" to "authenticated";

grant trigger on table "wallet"."cashu_send_swaps" to "authenticated";

grant truncate on table "wallet"."cashu_send_swaps" to "authenticated";

grant update on table "wallet"."cashu_send_swaps" to "authenticated";

grant delete on table "wallet"."cashu_send_swaps" to "service_role";

grant insert on table "wallet"."cashu_send_swaps" to "service_role";

grant references on table "wallet"."cashu_send_swaps" to "service_role";

grant select on table "wallet"."cashu_send_swaps" to "service_role";

grant trigger on table "wallet"."cashu_send_swaps" to "service_role";

grant truncate on table "wallet"."cashu_send_swaps" to "service_role";

grant update on table "wallet"."cashu_send_swaps" to "service_role";

create policy "Enable CRUD for cashu_send_swaps based on user_id"
on "wallet"."cashu_send_swaps"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



