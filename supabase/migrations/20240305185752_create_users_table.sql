-- query to create the whole user table
create table
users (
    user_id bigint primary key generated always as identity,
    user_name text,
    login_info text, -- should get it from auth?
    user_type text, -- artist, listener or moderator
    public_key text, -- related to wallet info
    private_key text, --guessing that would be hash for protection correct?
    created_at timestamptz default now()
)