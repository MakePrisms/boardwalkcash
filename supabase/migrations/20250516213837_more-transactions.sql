drop function if exists "wallet"."create_cashu_token_swap"(p_token_hash text, p_token_proofs text, p_account_id uuid, p_user_id uuid, p_currency text, p_unit text, p_keyset_id text, p_keyset_counter integer, p_output_amounts integer[], p_input_amount numeric, p_receive_amount numeric, p_fee_amount numeric, p_account_version integer);

alter table "wallet"."cashu_token_swaps" add column "type" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION wallet.create_cashu_token_swap(p_token_hash text, p_token_proofs text, p_account_id uuid, p_user_id uuid, p_currency text, p_unit text, p_keyset_id text, p_keyset_counter integer, p_output_amounts integer[], p_input_amount numeric, p_receive_amount numeric, p_fee_amount numeric, p_account_version integer, p_type text)
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
        currency
    ) values (
        p_user_id,
        p_account_id,
        'RECEIVE',
        case when p_type = 'CANCEL_CASHU_SEND_SWAP' then 'CANCEL_CASHU_SEND_SWAP' else 'CASHU_TOKEN' end,
        'PENDING',
        p_receive_amount,
        p_currency
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
    transaction_id,
    type
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
    v_transaction_id,
    p_type
  ) returning * into v_token_swap;

  return v_token_swap;
end;
$function$
;

CREATE OR REPLACE FUNCTION wallet.mark_cashu_send_swap_completed(p_swap_id uuid, p_swap_version integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    v_swap wallet.cashu_send_swaps;
    v_transaction_id uuid;
    v_token_hash text;
    v_cancelling_swap_exists boolean;
begin
    -- Get the swap record with optimistic concurrency check
    select * into v_swap
    from wallet.cashu_send_swaps
    where id = p_swap_id and version = p_swap_version;

    if v_swap is null then
        raise exception 'Concurrency error: Swap % not found or was modified by another transaction. Expected version %.', p_swap_id, p_swap_version;
    end if;

    v_transaction_id := v_swap.transaction_id;
    v_token_hash := v_swap.token_hash;
    -- Return if already COMPLETED
    if v_swap.state = 'COMPLETED' then
        return;
    end if;

    -- Only allow PENDING swaps to be marked as COMPLETED
    if v_swap.state != 'PENDING' then
        raise exception 'Swap % is not in PENDING state. Current state: %.', p_swap_id, v_swap.state;
    end if;

    -- Check if there is a cancelling token swap
    select exists (
        select 1 
        from wallet.cashu_token_swaps 
        where token_hash = v_token_hash 
        and type = 'CANCEL_CASHU_SEND_SWAP'
        and user_id = v_swap.user_id
    ) into v_cancelling_swap_exists;

    -- Update the swap state based on whether there is a cancelling swap
    update wallet.cashu_send_swaps
    set state = case when v_cancelling_swap_exists then 'CANCELLED' else 'COMPLETED' end,
        version = version + 1
    where id = p_swap_id and version = p_swap_version;

    -- Update the transaction state to match the swap state
    update wallet.transactions
    set state = case when v_cancelling_swap_exists then 'CANCELLED' else 'COMPLETED' end,
        completed_at = now()
    where id = v_transaction_id;
    
    return;
end;
$function$
;


