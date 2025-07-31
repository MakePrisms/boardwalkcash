CREATE OR REPLACE FUNCTION wallet.fail_cashu_receive_quote(p_quote_id uuid, p_quote_version integer, p_failure_reason text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    v_quote wallet.cashu_receive_quotes;
    v_transaction_id uuid;
begin
    -- Read the current quote to validate state
    select * into v_quote
    from wallet.cashu_receive_quotes
    where id = p_quote_id
    for update;

    if v_quote is null then
        raise exception 'Cashu receive quote with id % not found', p_quote_id;
    end if;

    if v_quote.state not in ('PENDING', 'UNPAID') then
        raise exception 'Cannot fail cashu receive quote with id %. Current state is %, but must be PENDING or UNPAID', p_quote_id, v_quote.state;
    end if;

    -- Update the quote to FAILED state with optimistic concurrency control
    update wallet.cashu_receive_quotes
    set state = 'FAILED',
        failure_reason = p_failure_reason,
        version = version + 1
    where id = p_quote_id 
      and version = p_quote_version
    returning transaction_id into v_transaction_id;

    if not found then
        raise exception 'Concurrency error: Cashu receive quote % was modified by another transaction. Expected version %, but found different one.', p_quote_id, p_quote_version;
    end if;

    -- Update the corresponding transaction to FAILED
    update wallet.transactions
    set state = 'FAILED',
        failed_at = now()
    where id = v_transaction_id;

    return;
end;
$function$;
