create table "wallet"."cashu_send_swaps" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "account_id" uuid not null,
    "transaction_id" uuid not null,
    "amount_requested" numeric not null,
    "amount_to_send" numeric not null,
    "send_swap_fee" numeric not null,
    "receive_swap_fee" numeric not null,
    "total_amount" numeric not null,
    "proofs_to_send" text,
    "input_proofs" text not null,
    "input_amount" numeric not null,
    "keyset_id" text,
    "keyset_counter" integer,
    "send_output_amounts" integer[],
    "keep_output_amounts" integer[],
    "token_hash" text,
    "currency" text not null,
    "unit" text not null,
    "state" text not null,
    "version" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "failure_reason" text
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

alter table "wallet"."transactions" add column "reversed_transaction_id" uuid;
alter table "wallet"."transactions" add column "reversed_at" timestamp with time zone;
alter table "wallet"."transactions" add constraint "transactions_reversed_transaction_id_fkey" FOREIGN KEY (reversed_transaction_id) REFERENCES wallet.transactions(id);

-- Add unique constraint to ensure one transaction can only reverse one other transaction
ALTER TABLE "wallet"."transactions" ADD CONSTRAINT "transactions_reversed_transaction_id_unique" UNIQUE (reversed_transaction_id);

-- Add index for efficient lookup of transactions that reverse other transactions
CREATE INDEX idx_transactions_reversed_transaction_id ON wallet.transactions(reversed_transaction_id) WHERE reversed_transaction_id IS NOT NULL;

alter publication supabase_realtime add table wallet.cashu_send_swaps;

