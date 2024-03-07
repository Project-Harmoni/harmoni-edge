-- SQL query to songs table (might need more columns)
create table
songs(
    song_id bigint primary key generated always as identity,
    album_name text,
    artist_id bigint references artists,
    cover_image_path text,
    is_explicit boolean default false,
    song_file_path text,
    song_name text,
    stream_count bigint default 0,
    created_at timestamptz default now()
);
