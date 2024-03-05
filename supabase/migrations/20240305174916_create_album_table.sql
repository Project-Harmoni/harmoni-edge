-- Query to create albums table with relation to 
-- artists and songAlbum tables

create table
albums (
	album_id bigint primary key generated always as identity,
	album_name text,
	artist_id bigint references artists,
	cover_path text,
	genre text, -- maybe should be referenced to tags??
	year_released Date,
	total_tracks bigint,
	record_label text,
	duration bigint,
	created_at timestamptz default now()
);