CREATE OR REPLACE FUNCTION wallet.commit_proofs_to_send(
    p_swap_id uuid,
    p_swap_version integer,
    p_account_version integer,
    p_proofs_to_send text,
    p_account_proofs jsonb,
    p_token_hash text
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    v_swap wallet.cashu_send_swaps;
    v_account_id uuid;
    v_transaction_id uuid;
begin
    select * into v_swap
    from wallet.cashu_send_swaps
    where id = p_swap_id
    for update;
    
    if v_swap is null then
        raise exception 'Swap % not found.', p_swap_id;
    end if;

    if v_swap.state != 'DRAFT' then
        raise exception 'Swap % is not in DRAFT state. Current state: %.', p_swap_id, v_swap.state;
    end if;
    
    v_account_id := v_swap.account_id;
    v_transaction_id := v_swap.transaction_id;
    
    -- Update the transaction state to PENDING
    update wallet.transactions
    set state = 'PENDING',
        pending_at = now()
    where id = v_transaction_id;
    
    -- Update the swap with new proofs and increment version with concurrency check
    update wallet.cashu_send_swaps
    set proofs_to_send = p_proofs_to_send,
        state = 'PENDING',
        token_hash = p_token_hash,
        version = version + 1
    where id = p_swap_id and version = p_swap_version
    returning * into v_swap;
    
    if not found then
        raise exception 'Concurrency error: Swap % was modified by another transaction. Expected version %.', p_swap_id, p_swap_version;
    end if;
    
    -- Update the account proofs with optimistic concurrency check
    update wallet.accounts
    set details = jsonb_set(details, '{proofs}', p_account_proofs),
        version = version + 1
    where id = v_account_id and version = p_account_version;
    
    return;
    end;
$function$
;

-- Mark a send swap and its transaction as COMPLETED
CREATE OR REPLACE FUNCTION wallet.complete_cashu_send_swap(
    p_swap_id uuid,
    p_swap_version integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
declare
    v_swap wallet.cashu_send_swaps;
    v_transaction_id uuid;
begin
    -- Get the swap record with optimistic concurrency check
    select * into v_swap
    from wallet.cashu_send_swaps
    where id = p_swap_id
    for update;

    if v_swap is null then
        raise exception 'Swap % not found.', p_swap_id;
    end if;

    -- return if already completed or reversed
    if v_swap.state in ('COMPLETED', 'REVERSED') then
        return;
    end if;

       -- Only allow PENDING swaps to be marked as COMPLETED
    if v_swap.state != 'PENDING' then
        raise exception 'Swap % is not in PENDING state. Current state: %.', p_swap_id, v_swap.state;
    end if;

    v_transaction_id := v_swap.transaction_id;

    update wallet.cashu_send_swaps
    set state = 'COMPLETED',
        version = version + 1
    where id = p_swap_id and version = p_swap_version;

    if not found then
        raise exception 'Concurrency error: Swap % was modified by another transaction. Expected version %.', p_swap_id, p_swap_version;
    end if;

    -- update the transaction state to completed
    update wallet.transactions
    set state = 'COMPLETED',
        completed_at = now()
    where id = v_transaction_id;

    return;
end;
$function$
;


CREATE OR REPLACE FUNCTION wallet.create_cashu_send_swap(
    p_user_id uuid,
    p_account_id uuid,
    p_amount_requested numeric,
    p_amount_to_send numeric,
    p_input_proofs text,
    p_account_proofs text, 
    p_currency text, 
    p_unit text, 
    p_state text, 
    p_account_version integer, 
    p_input_amount numeric,
    p_send_swap_fee numeric,
    p_receive_swap_fee numeric,
    p_total_amount numeric,
    p_keyset_id text DEFAULT NULL::text,
    p_keyset_counter integer DEFAULT NULL::integer,
    p_updated_keyset_counter integer DEFAULT NULL::integer,
    p_token_hash text DEFAULT NULL::text,
    p_proofs_to_send text DEFAULT NULL::text,
    p_send_output_amounts integer[] DEFAULT NULL::integer[],
    p_keep_output_amounts integer[] DEFAULT NULL::integer[]
) RETURNS wallet.cashu_send_swaps
 LANGUAGE plpgsql
AS $function$
declare
    v_transaction_id uuid;
    v_swap wallet.cashu_send_swaps;
begin
    -- Validate p_state is one of the allowed values
    IF p_state NOT IN ('DRAFT', 'PENDING') THEN
        RAISE EXCEPTION 'Invalid state: %. State must be either DRAFT or PENDING.', p_state;
    END IF;

    -- Validate input parameters based on the state
    IF p_state = 'PENDING' THEN
        -- For PENDING state, proofs_to_send and token_hash must be defined
        IF p_proofs_to_send IS NULL OR p_token_hash IS NULL THEN
            RAISE EXCEPTION 'When state is PENDING, proofs_to_send and token_hash must be provided';
        END IF;
    ELSIF p_state = 'DRAFT' THEN
        -- For DRAFT state, keyset_id, keyset_counter, updated_keyset_counter, send_output_amounts, and keep_output_amounts must be defined
        IF p_keyset_id IS NULL OR p_keyset_counter IS NULL OR p_updated_keyset_counter IS NULL OR p_send_output_amounts IS NULL OR p_keep_output_amounts IS NULL THEN
            RAISE EXCEPTION 'When state is DRAFT, keyset_id, keyset_counter, updated_keyset_counter, send_output_amounts, and keep_output_amounts must be provided';
        END IF;
    END IF;

    -- TODO:
    -- details: 
    -- - amount_requested: amount to send
    -- - amount_to_send: amount to receive
    -- - input_amount: amoun taken from balance
    -- - fees
    -- - state to track phase of the transaction

    -- Create transaction record with the determined state
    insert into wallet.transactions (
        user_id,
        account_id,
        direction,
        type,
        state,
        amount,
        currency,
        pending_at
    ) values (
        p_user_id,
        p_account_id,
        'SEND',
        'CASHU_TOKEN',
        'PENDING',
        p_amount_to_send,
        p_currency,
        now()
    ) returning id into v_transaction_id;

    -- Create send swap record
    insert into wallet.cashu_send_swaps (
        user_id,
        account_id,
        transaction_id,
        amount_requested,
        amount_to_send,
        send_swap_fee,
        receive_swap_fee,
        total_amount,
        input_proofs,
        input_amount,
        proofs_to_send,
        keyset_id,
        keyset_counter,
        send_output_amounts,
        keep_output_amounts,
        token_hash,
        currency,
        unit,
        state
    ) values (
        p_user_id,
        p_account_id,
        v_transaction_id,
        p_amount_requested,
        p_amount_to_send,
        p_send_swap_fee,
        p_receive_swap_fee,
        p_total_amount,
        p_input_proofs,
        p_input_amount,
        p_proofs_to_send,
        p_keyset_id,
        p_keyset_counter,
        p_send_output_amounts,
        p_keep_output_amounts,
        p_token_hash,
        p_currency,
        p_unit,
        p_state
    ) returning * into v_swap;

    if p_updated_keyset_counter is not null then
        update wallet.accounts
        set details = jsonb_set(
                jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
                array['keyset_counters', p_keyset_id],
                to_jsonb(p_updated_keyset_counter),
                true
            ),
            version = version + 1
        where id = v_swap.account_id and version = p_account_version;
    else
        update wallet.accounts
        set details = jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
            version = version + 1
        where id = v_swap.account_id and version = p_account_version;
    end if;
    
    return v_swap;
end;
$function$
;

CREATE OR REPLACE FUNCTION wallet.fail_cashu_send_swap(
    p_swap_id uuid,
    p_swap_version integer,
    p_reason text
) RETURNS void
LANGUAGE plpgsql
AS $function$
declare
    v_swap wallet.cashu_send_swaps;
    v_transaction_id uuid;
begin
    -- Get the swap record with optimistic concurrency check
    select * into v_swap
    from wallet.cashu_send_swaps
    where id = p_swap_id
    for update;
    
    if not found then
        raise exception 'Swap not found %', p_swap_id;
    end if;

    if v_swap.state != 'DRAFT' then
        raise exception 'Swap is not in DRAFT state. Current state: %.', v_swap.state;
    end if;
    
    -- Get the transaction ID
    v_transaction_id := v_swap.transaction_id;
    
    -- Update the swap state to FAILED
    update wallet.cashu_send_swaps
    set state = 'FAILED',
        failure_reason = p_reason,
        version = version + 1
    where id = p_swap_id and version = p_swap_version;
    
    if not found then
        raise exception 'Concurrency error: Swap % was modified by another transaction. Expected version %.', p_swap_id, p_swap_version;
    end if;
    
    -- Update the corresponding transaction to FAILED
    update wallet.transactions
    set state = 'FAILED',
        failed_at = now()
    where id = v_transaction_id;
    
    return;
end;
$function$
;


-- drop old function
drop function if exists "wallet"."create_cashu_token_swap"(p_token_hash text, p_token_proofs text, p_account_id uuid, p_user_id uuid, p_currency text, p_unit text, p_keyset_id text, p_keyset_counter integer, p_output_amounts integer[], p_input_amount numeric, p_receive_amount numeric, p_fee_amount numeric, p_account_version integer);

set check_function_bodies = off;
CREATE OR REPLACE FUNCTION wallet.create_cashu_token_swap(
    p_token_hash text, 
    p_token_proofs text, 
    p_account_id uuid, 
    p_user_id uuid, 
    p_currency text, 
    p_unit text, 
    p_keyset_id text, 
    p_keyset_counter integer,
    p_output_amounts integer[],
    p_input_amount numeric,
    p_receive_amount numeric,
    p_fee_amount numeric,
    p_account_version integer,
    p_reversed_transaction_id uuid DEFAULT NULL)
 RETURNS wallet.cashu_token_swaps
 LANGUAGE plpgsql
AS $function$
declare
  v_token_swap wallet.cashu_token_swaps;
  v_updated_counter integer;
  v_transaction_id uuid;
begin

 -- Create transaction record 
    insert into wallet.transactions (
        user_id,
        account_id,
        direction,
        type,
        state,
        amount,
        currency,
        reversed_transaction_id,
        pending_at
    ) values (
        p_user_id,
        p_account_id,
        'RECEIVE',
        'CASHU_TOKEN',
        'PENDING',
        p_receive_amount,
        p_currency,
        p_reversed_transaction_id,
        now()
    ) returning id into v_transaction_id;

  -- Calculate new counter
  v_updated_counter := p_keyset_counter + array_length(p_output_amounts, 1);

  -- Update the account with optimistic concurrency
  update wallet.accounts a
  set 
    details = jsonb_set(
      details, 
      array['keyset_counters', p_keyset_id], 
      to_jsonb(v_updated_counter), 
      true
    ),
    version = version + 1
  where a.id = p_account_id and a.version = p_account_version;

  if not found then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one', p_account_id, p_account_version;
  end if;

  insert into wallet.cashu_token_swaps (
    token_hash,
    token_proofs,
    account_id,
    user_id,
    currency,
    unit,
    keyset_id,
    keyset_counter,
    output_amounts,
    input_amount,
    receive_amount,
    fee_amount,
    state,
    transaction_id
  ) values (
    p_token_hash,
    p_token_proofs,
    p_account_id,
    p_user_id,
    p_currency,
    p_unit,
    p_keyset_id,
    p_keyset_counter,
    p_output_amounts,
    p_input_amount,
    p_receive_amount,
    p_fee_amount,
    'PENDING',
    v_transaction_id
  ) returning * into v_token_swap;

  return v_token_swap;
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

-- solves realtime update problems with PostgreSQL's TOAST and replication settings where we get updates missing large calumns
ALTER TABLE wallet.cashu_send_swaps REPLICA IDENTITY FULL;

create policy "Enable CRUD for cashu_send_swaps based on user_id"
on "wallet"."cashu_send_swaps"
as permissive
for all
to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));

