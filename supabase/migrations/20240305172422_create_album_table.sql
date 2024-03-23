-- Query to create albums table with relation to 
-- artists and songAlbum tables

create table
albums (
	album_id bigint primary key generated always as identity,
	album_name text,
	artist_id uuid references artists,
	cover_path text,
	genre text, -- according to discussion maybe linked to tag system later, so should be just a text for artists?
	year_released Date,
	total_tracks bigint,
	record_label text,
	duration bigint,
	created_at timestamptz default now()
);
