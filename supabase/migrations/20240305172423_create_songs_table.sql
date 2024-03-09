-- SQL query to songs table (might need more columns)
create table
songs(
    song_id bigint primary key generated always as identity,
    album_name text,
    artist_id uuid references artists,
    cover_image_path text,
    is_explicit boolean default false,
    payout_threshold int default 100,
    payout_percent int default 0,
    song_file_path text,
    song_name text,
    stream_count bigint default 0,
    created_at timestamptz default now()
);
--TODO: add constraints on payout threshold (needs minimum),
-- >0 on stream_count and payout_percent, etc.