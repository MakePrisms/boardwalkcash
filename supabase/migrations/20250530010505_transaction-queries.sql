-- Description:
-- This migration creates a computed column state_sort_order and database function to efficiently fetch user transactions
-- with PENDING transactions prioritized first (state_sort_order = 1), followed by other transactions (state_sort_order = 2),
-- all ordered by created_at DESC within their respective groups.
-- 
-- Affected Tables: wallet.transactions
-- Function: list_user_transactions_paginated
-- 
-- Performance Impact: 
-- - Single query approach reduces round trips
-- - Efficient cursor-based pagination
-- - Computed column simplifies ordering logic
-- - Optimized index for fast lookups
-- ========================================

-- Add computed column for state ordering
-- PENDING transactions get priority 1, all others get priority 2
alter table wallet.transactions 
add column state_sort_order integer generated always as (
  case when state = 'PENDING' then 1 else 2 end
) stored;

-- Primary index for the transaction list query using the computed column
-- This composite index efficiently handles the ordering with PENDING transactions first
create index idx_transactions_user_state_sort_order_created_at
on wallet.transactions (
  user_id, 
  state_sort_order,
  created_at desc, 
  id desc
) 
where state in ('PENDING', 'COMPLETED', 'REVERSED');

-- Function to list user transactions with PENDING-first pagination using computed column
create or replace function wallet.list_user_transactions_paginated(
  p_user_id uuid,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_page_size integer default 25
)
returns setof wallet.transactions
language sql
stable
security definer
as $$
  select t.*
  from wallet.transactions t
  where t.user_id = p_user_id
    and t.state in ('PENDING', 'COMPLETED', 'REVERSED')
    and (
      -- If no cursor provided, start from the beginning
      p_cursor_created_at is null
      or 
      -- tuple comparison using the computed state_sort_order column
      (t.state_sort_order, t.created_at, t.id) > (
        -- Get state_sort_order from cursor transaction
        (select state_sort_order from wallet.transactions 
         where id = p_cursor_id and user_id = p_user_id),
        p_cursor_created_at,
        p_cursor_id
      )
    )
  order by t.state_sort_order, t.created_at desc, t.id desc
  limit p_page_size;
$$; 
