-- query to create the whole user table
create table
users (
    user_id uuid not null references auth.users on delete cascade,    
    user_name text,
    user_type text, -- artist, listener
    public_key text, -- related to wallet info
    private_key text, --guessing that would be hash for protection correct?
    is_admin boolean default false,
    created_at timestamptz default now(),

    primary key (user_id)
)