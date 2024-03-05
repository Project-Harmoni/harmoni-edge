-- query to create the many to many with artists and group
create table
artist_group (
    artist_id bigint references artists,
    group_id bigint references groups,
    created_at timestamptz default now()
)