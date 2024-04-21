-- Query to create the table to keep track of which song listeners like
create table
listener_song_likes (
    listener_id uuid references listeners,
    song_id bigint references songs on delete cascade,
    created_at timestamptz default now()
)