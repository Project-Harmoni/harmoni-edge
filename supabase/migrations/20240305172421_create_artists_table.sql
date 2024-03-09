-- Query to create Artists table which has relation with
-- album, artistGroup, song and users tables
create table
artists (
	artist_id uuid not null references users on delete cascade,
	artist_name text,
	formation_date date,
	disbandment_date date,
	image_path text, -- store the image of the band
	social_media_link text, -- display their social on the page
	biography text,
	genre text, -- just a field for the artist to descrive their music
	tokens bigint,
	created_at timestamptz default now(),

	primary key (artist_id)
);

