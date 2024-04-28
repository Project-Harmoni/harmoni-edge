/**
* This migration includes functions to retrieve the 30 most streams track for one listener
* Id of the listener is provided as parameter 
*/

-- helper function to check if listener id is valid
-- return 1 as success
-- input:
--      - user_id uuid
-- output:
--      - integer ( 1 for success )
-- listner can be an artist as well as a listener
create or replace function public.check_listener_id (
    param_listener_id uuid
) returns int
as $$
declare
    mylistener_id uuid;
begin
    mylistener_id := ( select user_id from users where ( user_id = param_listener_id));
    -- check if listener exists before updating
    if mylistener_id is null
        then raise exception 'Invalid listener id';
    end if;
    return 1;
end;
$$ language plpgsql;


-- retrieve the most 30 tracks stream by this listener
-- uses the listener id and stend back a list of tracks
-- input:
--      - user_id uuid
-- output:
--      - table of songs id
-- ) returns int
create or replace function public.top30_most_stream (
    param_listener_id uuid
) returns TABLE ( list_song_id bigint )
as $$
declare
begin
    return query
    select song_id from listener_song_stream 
    where listener_id = param_listener_id 
    order by counter_streams desc limit 30 ;
end;
$$ language plpgsql;
