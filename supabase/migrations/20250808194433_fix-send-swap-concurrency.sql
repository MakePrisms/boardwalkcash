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

    if not found then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %.', v_account_id, p_account_version;
    end if;

    return;
    end;
$function$
;