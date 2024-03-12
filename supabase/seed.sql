--Simple seed data for local tests. In progress; we'll continue to add to this
--For auth.users, borrowed the seeding solution from 
--https://github.com/orgs/supabase/discussions/5043#discussioncomment-6191165
CREATE OR REPLACE FUNCTION public.create_seed_user(
    email text,
    password text
) RETURNS uuid AS $$
    declare
    user_id uuid;
    encrypted_pw text;
BEGIN
    user_id := gen_random_uuid();
    encrypted_pw := crypt(password, gen_salt('bf'));
  
    INSERT INTO auth.users
        (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES
        ('00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', email, encrypted_pw, '2023-05-03 19:41:43.585805+00', '2023-04-22 13:10:03.275387+00', '2023-04-22 13:10:31.458239+00', '{"provider":"email","providers":["email"]}', '{}', '2023-05-03 19:41:43.580424+00', '2023-05-03 19:41:43.585948+00', '', '', '', '');
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Create an artist-user
DO $$
DECLARE 
    user_id uuid;
BEGIN
    user_id := public.create_seed_user('artist@gmail.com','artistpassword');
    INSERT INTO public.users
        (user_id, user_name, user_type)
    VALUES
        (user_id, 'artist-user', 'artist');
    INSERT INTO public.artists
        (artist_id, artist_name, biography, tokens)
    VALUES
        (user_id,'artist-user','new zealand guitarist playing bass guitar',0);
END $$;


-- Create a listener user
DO $$
DECLARE 
    user_id uuid;
BEGIN
    user_id := public.create_seed_user('listener@gmail.com','listenerpassword');
    INSERT INTO public.users
        (user_id, user_name, user_type)
    VALUES
        (user_id, 'listener-user', 'listener');
    INSERT INTO public.listeners
        (listener_id, listener_name, email, tokens)
    VALUES
        (user_id, 'listener-user','listener@gmail.com',0);
END $$;

--TODO: add seed data for songs and other tables using 
--the artist and listener IDs
insert into public.songs (album_name,
        song_name,
        stream_count)
values
    ('test_album','Silly Song with Kittens',0),
    ('test_album','A Cappella Ice Cream',0),
    ('test_album','World Domination Aria',0);
