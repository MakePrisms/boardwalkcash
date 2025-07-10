-- migration: send swap state updates
-- purpose: update database functions for handling send swap state transitions when reversing the send swap via a token swap
-- affected tables: wallet.cashu_token_swaps, wallet.cashu_send_swaps

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
    where token_hash = p_token_hash and user_id = p_user_id
    for update;

    if v_token_swap is null then
        raise exception 'token swap for token hash % not found', p_token_hash;
    end if;

    if v_token_swap.state != 'PENDING' then
        raise exception 'token swap for token hash % cannot be completed because it is not in pending state. current state: %', p_token_hash, v_token_swap.state;
    end if;

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
    where token_hash = p_token_hash and version = p_swap_version;

    if not found then
        raise exception 'concurrency error: token swap % was modified by another transaction. expected version %, but found different one', p_token_hash, p_swap_version;
    end if;

    update wallet.transactions
    set state = 'COMPLETED',
        completed_at = now()
    where id = v_token_swap.transaction_id
    returning reversed_transaction_id into v_reversed_transaction_id;

    -- check if this token swap is reversing a send swap
    if v_reversed_transaction_id is null then
        -- token swap is not reversing a send swap, nothing to do
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
    elsif v_send_swap.state != 'PENDING' then
        -- any other state (completed, failed, draft) cannot be reversed
        raise exception 'cannot reverse send swap % because it is in % state. only pending swaps can be reversed', v_send_swap.id, v_send_swap.state;
    end if;

    -- update send swap and transaction to reversed state
    update wallet.cashu_send_swaps
    set state = 'REVERSED',
        version = v_send_swap.version + 1
    where id = v_send_swap.id;

    update wallet.transactions
    set state = 'REVERSED',
        reversed_at = now()
    where id = v_reversed_transaction_id;

    return;
end;
$$;

create or replace function wallet.complete_cashu_send_swap(
    p_swap_id uuid,
    p_swap_version integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
    v_swap wallet.cashu_send_swaps;
    v_transaction_id uuid;
    v_reversal_transaction_state text;
begin
    -- get the swap record with optimistic concurrency check
    select * into v_swap
    from wallet.cashu_send_swaps
    where id = p_swap_id
    for update;

    if v_swap is null then
        raise exception 'swap % not found.', p_swap_id;
    end if;

    -- return if already completed or reversed
    if v_swap.state in ('COMPLETED', 'REVERSED') then
        return;
    end if;

       -- only allow pending swaps to be marked as completed
    if v_swap.state != 'PENDING' then
        raise exception 'swap % is not in pending state. current state: %.', p_swap_id, v_swap.state;
    end if;

    v_transaction_id := v_swap.transaction_id;

    -- check if there's a reversal transaction pointing to this transaction
    select state into v_reversal_transaction_state
    from wallet.transactions
    where reversed_transaction_id = v_transaction_id;

    if v_reversal_transaction_state is not null then
        -- if there's a reversal transaction that is not failed, return early
        -- the token swap completion will handle updating the send swap state
        if v_reversal_transaction_state != 'FAILED' then
            return;
        end if;
        -- if the reversal transaction failed, continue to mark send swap as completed
    end if;

    update wallet.cashu_send_swaps
    set state = 'COMPLETED',
        version = version + 1
    where id = p_swap_id and version = p_swap_version;

    if not found then
        raise exception 'concurrency error: swap % was modified by another transaction. expected version %.', p_swap_id, p_swap_version;
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


-- replaces the old fail_cashu_token_swap function to handle case where token swap is failing a reversal transaction
create or replace function wallet.fail_cashu_token_swap(
    p_token_hash text, 
    p_user_id uuid, 
    p_swap_version integer, 
    p_failure_reason text
)
returns void
language plpgsql
as $function$
declare
    v_token_swap wallet.cashu_token_swaps;
    v_send_swap wallet.cashu_send_swaps;
begin
    select * into v_token_swap
    from wallet.cashu_token_swaps
    where token_hash = p_token_hash and user_id = p_user_id 
    for update;

    if v_token_swap is null then
        raise exception 'token swap for token hash % not found', p_token_hash;
    end if;

    if v_token_swap.state != 'PENDING' then
        raise exception 'token swap for token hash % cannot be failed because it is not in pending state. current state: %', p_token_hash, v_token_swap.state;
    end if;

    -- special handling for "Token already claimed" failures
    if p_failure_reason = 'Token already claimed' then
        -- check if this token swap transaction is reversing a send transaction
        if exists (
            select 1 
            from wallet.transactions t
            where t.id = v_token_swap.transaction_id 
            and t.reversed_transaction_id is not null
        ) then
            -- find the corresponding send swap and update it to completed
            select * into v_send_swap
            from wallet.cashu_send_swaps
            where transaction_id = (
                select reversed_transaction_id 
                from wallet.transactions 
                where id = v_token_swap.transaction_id
            )
            for update;

            if v_send_swap is not null then
                update wallet.cashu_send_swaps
                set state = 'COMPLETED',
                    version = version + 1
                where id = v_send_swap.id;

                -- update the original send transaction to completed
                update wallet.transactions
                set state = 'COMPLETED',
                    completed_at = now()
                where id = v_send_swap.transaction_id;
            end if;
        end if;
    end if;

    -- update the token swap to failed with optimistic concurrency
    update wallet.cashu_token_swaps
    set state = 'FAILED',
        failure_reason = p_failure_reason,
        version = version + 1
    where token_hash = p_token_hash and user_id = p_user_id and version = p_swap_version;

    if not found then
        raise exception 'concurrency error: token swap % was modified by another transaction. expected version %, but found different one', p_token_hash, p_swap_version;
    end if;

    -- update the transaction state to failed
    update wallet.transactions
    set state = 'FAILED',
        failed_at = now()
    where id = v_token_swap.transaction_id;

    return;
end;
$function$
;
