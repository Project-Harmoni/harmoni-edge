-- Query to create the table to keep track of what listener streamed
create table
listener_song_stream (
    listener_id bigint references listeners,
    song_id bigint references songs,
    counter_streams bigint,
    created_at timestamptz default now()
)