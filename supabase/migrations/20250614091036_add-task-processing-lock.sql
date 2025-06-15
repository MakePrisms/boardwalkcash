create table "wallet"."task_processing_locks" (
    "user_id" uuid not null,
    "lead_client_id" uuid not null,
    "expires_at" timestamp with time zone not null
);


alter table "wallet"."task_processing_locks" enable row level security;

create unique index task_processing_locks_pkey on wallet.task_processing_locks using btree (user_id);

alter table "wallet"."task_processing_locks" add constraint "task_processing_locks_pkey" primary key using index "task_processing_locks_pkey";

alter table "wallet"."task_processing_locks" add constraint "task_processing_locks_user_id_fkey" foreign key (user_id) references wallet.users(id) on update cascade on delete cascade not valid;

alter table "wallet"."task_processing_locks" validate constraint "task_processing_locks_user_id_fkey";

grant delete on table "wallet"."task_processing_locks" to "anon";

grant insert on table "wallet"."task_processing_locks" to "anon";

grant references on table "wallet"."task_processing_locks" to "anon";

grant select on table "wallet"."task_processing_locks" to "anon";

grant trigger on table "wallet"."task_processing_locks" to "anon";

grant truncate on table "wallet"."task_processing_locks" to "anon";

grant update on table "wallet"."task_processing_locks" to "anon";

grant delete on table "wallet"."task_processing_locks" to "authenticated";

grant insert on table "wallet"."task_processing_locks" to "authenticated";

grant references on table "wallet"."task_processing_locks" to "authenticated";

grant select on table "wallet"."task_processing_locks" to "authenticated";

grant trigger on table "wallet"."task_processing_locks" to "authenticated";

grant truncate on table "wallet"."task_processing_locks" to "authenticated";

grant update on table "wallet"."task_processing_locks" to "authenticated";

grant delete on table "wallet"."task_processing_locks" to "service_role";

grant insert on table "wallet"."task_processing_locks" to "service_role";

grant references on table "wallet"."task_processing_locks" to "service_role";

grant select on table "wallet"."task_processing_locks" to "service_role";

grant trigger on table "wallet"."task_processing_locks" to "service_role";

grant truncate on table "wallet"."task_processing_locks" to "service_role";

grant update on table "wallet"."task_processing_locks" to "service_role";

create policy "Enable CRUD for task processing locks based on user_id"
on "wallet"."task_processing_locks"
as permissive
for all
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));

create or replace function wallet.take_lead(
    p_user_id uuid,
    p_client_id uuid
) returns boolean
language plpgsql
as $$
declare
    v_record wallet.task_processing_locks;
    v_now timestamp with time zone := now();
    v_expiry timestamp with time zone := v_now + interval '6 seconds';
    v_inserted boolean := false;
begin
    -- First try to select and lock the existing record
    select * into v_record
    from wallet.task_processing_locks
    where user_id = p_user_id
    for update;

    -- If no record exists, try to insert
    if v_record is null then
        insert into wallet.task_processing_locks (user_id, lead_client_id, expires_at)
        values (p_user_id, p_client_id, v_expiry)
        on conflict (user_id) do nothing
        returning true into v_inserted;

        -- Return the result of insert attempt. If v_inserted is false it means that another transaction has taken the lead.
        return v_inserted;
    end if;

    -- If lead_client_id matches, extend expiry
    if v_record.lead_client_id = p_client_id then
        update wallet.task_processing_locks
        set expires_at = v_expiry
        where user_id = p_user_id;
        return true;
    end if;

    -- If current lock has expired, take the lead
    if v_record.expires_at <= v_now then
        update wallet.task_processing_locks
        set lead_client_id = p_client_id,
            expires_at = v_expiry
        where user_id = p_user_id;
        return true;
    end if;

    -- If we get here, other client is the lead and the lock hasn't expired
    return false;
end;
$$;



