/**
* This migration includes functions to allow admins to edit tag names etc...
* Id of the listener is provided as parameter 
*/

-- helper function to check if user_id is valid and allowed to be an admin
-- return 1 as success
create or replace function public.check_admin_id (
    param_user_id uuid
) returns int
as $$
declare
    myuser_id uuid;
begin
    myuser_id := ( select user_id from users where user_id = param_user_id and is_admin = 'true' );
    -- check if admin exists before updating
    if myuser_id is null
        then raise exception 'Invalid admin id';
    end if;
    return 1;
end;
$$ language plpgsql;    

-- function to edit the name of flagged tracks
-- take the song_id and the user_id who wants to delete 
-- check that the user_id is an admin
create or replace function public.edit_track (
    param_track_id bigint,
    param_track_name text
) returns int
as $$
declare
    mytrack_id bigint;
begin
    mytrack_id = public.check_track_id(param_track_id);
    update songs set song_name = param_track_name 
    where song_id = param_track_id;
    return 1;
end;
$$ language plpgsql;
