-- Query to create the group table
create table
groups (
    group_id bigint primary key generated always as identity,
    group_name text,
    group_image_path text,
    formation_date Date,
    disbandment_date Date,
    genre text,
    social_media_link text,
    biography text,
    total_album bigint,
    created_at timestamptz default now()
)