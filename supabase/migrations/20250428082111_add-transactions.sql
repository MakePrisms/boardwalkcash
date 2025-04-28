create table "wallet"."transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "direction" text not null,
    "type" text not null,
    "state" text not null,
    "account_id" uuid not null,
    "amount" numeric not null,
    "currency" text not null,
    "created_at" timestamp with time zone not null default now(),
    "pending_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "failed_at" timestamp with time zone
);


alter table "wallet"."transactions" enable row level security;

alter table "wallet"."cashu_receive_quotes" add column "transaction_id" uuid not null;

alter table "wallet"."cashu_receive_quotes" add column "type" text not null;

alter table "wallet"."cashu_send_quotes" add column "transaction_id" uuid not null;

CREATE UNIQUE INDEX transactions_pkey ON wallet.transactions USING btree (id);

alter table "wallet"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "wallet"."cashu_receive_quotes" add constraint "cashu_receive_quotes_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES wallet.transactions(id) not valid;

alter table "wallet"."cashu_receive_quotes" validate constraint "cashu_receive_quotes_transaction_id_fkey";

alter table "wallet"."cashu_send_quotes" add constraint "cashu_send_quotes_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES wallet.transactions(id) not valid;

alter table "wallet"."cashu_send_quotes" validate constraint "cashu_send_quotes_transaction_id_fkey";

alter table "wallet"."transactions" add constraint "transactions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES wallet.accounts(id) not valid;

alter table "wallet"."transactions" validate constraint "transactions_account_id_fkey";

alter table "wallet"."transactions" add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES wallet.users(id) not valid;

alter table "wallet"."transactions" validate constraint "transactions_user_id_fkey";

grant delete on table "wallet"."transactions" to "anon";

grant insert on table "wallet"."transactions" to "anon";

grant references on table "wallet"."transactions" to "anon";

grant select on table "wallet"."transactions" to "anon";

grant trigger on table "wallet"."transactions" to "anon";

grant truncate on table "wallet"."transactions" to "anon";

grant update on table "wallet"."transactions" to "anon";

grant delete on table "wallet"."transactions" to "authenticated";

grant insert on table "wallet"."transactions" to "authenticated";

grant references on table "wallet"."transactions" to "authenticated";

grant select on table "wallet"."transactions" to "authenticated";

grant trigger on table "wallet"."transactions" to "authenticated";

grant truncate on table "wallet"."transactions" to "authenticated";

grant update on table "wallet"."transactions" to "authenticated";

grant delete on table "wallet"."transactions" to "service_role";

grant insert on table "wallet"."transactions" to "service_role";

grant references on table "wallet"."transactions" to "service_role";

grant select on table "wallet"."transactions" to "service_role";

grant trigger on table "wallet"."transactions" to "service_role";

grant truncate on table "wallet"."transactions" to "service_role";

grant update on table "wallet"."transactions" to "service_role";

alter publication supabase_realtime add table wallet.transactions;

create policy "Enable CRUD for transactions based on user_id"
on "wallet"."transactions"
as permissive
for all
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));

-- Cleanup failed transactions every day at midnight
select cron.schedule('cleanup-transactions', '0 0 * * *', $$
  DELETE FROM wallet.transactions
  WHERE state = 'FAILED' AND created_at < NOW() - INTERVAL '30 day';
$$);

-- Create index to make cleanup-transactions cron job query efficient
CREATE INDEX idx_transactions_state_created_at
ON wallet.cashu_receive_quotes (state, created_at);

set check_function_bodies = off;

create or replace function wallet.create_cashu_receive_quote(
    p_user_id uuid,
    p_account_id uuid,
    p_amount numeric,
    p_currency text,
    p_unit text,
    p_quote_id text,
    p_payment_request text,
    p_expires_at timestamp with time zone,
    p_state text,
    p_locking_derivation_path text,
    p_receive_type text,
    p_description text default null
)
 returns wallet.cashu_receive_quotes
 language plpgsql
as $function$
declare
    v_transaction_id uuid;
    v_quote wallet.cashu_receive_quotes;
    v_transaction_type text;
