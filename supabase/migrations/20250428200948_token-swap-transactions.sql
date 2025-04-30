alter table "wallet"."cashu_token_swaps" add column "transaction_id" uuid not null;

alter table "wallet"."cashu_token_swaps" add constraint "cashu_token_swaps_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES wallet.transactions(id) not valid;

alter table "wallet"."cashu_token_swaps" validate constraint "cashu_token_swaps_transaction_id_fkey";


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
  p_account_version integer
) RETURNS wallet.cashu_token_swaps
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
        'CASHU_TOKEN',
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

CREATE OR REPLACE FUNCTION wallet.complete_cashu_token_swap(
  p_token_hash text,
  p_user_id uuid,
  p_swap_version integer,
  p_proofs jsonb,
  p_account_version integer
) RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_token_swap wallet.cashu_token_swaps;
begin
  select * into v_token_swap
  from wallet.cashu_token_swaps
  where token_hash = p_token_hash and user_id = p_user_id 
  for update;

  if v_token_swap is null then
    raise exception 'Token swap for token hash % not found', p_token_hash;
  end if;

  if v_token_swap.state != 'PENDING' then
    raise exception 'Token swap for token hash % cannot be completed because it is not in PENDING state. Current state: %', p_token_hash, v_token_swap.state;
  end if;
  
  -- Update the account with optimistic concurrency
  update wallet.accounts
  set details = jsonb_set(details, '{proofs}', p_proofs, true),
      version = version + 1
  where id = v_token_swap.account_id and version = p_account_version;

  if not found then
    raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one', v_token_swap.account_id, p_account_version;
  end if;

  -- Update the token swap to completed
  update wallet.cashu_token_swaps
  set state = 'COMPLETED',
      version = version + 1
  where token_hash = p_token_hash and version = p_swap_version;

  if not found then
    raise exception 'Concurrency error: Token swap % was modified by another transaction. Expected version %, but found different one', p_token_hash, p_swap_version;
  end if;

  -- Update the transaction state to COMPLETED
  update wallet.transactions
  set state = 'COMPLETED',
      completed_at = now()
  where id = v_token_swap.transaction_id;

  return;
end;
$function$
;

CREATE OR REPLACE FUNCTION wallet.fail_cashu_token_swap(
  p_token_hash text,
  p_user_id uuid,
  p_swap_version integer,
  p_failure_reason text
) RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_token_swap wallet.cashu_token_swaps;
begin
  select * into v_token_swap
  from wallet.cashu_token_swaps
  where token_hash = p_token_hash and user_id = p_user_id 
  for update;

  if v_token_swap is null then
    raise exception 'Token swap for token hash % not found', p_token_hash;
  end if;

  if v_token_swap.state != 'PENDING' then
    raise exception 'Token swap for token hash % cannot be failed because it is not in PENDING state. Current state: %', p_token_hash, v_token_swap.state;
  end if;

  -- Update the token swap to failed with optimistic concurrency
  update wallet.cashu_token_swaps
  set state = 'FAILED',
      failure_reason = p_failure_reason,
      version = version + 1
  where token_hash = p_token_hash and user_id = p_user_id and version = p_swap_version;

  if not found then
    raise exception 'Concurrency error: Token swap % was modified by another transaction. Expected version %, but found different one', p_token_hash, p_swap_version;
  end if;

  -- Update the transaction state to FAILED
  update wallet.transactions
  set state = 'FAILED',
      failed_at = now()
  where id = v_token_swap.transaction_id;

  return;
end;
$function$
;

