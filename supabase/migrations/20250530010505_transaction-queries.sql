-- Description:
-- This migration creates a computed column state_sort_order and database function to efficiently fetch user transactions
-- with PENDING transactions prioritized first (state_sort_order = 2), followed by other transactions (state_sort_order = 1),
-- all ordered by state_sort_order DESC, created_at DESC within their respective groups.
-- 
-- Affected Tables: wallet.transactions
-- Function: list_transactions
-- 
-- Performance Impact: 
-- - Single query approach reduces round trips
-- - Efficient cursor-based pagination
-- - Computed column simplifies ordering logic
-- - Optimized index for fast lookups
-- ========================================

-- Add computed column for state ordering
-- PENDING transactions get priority 2, all others get priority 1 (for DESC ordering)
alter table wallet.transactions 
add column state_sort_order integer generated always as (
  case when state = 'PENDING' then 2 else 1 end
) stored;

-- Primary index for the transaction list query using the computed column
-- This composite index efficiently handles the DESC ordering with PENDING transactions first
create index idx_user_filtered_state_ordered
on wallet.transactions (
  user_id, 
  state_sort_order desc,
  created_at desc, 
  id desc
) 
where state in ('PENDING', 'COMPLETED', 'REVERSED');

-- Function to list user transactions with pagination
create or replace function wallet.list_transactions(
  p_user_id uuid,
  p_cursor_state_sort_order integer default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_page_size integer default 25
)
returns setof wallet.transactions
language plpgsql
stable
security definer
as $$
begin
  -- Check if cursor data is provided
  if p_cursor_created_at is null then
    -- Initial page load (no cursor)
    return query
    select t.*
    from wallet.transactions t
    where t.user_id = p_user_id
      and t.state in ('PENDING', 'COMPLETED', 'REVERSED')
    order by t.state_sort_order desc, t.created_at desc, t.id desc
    limit p_page_size;
  else
    -- Subsequent pages (with cursor)
    return query
    select t.*
    from wallet.transactions t
    where t.user_id = p_user_id
      and t.state in ('PENDING', 'COMPLETED', 'REVERSED')
      and (t.state_sort_order, t.created_at, t.id) < (
        p_cursor_state_sort_order,
        p_cursor_created_at,
        p_cursor_id
      )
    order by t.state_sort_order desc, t.created_at desc, t.id desc
    limit p_page_size;
  end if;
end;
$$;