begin
    -- Map receive type to transaction type
    v_transaction_type := case p_receive_type
        when 'LIGHTNING' then 'CASHU_LIGHTNING'
        when 'TOKEN' then 'CASHU_TOKEN'
        else null
    end;

    if v_transaction_type is null then
        raise exception 'Unsupported receive type: %', p_receive_type;
    end if;

    -- Create draft transaction record
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
        'RECEIVE',
        v_transaction_type,
        'DRAFT',
        p_amount,
        p_currency
    ) returning id into v_transaction_id;

    -- Create quote record
    insert into wallet.cashu_receive_quotes (
        user_id,
        account_id,
        amount,
        currency,
        unit,
        quote_id,
        payment_request,
        expires_at,
        description,
        state,
        locking_derivation_path,
        transaction_id,
        type
    ) values (
        p_user_id,
        p_account_id,
        p_amount,
        p_currency,
        p_unit,
        p_quote_id,
        p_payment_request,
        p_expires_at,
        p_description,
        p_state,
        p_locking_derivation_path,
        v_transaction_id,
        p_receive_type
    ) returning * into v_quote;

    return v_quote;
end;
$function$
;

create or replace function wallet.expire_cashu_receive_quote(
    p_quote_id uuid,
    p_quote_version integer
) returns wallet.cashu_receive_quotes
language plpgsql
as $function$
declare
    v_quote wallet.cashu_receive_quotes;
    v_updated_quote wallet.cashu_receive_quotes;
begin
    -- Get the quote and check if it exists and its state
    select * into v_quote
    from wallet.cashu_receive_quotes
    where id = p_quote_id;

    if v_quote is null then
        raise exception 'Quote % not found', p_quote_id;
    end if;

    if v_quote.expires_at > now() then
        raise exception 'Quote % has not expired yet', v_quote.id;
    end if;

    if v_quote.state != 'UNPAID' then
        raise exception 'Only quote in UNPAID state can be expired. Current state is %', v_quote.state;
    end if;

    -- Update the quote with optimistic concurrency
    update wallet.cashu_receive_quotes
    set state = 'EXPIRED'
    where id = v_quote.id and version = p_quote_version
    returning * into v_updated_quote;

    if not found then
        raise exception 'Concurrency error: Quote % was modified by another transaction. Expected version %, but found different one', v_quote.id, p_quote_version;
    end if;

    -- Update the transaction state to FAILED
    update wallet.transactions
    set state = 'FAILED',
        failed_at = now()
    where id = v_quote.transaction_id;

    return v_updated_quote;
end;
$function$
;

create or replace function wallet.process_cashu_receive_quote_payment(
    p_quote_id uuid,
    p_quote_version integer,
    p_keyset_id text,
    p_keyset_counter integer,
    p_output_amounts integer[],
    p_account_version integer
) returns wallet.cashu_receive_quote_payment_result
language plpgsql
as $function$
declare
    v_quote wallet.cashu_receive_quotes;
    v_account wallet.accounts;
    v_updated_counter integer;
    v_updated_quote wallet.cashu_receive_quotes;
    v_updated_account wallet.accounts;
begin
    -- Check if the quote is already PAID and if yes return the quote and account without doing any updates
    select * into v_quote
    from wallet.cashu_receive_quotes
    where id = p_quote_id
    for update;

    if v_quote.state = 'PAID' then
        select * into v_account
        from wallet.accounts
        where id = v_quote.account_id;

        return (v_quote, v_account);
    end if;

    -- Calculate new counter
    v_updated_counter := p_keyset_counter + array_length(p_output_amounts, 1);

    -- Update the quote with optimistic concurrency
    update wallet.cashu_receive_quotes q
    set 
        state = 'PAID',
        keyset_id = p_keyset_id,
        keyset_counter = p_keyset_counter,
        output_amounts = p_output_amounts,
        version = version + 1
    where q.id = p_quote_id and q.version = p_quote_version
    returning * into v_updated_quote;

    if not found then
        raise exception 'Concurrency error: Quote % was modified by another transaction. Expected version %, but found different one', p_quote_id, p_quote_version;
    end if;

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
    where a.id = v_updated_quote.account_id and a.version = p_account_version
    returning * into v_updated_account;

    if not found then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one', v_updated_quote.account_id, p_account_version;
    end if;

    -- Update the transaction state to PENDING
    update wallet.transactions
    set state = 'PENDING',
        pending_at = now()
    where id = v_updated_quote.transaction_id;

    return (v_updated_quote, v_updated_account);
