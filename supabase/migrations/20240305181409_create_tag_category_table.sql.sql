-- Query to create the tag cat table
create table
tag_category (
	category_id bigint primary key generated always as identity,
	category_name text,
	created_at timestamptz default now()
);
