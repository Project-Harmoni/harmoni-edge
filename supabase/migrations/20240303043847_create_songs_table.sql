--this is just a filler table for now
create table
songs(
    id bigint primary key generated always as identity,
    album_name text,
    artist_name text,
    artist_id bigint,
    cover_image_path text,
    created_at timestamptz default now(),
    is_explicit boolean default false,
    song_file_path text,
    song_name text,
    stream_count bigint default 0
);
