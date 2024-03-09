-- Query to create the song tag table in relation
-- with tag and song tables
create table
song_tag (
    song_id bigint references songs on delete cascade,
    tag_id bigint references tags on delete cascade,
    created_at timestamptz default now()
)