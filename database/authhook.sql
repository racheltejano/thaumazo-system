create or replace function public.auth_custom_claims_hook(
  existing_claims jsonb
)
returns jsonb as $$
declare
  user_role text;
  extra_claims jsonb;
begin
  -- look up the user’s role from your profiles table
  select role
    into user_role
    from public.profiles
   where id = auth.uid();

  -- build the JSON object you want to merge into the JWT
  extra_claims = jsonb_build_object('user_role', user_role);

  -- merge your new claim into the existing payload
  return existing_claims || extra_claims;
end;
$$ language plpgsql
  security definer;   -- so RLS won’t block your lookup
