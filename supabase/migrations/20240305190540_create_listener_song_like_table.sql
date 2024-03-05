-- Query to create the table to keep track of which song listeners like
create table
listener_song_likes (
    listener_id bigint references listeners,
    song_id bigint references songs,
    like_song boolean,
    created_at timestamptz default now()
)