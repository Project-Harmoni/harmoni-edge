/**
* This migration includes functions to bulk edit the pricing of:
* - album
* - tracks
* Ids of songs and albums are giving as parameters as well as
* the new pricing amount, then the corresponding DB rows are 
* updated with the new value
*/

-- helper function to check if track id is valid
-- return 1 as success
create or replace function public.check_track_id (
    track_id bigint
) returns int
as $$
declare
    check_id bigint;
begin
    check_id := ( select song_id from songs where ( song_id = track_id));
    -- check if track exists before updating
    if check_id is null
        then raise exception 'Invalid song id';
    end if;
    return 1;
end;
$$ language plpgsql;


-- edit a single track pricing
create or replace function public.edit_track_pricing (
    track_id bigint,
    new_payout_threshold int,
    new_payout_percentage int,
    new_is_free boolean
) returns bigint
as $$
declare
    check_id bigint;
begin
    check_id = public.check_track_id(track_id);
    update songs set payout_threshold = new_payout_threshold, 
        payout_percent = new_payout_percentage,
        is_free = new_is_free 
    where song_id = track_id;
    return 1;
end;
$$ language plpgsql;


/**
* Function to buld edit tracks pricing
* loop through the array of track id to update
*
* Input:
*   - array of id tracks
*   - new_payout_threshold
*   - new_payout_percentage
*
* Output:
*   - return 1 as success
*/
create or replace function public.bulk_edit_track_pricing (
    tracks_id bigint[],
    new_payout_threshold int,
    new_payout_percentage int,
    new_is_free boolean
) returns bigint
as $$
declare
    track int;
    update_track int;
begin
    foreach track in array tracks_id
    loop
        update_track = public.edit_track_pricing(
            track,
            new_payout_threshold,
            new_payout_percentage,
            new_is_free
        );
    end loop;
    return 1;
end;
$$ language plpgsql;
