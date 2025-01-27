CREATE OR REPLACE FUNCTION public.set_updated_at_if_updated()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if any column value has changed
    IF (NEW IS DISTINCT FROM OLD) THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$function$
;


CREATE TRIGGER users_handle_updated_at BEFORE UPDATE ON wallet.users FOR EACH ROW EXECUTE FUNCTION set_updated_at_if_updated();


