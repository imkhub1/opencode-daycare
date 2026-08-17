update auth.users
set
  email_confirmed_at = now(),
  updated_at = now()
where email = 'kevin@google.com'
  and email_confirmed_at is null;
