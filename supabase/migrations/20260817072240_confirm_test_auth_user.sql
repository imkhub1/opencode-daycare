update auth.users
set
  email_confirmed_at = now(),
  updated_at = now()
where email = 'demo-user@example.invalid'
  and email_confirmed_at is null;
