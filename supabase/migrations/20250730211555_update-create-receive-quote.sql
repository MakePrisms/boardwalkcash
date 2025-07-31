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
    v_transaction_state text;
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

    -- We create token receives as pending because the lightning payment on the sender
    -- side will be triggered by the receiver, so we know it should get paid.
    -- For lightning, we create a draft transaction record because its not guaranteed that
    -- the invoice will ever be paid.
    v_transaction_state := case v_transaction_type
        when 'CASHU_TOKEN' then 'PENDING'
        else 'DRAFT'
    end;

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
        v_transaction_state,
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