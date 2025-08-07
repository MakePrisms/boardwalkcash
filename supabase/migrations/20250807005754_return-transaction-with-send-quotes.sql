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

