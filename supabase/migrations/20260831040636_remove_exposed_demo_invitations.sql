do $cleanup$
declare
  target_user_ids uuid[];
  invitation_count integer;
begin
  select array_agg(id order by id)
  into target_user_ids
  from auth.users
  where md5(lower(email)) = '23a4913a3041a2d0e72531933c86f557';

  -- Fresh environments do not contain the retired demo account.
  if target_user_ids is null then
    return;
  end if;

  if cardinality(target_user_ids) <> 1 then
    raise exception 'Expected exactly one retired demo account';
  end if;

  select count(*)::integer
  into invitation_count
  from public.invitations
  where invited_by = target_user_ids[1];

  if invitation_count <> 3 then
    raise exception 'Expected exactly three retired demo invitations, found %', invitation_count;
  end if;

  delete from public.invitations
  where invited_by = target_user_ids[1];
end;
$cleanup$;