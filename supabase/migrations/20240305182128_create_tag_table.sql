-- query to creat the tag table in relation
-- with the tag_category table
create table
tags (
    tag_id bigint primary key generated always as identity,
    tag_name text,
    tag_category_id bigint references tag_category,
    created_at timestamptz default now()
)