end;
$function$
;

create or replace function wallet.complete_cashu_receive_quote(
    p_quote_id uuid,
    p_quote_version integer,
    p_proofs jsonb,
    p_account_version integer
) returns wallet.cashu_receive_quotes
language plpgsql
as $function$
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

    return v_updated_quote;
end;
$function$
;

create or replace function wallet.create_cashu_send_quote(
    p_user_id uuid,
    p_account_id uuid,
    p_currency text,
    p_unit text,
    p_payment_request text,
    p_expires_at timestamptz,
    p_amount_requested numeric,
    p_currency_requested text,
    p_amount_requested_in_msat bigint,
    p_amount_to_send numeric,
    p_fee_reserve numeric,
    p_quote_id text,
    p_keyset_id text,
    p_keyset_counter integer,
    p_number_of_change_outputs integer,
    p_proofs_to_send text,
    p_account_version integer,
    p_proofs_to_keep text
) returns wallet.create_cashu_send_quote_result
language plpgsql
as $function$
declare
    v_created_quote wallet.cashu_send_quotes;
    v_updated_account wallet.accounts;
    v_updated_counter integer;
    v_transaction_id uuid;
begin
    -- Calculate new counter value
    v_updated_counter := p_keyset_counter + p_number_of_change_outputs;

    -- Create transaction record
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
        'CASHU_LIGHTNING',
        'PENDING',
        p_amount_to_send,
        p_currency
    ) returning id into v_transaction_id;

    -- Insert the new cashu send quote
    insert into wallet.cashu_send_quotes (
        user_id,
        account_id,
        currency,
        unit,
        payment_request,
        expires_at,
        amount_requested,
        currency_requested,
        amount_requested_in_msat,
        amount_to_send,
        fee_reserve,
        quote_id,
        proofs,
        keyset_id,
        keyset_counter,
        number_of_change_outputs,
        transaction_id
    ) values (
        p_user_id,
        p_account_id,
        p_currency,
        p_unit,
        p_payment_request,
        p_expires_at,
        p_amount_requested,
        p_currency_requested,
        p_amount_requested_in_msat,
        p_amount_to_send,
        p_fee_reserve,
        p_quote_id,
        p_proofs_to_send,
        p_keyset_id,
        p_keyset_counter,
        p_number_of_change_outputs,
        v_transaction_id
    )
    returning * into v_created_quote;

    -- Update the account with optimistic concurrency check
    update wallet.accounts
    set details = jsonb_set(
            jsonb_set(details, '{proofs}', to_jsonb(p_proofs_to_keep)),
            array['keyset_counters', p_keyset_id],
            to_jsonb(v_updated_counter),
            true
        ),
        version = version + 1
    where id = v_created_quote.account_id and version = p_account_version
    returning * into v_updated_account;

    -- Check if account was updated
    if v_updated_account is null then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_created_quote.account_id, p_account_version;
    end if;

    return (v_created_quote, v_updated_account);
end;
$function$
;

create or replace function wallet.complete_cashu_send_quote(
    p_quote_id uuid,
    p_quote_version integer,
    p_payment_preimage text,
    p_amount_spent numeric,
    p_account_proofs text,
    p_account_version integer
) returns wallet.update_cashu_send_quote_result
language plpgsql
as $function$
declare
    v_updated_quote wallet.cashu_send_quotes;
    v_updated_account wallet.accounts;
    v_quote wallet.cashu_send_quotes;
