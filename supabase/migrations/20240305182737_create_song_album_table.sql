-- Query to create song album table in relation
-- with albums and songs tables
create table
song_album (
    song_id bigint references songs,
    album_id bigint references albums,
    created_at timestamptz default now()
)