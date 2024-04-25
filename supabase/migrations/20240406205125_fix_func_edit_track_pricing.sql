/**
* Adjusted to use artist_payout_percentage
* instead of the removed column payout_percent
*/
create or replace function public.edit_track_pricing (
    track_id bigint,
    new_payout_threshold int,
    new_payout_percentage int,
    new_is_free boolean
) returns int
as $$
declare
    check_id bigint;
begin
    check_id = public.check_track_id(track_id);
    update songs set payout_threshold = new_payout_threshold, 
        artist_payout_percentage = new_payout_percentage,
        is_free = new_is_free 
    where song_id = track_id;
    return 1;
end;
$$ language plpgsql;