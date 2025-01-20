create policy "Enable CRUD for accounts based on user_id"
on "wallet"."accounts"
as permissive
for all
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Enable update for users based on email"
on "wallet"."users"
as permissive
for all
to authenticated
using ((( SELECT auth.uid() AS uid) = id))
with check ((( SELECT auth.uid() AS uid) = id));



