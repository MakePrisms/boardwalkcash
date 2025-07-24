-- Add encrypted transaction details column to transactions table
ALTER TABLE "wallet"."transactions" ADD COLUMN "encrypted_transaction_details" TEXT NOT NULL;

-- Drop the amount column since amounts are now stored encrypted in transaction details
ALTER TABLE "wallet"."transactions" DROP COLUMN "amount";

-- Drop the old create_cashu_receive_quote function
DROP FUNCTION IF EXISTS wallet.create_cashu_receive_quote(uuid, uuid, numeric, text, text, text, text, timestamp with time zone, text, text, text, text);

CREATE OR REPLACE FUNCTION wallet.create_cashu_receive_quote(
    p_user_id uuid, 
    p_account_id uuid, 
    p_amount numeric, 
    p_currency text, p_unit text, 
    p_quote_id text, 
    p_payment_request text, 
    p_expires_at timestamp with time zone, 
    p_state text, 
    p_locking_derivation_path text, 
    p_receive_type text, 
    p_encrypted_transaction_details text,
    p_description text DEFAULT NULL::text
)
 RETURNS wallet.cashu_receive_quotes
 LANGUAGE plpgsql
AS $function$
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
        currency,
        encrypted_transaction_details
    ) values (
        p_user_id,
        p_account_id,
        'RECEIVE',
        v_transaction_type,
        'DRAFT',
        p_currency,
        p_encrypted_transaction_details
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

-- Drop the old create_cashu_token_swap function
DROP FUNCTION IF EXISTS wallet.create_cashu_token_swap(text, text, uuid, uuid, text, text, text, integer, integer[], numeric, numeric, numeric, integer, uuid);

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
    p_encrypted_transaction_details text,
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
        currency,
        reversed_transaction_id,
        pending_at,
        encrypted_transaction_details
    ) values (
        p_user_id,
        p_account_id,
        'RECEIVE',
        'CASHU_TOKEN',
        'PENDING',
        p_currency,
        p_reversed_transaction_id,
        now(),
        p_encrypted_transaction_details
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

-- Drop the old create_cashu_send_quote function
DROP FUNCTION IF EXISTS wallet.create_cashu_send_quote(uuid, uuid, text, text, text, timestamp with time zone, numeric, text, bigint, numeric, numeric, numeric, text, text, integer, integer, text, integer, text);

create or replace function wallet.create_cashu_send_quote(
    p_user_id uuid,
    p_account_id uuid,
    p_currency text,
    p_unit text,
    p_payment_request text,
    p_expires_at timestamp with time zone,
    p_amount_requested numeric,
    p_currency_requested text,
    p_amount_requested_in_msat bigint,
    p_amount_to_receive numeric,
    p_lightning_fee_reserve numeric,
    p_cashu_fee numeric,
    p_quote_id text,
    p_keyset_id text,
    p_keyset_counter integer,
    p_number_of_change_outputs integer,
    p_proofs_to_send text,
    p_account_version integer,
    p_proofs_to_keep text,
    p_encrypted_transaction_details text
) returns wallet.create_cashu_send_quote_result
language plpgsql
as $function$
declare
    v_created_quote wallet.cashu_send_quotes;
    v_updated_account wallet.accounts;
    v_updated_counter integer;
    v_transaction_id uuid;
begin
    -- calculate new counter value
    v_updated_counter := p_keyset_counter + p_number_of_change_outputs;

    -- create transaction record
    insert into wallet.transactions (
        user_id,
        account_id,
        direction,
        type,
        state,
        currency,
        encrypted_transaction_details
    ) values (
        p_user_id,
        p_account_id,
        'SEND',
        'CASHU_LIGHTNING',
        'PENDING',
        p_currency,
        p_encrypted_transaction_details
    ) returning id into v_transaction_id;

    -- insert the new cashu send quote
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
        amount_to_receive,
        lightning_fee_reserve,
        cashu_fee,
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
        p_amount_to_receive,
        p_lightning_fee_reserve,
        p_cashu_fee,
        p_quote_id,
        p_proofs_to_send,
        p_keyset_id,
        p_keyset_counter,
        p_number_of_change_outputs,
        v_transaction_id
    )
    returning * into v_created_quote;

    -- update the account with optimistic concurrency check
    update wallet.accounts
    set details = jsonb_set(
            jsonb_set(details, '{proofs}', to_jsonb(p_proofs_to_keep)),
            array['keyset_counters', p_keyset_id],
            to_jsonb(v_updated_counter),
            true
        ),
        version = version + 1
    where id = v_created_quote.account_id
      and version = p_account_version
    returning * into v_updated_account;

    -- check if account was updated
    if v_updated_account is null then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_created_quote.account_id, p_account_version;
    end if;

    return (v_created_quote, v_updated_account);
end;
$function$;

-- Drop the old create_cashu_send_swap function
DROP FUNCTION IF EXISTS wallet.create_cashu_send_swap(uuid, uuid, numeric, numeric, text, text, text, text, text, integer, numeric, numeric, numeric, numeric, text, integer, integer, text, text, integer[], integer[]);
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
    p_encrypted_transaction_details text,
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
        currency,
        pending_at,
        encrypted_transaction_details
    ) values (
        p_user_id,
        p_account_id,
        'SEND',
        'CASHU_TOKEN',
        'PENDING',
        p_currency,
        now(),
        p_encrypted_transaction_details
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

-- Update complete_cashu_send_quote to handle encrypted amount spent
DROP FUNCTION IF EXISTS wallet.complete_cashu_send_quote(uuid, integer, text, numeric, text, integer);
-- Replace function to set transaction amount to final amount spent
create or replace function wallet.complete_cashu_send_quote(
    p_quote_id uuid,
    p_quote_version integer,
    p_payment_preimage text,
    p_amount_spent numeric,
    p_account_proofs text,
    p_account_version integer,
    p_encrypted_transaction_details text
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
    where id = p_quote_id
    for update;

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
    where id = p_quote_id
      and version = p_quote_version
    returning * into v_updated_quote;

    -- Check if quote was updated
    if v_updated_quote is null then
        raise exception 'Concurrency error: Cashu send quote % was modified by another transaction. Expected version %, but found different one.', p_quote_id, p_quote_version;
    end if;

    -- Update the account with optimistic concurrency check
    update wallet.accounts
    set details = jsonb_set(details, '{proofs}', to_jsonb(p_account_proofs)),
        version = version + 1
    where id = v_quote.account_id
      and version = p_account_version
    returning * into v_updated_account;

    -- Check if account was updated
    if v_updated_account is null then
        raise exception 'Concurrency error: Account % was modified by another transaction. Expected version %, but found different one.', v_quote.account_id, p_account_version;
    end if;

    -- Update the transaction state to COMPLETED
    update wallet.transactions
    set state = 'COMPLETED',
        completed_at = now(),
        encrypted_transaction_details = p_encrypted_transaction_details
    where id = v_quote.transaction_id;

    return (v_updated_quote, v_updated_account);
end;
$function$;