begin
    -- Get the quote and check if it exists and its state
    select * into v_quote
    from wallet.cashu_send_quotes
    where id = p_quote_id;

    if v_quote is null then
        raise exception 'Cashu send quote with id % not found', p_quote_id;
    end if;

    if v_quote.state not in ('UNPAID', 'PENDING') then
        raise exception 'Cannot complete cashu send quote with id %. Current state is %, but must be UNPAID or PENDING', p_quote_id, v_quote.state;
    end if;

    -- Update the quote with optimistic concurrency check
    update wallet.cashu_send_quotes
    set state = 'PAID',
        payment_preimage = p_payment_preimage,
        amount_spent = p_amount_spent,
        version = version + 1
    where id = p_quote_id and version = p_quote_version
    returning * into v_updated_quote;

    -- Check if quote was updated
    if v_updated_quote is null then
        raise exception 'Concurrency error: Cashu send quote % was modified by another transaction. Expected version %, but found different one.', p_quote_id, p_quote_version;
    end if;

    -- Update the account with optimistic concurrency check
    update wallet.accounts
    set details = jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
        version = version + 1
    where id = v_quote.account_id and version = p_account_version
    returning * into v_updated_account;

    -- Check if account was updated
    if v_updated_account is null then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, p_account_version;
    end if;

    -- Update the transaction state to COMPLETED
    update wallet.transactions
    set state = 'COMPLETED',
        completed_at = now()
    where id = v_quote.transaction_id;

    return (v_updated_quote, v_updated_account);
end;
$function$
;

create or replace function wallet.expire_cashu_send_quote(
    p_quote_id uuid,
    p_quote_version integer,
    p_account_proofs text,
    p_account_version integer
) returns wallet.update_cashu_send_quote_result
language plpgsql
as $function$
declare
    v_quote wallet.cashu_send_quotes;
    v_updated_quote wallet.cashu_send_quotes;
    v_updated_account wallet.accounts;
begin
    select * into v_quote
    from wallet.cashu_send_quotes
    where id = p_quote_id;

    if v_quote is null then
        raise exception 'Cashu send quote with id % not found', p_quote_id;
    end if;

    if v_quote.state != 'UNPAID' then
        raise exception 'Cannot expire cashu send quote with id %. Current state is %, but must be UNPAID', p_quote_id, v_quote.state;
    end if;

    if v_quote.expires_at > now() then
        raise exception 'Cannot expire cashu send quote with id % that has not expired yet', p_quote_id;
    end if;

    update wallet.cashu_send_quotes
    set state = 'EXPIRED',
        version = version + 1
    where id = p_quote_id and version = p_quote_version
    returning * into v_updated_quote;

    if v_updated_quote is null then
        raise exception 'Concurrency error: Cashu send quote % was modified by another transaction. Expected version %, but found different one.', p_quote_id, p_quote_version;
    end if;

    update wallet.accounts
    set details = jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
        version = version + 1
    where id = v_quote.account_id and version = p_account_version
    returning * into v_updated_account;

    if v_updated_account is null then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, p_account_version;
    end if;

    -- Update the transaction state to FAILED
    update wallet.transactions
    set state = 'FAILED',
        failed_at = now()
    where id = v_quote.transaction_id;

    return (v_updated_quote, v_updated_account);
end;
$function$
;

create or replace function wallet.fail_cashu_send_quote(
    p_quote_id uuid,
    p_failure_reason text,
    p_quote_version integer,
    p_account_proofs text,
    p_account_version integer
) returns wallet.update_cashu_send_quote_result
language plpgsql
as $function$
declare
    v_quote wallet.cashu_send_quotes;
    v_updated_quote wallet.cashu_send_quotes;
    v_updated_account wallet.accounts;
begin
    select * into v_quote
    from wallet.cashu_send_quotes
    where id = p_quote_id;

    if v_quote is null then
        raise exception 'Cashu send quote with id % not found', p_quote_id;
    end if;

    if v_quote.state not in ('UNPAID', 'PENDING') then
        raise exception 'Cannot fail cashu send quote with id %. Current state is %, but must be UNPAID or PENDING', p_quote_id, v_quote.state;
    end if;

    update wallet.cashu_send_quotes
    set state = 'FAILED',
        failure_reason = p_failure_reason,
        version = version + 1
    where id = p_quote_id and version = p_quote_version
    returning * into v_updated_quote;

    if v_updated_quote is null then
        raise exception 'Concurrency error: Cashu send quote % was modified by another transaction. Expected version %, but found different one.', p_quote_id, p_quote_version;
    end if;

    update wallet.accounts
    set details = jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
        version = version + 1
    where id = v_quote.account_id and version = p_account_version
    returning * into v_updated_account;

    if v_updated_account is null then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, p_account_version;
    end if;

    -- Update the transaction state to FAILED
    update wallet.transactions
    set state = 'FAILED',
        failed_at = now()
    where id = v_quote.transaction_id;

    return (v_updated_quote, v_updated_account);
end;
$function$
;

