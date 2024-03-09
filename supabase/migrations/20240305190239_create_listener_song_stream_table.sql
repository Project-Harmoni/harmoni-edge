-- Query to create the table to keep track of what listener streamed
create table
listener_song_stream (
    listener_id uuid references listeners on delete cascade,
    song_id bigint references songs on delete cascade,
    counter_streams bigint,
    created_at timestamptz default now()
)