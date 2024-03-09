-- query to create the many to many with artists and group
create table
artist_group (
    artist_id uuid references artists on delete cascade,
    group_id bigint references groups on delete cascade,
    created_at timestamptz default now()
)