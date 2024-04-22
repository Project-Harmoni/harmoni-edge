-- Query to create the tag category table
create table
tag_category (
	category_id bigint primary key generated always as identity,
	category_name text,
	created_at timestamptz default now()
);

-- Add tag categories that we created
insert into public.tag_category
    (category_name)
values
    ('Genres'),
	('Moods'),
	('Instruments'),
	('Miscellaneous');