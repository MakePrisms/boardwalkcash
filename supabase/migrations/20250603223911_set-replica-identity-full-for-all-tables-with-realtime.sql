-- solves realtime update problems with PostgreSQL's TOAST and replication settings where we get updates missing large calumns
alter table wallet.accounts replica identity full;
alter table wallet.cashu_receive_quotes replica identity full;
alter table wallet.cashu_send_quotes replica identity full;
alter table wallet.cashu_send_swaps replica identity full;
alter table wallet.cashu_token_swaps replica identity full;
alter table wallet.contacts replica identity full;
alter table wallet.transactions replica identity full;