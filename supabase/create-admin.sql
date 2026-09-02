-- 1. First create the admin in Supabase Dashboard → Authentication → Users.
-- 2. Copy that user's UUID and replace the two placeholders below.
-- 3. Run this statement in the SQL Editor.

insert into public.admin_profiles (user_id, email, role)
values ('REPLACE_WITH_AUTH_USER_UUID', 'REPLACE_WITH_ADMIN_EMAIL', 'admin')
on conflict (user_id) do update
set email = excluded.email,
    role = excluded.role;