-- cleanup completed, failed, and reversed swaps every day at midnight
select cron.schedule('cleanup-cashu-send-swaps', '0 0 * * *', $$
  DELETE FROM wallet.cashu_send_swaps
  WHERE state IN ('COMPLETED', 'FAILED', 'REVERSED') AND created_at < NOW() - INTERVAL '1 day';
$$);

-- add index for efficient cron job cleanup
create index idx_cashu_send_swaps_state_created_at on wallet.cashu_send_swaps (state, created_at) where state in ('COMPLETED', 'FAILED', 'REVERSED');

-- add index for efficient getUnresolved query (user_id + state filter)
create index idx_cashu_send_swaps_user_id_state on wallet.cashu_send_swaps (user_id, state) where state in ('DRAFT', 'PENDING');

-- add index for lookup by transaction_id used during reversals
create index idx_cashu_send_swaps_transaction_id on wallet.cashu_send_swaps (transaction_id);
-- drop old complete function
DROP FUNCTION IF EXISTS wallet.complete_cashu_token_swap(p_token_hash text, p_user_id uuid, p_swap_version integer, p_proofs jsonb, p_account_version integer);

CREATE OR REPLACE FUNCTION wallet.complete_cashu_token_swap(
    p_token_hash text,
    p_user_id uuid,
    p_swap_version integer,
    p_proofs jsonb,
    p_account_version integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_token_swap wallet.cashu_token_swaps;
    v_reversed_transaction_id uuid;
    v_send_swap wallet.cashu_send_swaps;
BEGIN
    SELECT * INTO v_token_swap
    FROM wallet.cashu_token_swaps
    WHERE token_hash = p_token_hash AND user_id = p_user_id
    FOR UPDATE;

    IF v_token_swap IS NULL THEN
        RAISE EXCEPTION 'Token swap for token hash % not found', p_token_hash;
    END IF;

    IF v_token_swap.state != 'PENDING' THEN
        RAISE EXCEPTION 'Token swap for token hash % cannot be completed because it is not in PENDING state. Current state: %', p_token_hash, v_token_swap.state;
    END IF;

    UPDATE wallet.accounts
    SET details = jsonb_set(details, '{proofs}', p_proofs, true),
        version = version + 1
    WHERE id = v_token_swap.account_id AND version = p_account_version;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one', v_token_swap.account_id, p_account_version;
    END IF;

    UPDATE wallet.cashu_token_swaps
    SET state = 'COMPLETED',
        version = version + 1
    WHERE token_hash = p_token_hash AND version = p_swap_version;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Concurrency error: Token swap % was modified by another transaction. Expected version %, but found different one', p_token_hash, p_swap_version;
    END IF;

    UPDATE wallet.transactions
    SET state = 'COMPLETED',
        completed_at = now()
    WHERE id = v_token_swap.transaction_id
    RETURNING reversed_transaction_id INTO v_reversed_transaction_id;

    IF v_reversed_transaction_id IS NOT NULL THEN
        SELECT * INTO v_send_swap
        FROM wallet.cashu_send_swaps
        WHERE transaction_id = v_reversed_transaction_id
        FOR UPDATE;

        IF FOUND THEN
            UPDATE wallet.cashu_send_swaps
            SET state = 'REVERSED',
                version = v_send_swap.version + 1
            WHERE id = v_send_swap.id;
        END IF;

        UPDATE wallet.transactions
        SET state = 'REVERSED',
            reversed_at = now()
        WHERE id = v_reversed_transaction_id;
    END IF;

    RETURN;
END;
$$;
