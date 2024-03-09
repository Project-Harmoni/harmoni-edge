-- Query to create listeners table 
create table
listeners (
	listener_id uuid not null references users on delete cascade,
	listener_name text,
	email text,
	image_path text, -- user profile image maybe?
	tokens bigint, -- wallet, tokens to decide later
	created_at timestamptz default now(),

	primary key (listener_id)
);

