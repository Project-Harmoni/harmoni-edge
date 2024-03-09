-- Query to create song album table in relation
-- with albums and songs tables
create table
song_album (
    song_id bigint references songs on delete cascade,
    album_id bigint references albums on delete cascade,
    created_at timestamptz default now()
)