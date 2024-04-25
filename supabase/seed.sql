--Simple seed data for local tests.

-- Function for generating test users.
-- For auth.users, borrowed the seeding solution from 
-- https://github.com/orgs/supabase/discussions/5043#discussioncomment-6191165
CREATE OR REPLACE FUNCTION public.create_seed_user(
    email text,
    password text,
    seed_name text,
    seed_type text
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
    INSERT INTO public.users
        (user_id, user_name, user_type)
    VALUES
        (user_id, seed_name, seed_type);
    IF seed_type = 'artist' THEN 
        INSERT INTO public.artists
            (artist_id, artist_name)
        VALUES
            (user_id, seed_name);
    END IF;
    IF seed_type = 'listener' THEN
        INSERT INTO public.listeners
            (listener_id, listener_name)
        VALUES
            (user_id, seed_name);
    END IF;
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Function for quickly getting user ID from name.
-- For use with seeding later on.
CREATE OR REPLACE FUNCTION public.get_user_from_name(
    username text
)
RETURNS uuid AS $$
    declare
    user_id uuid;
BEGIN
    SELECT into user_id user_id FROM users WHERE ( user_name = username);
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;


-- Create users: one artist and three listeners
DO $$
DECLARE
    user_id uuid;
BEGIN
    user_id := public.create_seed_user(
        'artist@gmail.com',
        'artistpassword',
        'artist-user',
        'artist'
    );
    user_id := public.create_seed_user(
        'listener@gmail.com',
        'listenerpassword',
        'listener-user',
        'listener'
    );
    user_id := public.create_seed_user(
        'listener2@gmail.com',
        'listener2password',
        'listener2-user',
        'listener'
    );
    user_id := public.create_seed_user(
        'listener3@gmail.com',
        'listener3password',
        'listener3-user',
        'listener'
    );
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



DO $$
DECLARE
    artist_id_fk uuid;
    album_id_fk bigint;
    album_id_fk_2 bigint;
    album_test_name text;
    album_test_name_2 text;
BEGIN
    artist_id_fk := ( SELECT artist_id FROM artists WHERE ( artist_name = 'artist-user'));
    album_test_name := 'album_1';
    album_test_name_2 := 'album_2';
    album_id_fk := ( SELECT album_id FROM albums WHERE ( artist_id = artist_id_fk AND album_name = 'album_1'));
    album_id_fk_2 := ( SELECT album_id FROM albums WHERE ( artist_id = artist_id_fk AND album_name = 'album_2'));
    INSERT INTO public.songs (album_name,
        artist_id,
        cover_image_path,
        is_explicit,
        song_file_path,
        song_name,
        stream_count,
        ordinal)
    VALUES (
        album_test_name,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        'link/song.mp3',
        'nice_m4',
        0,
        1
    ),
    (
        album_test_name,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        'link/song_2.mp3',
        'nice_m4_2',
        0,
        2
    ),
    (
        album_test_name_2,
        artist_id_fk,
        'link.com/dkjf/',
        False,
        'link/song_3.mp3',
        'nice_m4_3',
        0,
        1
    );

    INSERT INTO public.song_album(song_id,album_id)
    VALUES (
        public.get_song_id('nice_m4'),
        album_id_fk
    ),
    (
        public.get_song_id('nice_m4_2'),
        album_id_fk
    ),
    (
        public.get_song_id('nice_m4_3'),
        album_id_fk_2
    );
END $$;


DO $$
DECLARE
    tag_id_fk bigint;
    tag_count bigint;
BEGIN
-- add tags to songs, exercising the add_song_tag and add_many_song_tags functions
    tag_id_fk := public.add_song_tag(
        public.get_song_id('nice_m4'),
        'funky-genre',
        public.get_tag_category_id('Genres')
    );
    tag_id_fk := public.add_song_tag(
        public.get_song_id('nice_m4_3'),
        'funky-genre',
        public.get_tag_category_id('Genres')
    );
    tag_id_fk := public.add_song_tag(
        public.get_song_id('nice_m4'), 
        'happy',
        public.get_tag_category_id('Moods')
    );
    tag_id_fk := public.add_song_tag(
        public.get_song_id('nice_m4_3'), 
        'somber',
        public.get_tag_category_id('Moods')
    );
    tag_count = public.add_many_song_tags(
        1,
        ARRAY['voice','piano','violin'],
        public.get_tag_category_id('Instruments')
    );
    tag_count = public.add_many_song_tags(
        2,
        ARRAY['voice','piano'],
        public.get_tag_category_id('Instruments')
    );
END $$;

-- Exercise the library functions: add favorites by song and album
DO $$
DECLARE
    lib_listener_id uuid;
    lib_song_id bigint;
    lib_album_id bigint;
    temp int;
BEGIN
    lib_listener_id := ( SELECT listener_id FROM listeners WHERE ( listener_name = 'listener-user'));
    lib_song_id := public.get_song_id('nice_m4');
    lib_album_id := ( SELECT album_id FROM albums WHERE album_name = 'album_2');
    temp := public.add_library_song(lib_listener_id, lib_song_id);
    temp := public.add_library_album(lib_listener_id, lib_album_id);

    lib_listener_id := (SELECT listener_id FROM listeners WHERE ( listener_name = 'listener2-user'));
    lib_album_id := ( SELECT album_id FROM albums WHERE album_name = 'album_1');
    temp := public.add_library_album(lib_listener_id, lib_album_id);
    temp := public.delete_library_song(lib_listener_id,1);

END $$;


