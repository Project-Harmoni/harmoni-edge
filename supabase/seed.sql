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

-- Create a 2nd listener user
DO $$
DECLARE 
    user_id uuid;
BEGIN
    user_id := public.create_seed_user('listener2@gmail.com','listenerpassword');
    INSERT INTO public.users
        (user_id, user_name, user_type)
    VALUES
        (user_id, 'listener-user', 'listener');
    INSERT INTO public.listeners
        (listener_id, listener_name, email, tokens)
    VALUES
        (user_id, 'listener-user','listener@gmail.com',0);
END $$;

-- Create a 3rd listener user
DO $$
DECLARE 
    user_id uuid;
BEGIN
    user_id := public.create_seed_user('listener3@gmail.com','listenerpassword');
    INSERT INTO public.users
        (user_id, user_name, user_type)
    VALUES
        (user_id, 'listener-user', 'listener');
    INSERT INTO public.listeners
        (listener_id, listener_name, email, tokens)
    VALUES
        (user_id, 'listener-user','listener@gmail.com',0);
END $$;

-- create an album
DO $$
DECLARE
    artist_id_fk uuid;
BEGIN
    artist_id_fk := ( SELECT artist_id FROM artists WHERE ( artist_name = 'artist-user'));
    INSERT INTO public.albums (
        album_name,
        artist_id,
        cover_path,
        genre,
        year_released,
        total_tracks,
        record_label,
        duration
        )
    VALUES (
        'album_1',
        artist_id_fk,
        'link.com/dkjf/',
        'blabla',
        '2024-03-03',
        10,
        'white label',
        65
    ),
    (
        'album_2',
        artist_id_fk,
        'link.com/dkjf/',
        'blablafdkjfkds',
        '2024-04-03',
        10,
        'white label',
        65
    );
END $$;

--TODO: add seed data for songs and other tables using 
--the artist and listener IDs
DO $$
DECLARE
    artist_id_fk uuid;
    album_id_fk bigint;
    album_id_fk_2 bigint;
BEGIN
    artist_id_fk := ( SELECT artist_id FROM artists WHERE ( artist_name = 'artist-user'));
    album_id_fk := ( SELECT album_id FROM albums WHERE ( artist_id = artist_id_fk AND album_name = 'album_1'));
    album_id_fk_2 := ( SELECT album_id FROM albums WHERE ( artist_id = artist_id_fk AND album_name = 'album_2'));
    INSERT INTO public.songs (album_id,
        artist_id,
        cover_image_path,
        is_explicit,
        payout_threshold,
        payout_percent,
        song_file_path,
        song_name,
        stream_count,
        ordinal)
    VALUES (
        album_id_fk,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        10,
        0.5,
        'link/song.mp3',
        'nice_m4',
        0,
        1
    ),
    (
        album_id_fk,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        10,
        0.5,
        'link/song_2.mp3',
        'nice_m4_2',
        0,
        2
    ),
    (
        album_id_fk,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        10,
        0.5,
        'link/song_3.mp3',
        'nice_m4_3',
        0,
        3
    ),
    (
        album_id_fk_2,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        10,
        0.5,
        'link/song.mp3',
        'nice_m4',
        0,
        1
    ),
    (
        album_id_fk_2,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        10,
        0.5,
        'link/song_2.mp3',
        'nice_m4_2',
        0,
        2
    ),
    (
        album_id_fk_2,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        10,
        0.5,
        'link/song_3.mp3',
        'nice_m4_3',
        0,
        3
    );
END $$;

-- We need tag categories, seed them here
INSERT INTO public.tag_category (category_name)
    VALUES ('genres'),('instruments'),('moods'),('uncategorized');

DO $$
DECLARE
    tag_id_fk bigint;
    tag_count bigint;
BEGIN
-- add tags to songs, exercising the add_song_tag and add_many_song_tags functions
    tag_id_fk := public.add_song_tag(
        public.get_song_id('nice_m4'),
        'funky-genre',
        public.get_tag_category_id('genres')
    );
    tag_id_fk := public.add_song_tag(
        public.get_song_id('nice_m4_3'),
        'funky-genre',
        public.get_tag_category_id('genres')
    );
    tag_id_fk := public.add_song_tag(
        public.get_song_id('nice_m4'), 
        'happy',
        public.get_tag_category_id('moods')
    );
    tag_id_fk := public.add_song_tag(
        public.get_song_id('nice_m4_3'), 
        'somber',
        public.get_tag_category_id('moods')
    );
    tag_count = public.add_many_song_tags(
        1,
        ARRAY['voice','piano','violin'],
        public.get_tag_category_id('instruments')
    );
    tag_count = public.add_many_song_tags(
        2,
        ARRAY['voice','piano'],
        public.get_tag_category_id('instruments')
    );
END $$;
