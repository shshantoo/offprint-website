-- ==============================================================================
-- MIGRATION 05: ADMIN CREDENTIAL UPDATE, USERNAME LOOKUP & INITIAL PROVISIONING RPCS
-- ==============================================================================

-- 1. Atomic Admin Username & Credential-Change Completion RPC
-- Callable only by an authenticated administrator updating their own profile.
create or replace function public.complete_admin_credential_update(
  p_new_username text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clean_username text := btrim(coalesce(p_new_username, ''));
  v_existing_id uuid;
  v_updated public.profiles;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'UNAUTHORIZED: Only an authenticated administrator can update admin credentials.';
  end if;

  if v_clean_username !~ '^[a-zA-Z0-9_.-]{3,32}$' then
    raise exception 'INVALID_USERNAME: Username must be 3–32 characters and contain only letters, numbers, dots, hyphens, or underscores.';
  end if;

  -- Case-insensitive uniqueness check across all profiles
  select id into v_existing_id
  from public.profiles
  where lower(btrim(username)) = lower(v_clean_username)
    and id <> v_uid
  limit 1;

  if v_existing_id is not null then
    raise exception 'USERNAME_TAKEN: This username is already in use. Please choose a different username.';
  end if;

  update public.profiles
  set
    username = v_clean_username,
    must_change_credentials = false,
    credentials_changed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  where id = v_uid
  returning * into v_updated;

  if not found then
    raise exception 'PROFILE_NOT_FOUND: Administrator profile record not found.';
  end if;

  return v_updated;
end;
$$;

revoke execute on function public.complete_admin_credential_update(text) from public, anon;
grant execute on function public.complete_admin_credential_update(text) to authenticated;

-- 2. Server-side Admin Username-to-Email Resolution RPC
-- Used only by the server-side login endpoint before verifying the password via Supabase Auth.
create or replace function public.resolve_admin_username_email(
  p_username text
)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_clean text := lower(btrim(coalesce(p_username, '')));
  v_email text;
begin
  if v_clean = '' or v_clean !~ '^[a-z0-9_.-]{3,32}$' then
    return null;
  end if;

  select email into v_email
  from public.profiles
  where lower(btrim(username)) = v_clean
    and role = 'admin'
  limit 1;

  return v_email;
end;
$$;

-- 3. One-time Initial Administrator Provisioning Helper (for SQL Editor / MCP admin use)
create or replace function public.provision_initial_admin(
  p_email text,
  p_initial_username text default 'admin'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_profile public.profiles;
  v_clean_username text := btrim(coalesce(p_initial_username, 'admin'));
begin
  -- Block execution from untrusted anon/authenticated PostgREST calls unless caller is already an admin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'FORBIDDEN: Only database administrators may provision admin accounts.';
  end if;

  select id, email into v_user
  from auth.users
  where lower(email) = lower(btrim(p_email))
  limit 1;

  if not found then
    raise exception 'USER_NOT_FOUND: No user in auth.users with email %. Sign up first at /client-portal or create the user in Supabase Auth.', p_email;
  end if;

  insert into public.profiles (
    id,
    email,
    username,
    role,
    must_change_credentials,
    credentials_changed_at,
    updated_at
  )
  values (
    v_user.id,
    v_user.email,
    v_clean_username,
    'admin',
    true,
    null,
    timezone('utc'::text, now())
  )
  on conflict (id) do update
  set
    role = 'admin',
    username = coalesce(public.profiles.username, excluded.username),
    must_change_credentials = case
      when public.profiles.credentials_changed_at is null then true
      else public.profiles.must_change_credentials
    end,
    updated_at = timezone('utc'::text, now())
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke execute on function public.provision_initial_admin(text, text) from public, anon, authenticated;

-- 4. Harden Admin Username Resolution against Public Enumeration
revoke execute on function public.resolve_admin_username_email(text) from public, anon, authenticated;
grant execute on function public.resolve_admin_username_email(text) to service_role;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

create or replace function public.verify_admin_username_login(
  p_username text,
  p_password text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
stable
as $$
declare
  v_clean text := lower(btrim(coalesce(p_username, '')));
  v_email text := null;
  v_enc_pw text := null;
  v_dummy_hash constant text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
begin
  if v_clean = '' or p_password is null or btrim(p_password) = '' or v_clean !~ '^[a-z0-9_.-]{3,32}$' then
    perform extensions.crypt(coalesce(p_password, ''), v_dummy_hash);
    return null;
  end if;

  select p.email, u.encrypted_password
  into v_email, v_enc_pw
  from public.profiles p
  join auth.users u on u.id = p.id
  where (lower(btrim(p.username)) = v_clean or (v_clean = 'admin' and p.role = 'admin'))
    and p.role = 'admin'
  limit 1;

  if not found or v_enc_pw is null or v_enc_pw = '' then
    perform extensions.crypt(p_password, v_dummy_hash);
    return null;
  end if;

  if extensions.crypt(p_password, v_enc_pw) = v_enc_pw then
    return v_email;
  end if;

  return null;
end;
$$;

grant execute on function public.verify_admin_username_login(text, text) to anon, authenticated, service_role;
