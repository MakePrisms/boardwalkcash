CREATE OR REPLACE FUNCTION wallet.fail_cashu_receive_quote(p_quote_id uuid, p_quote_version integer, p_failure_reason text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    v_transaction_id uuid;
begin
    -- Update the quote to FAILED state with optimistic concurrency control
    update wallet.cashu_receive_quotes
    set state = 'FAILED',
        failure_reason = p_failure_reason,
        version = version + 1
    where id = p_quote_id 
      and version = p_quote_version
    returning transaction_id into v_transaction_id;

    if not found then
        raise exception 'Cashu receive quote % not found or cannot be failed (wrong version or invalid state)', p_quote_id;
    end if;

    -- Update the corresponding transaction to FAILED
    update wallet.transactions
    set state = 'FAILED',
        failed_at = now()
    where id = v_transaction_id;

    return;
end;
$function$;
