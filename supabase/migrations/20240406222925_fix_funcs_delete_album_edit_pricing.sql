set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_album(del_id bigint)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
declare
    check_id bigint;
    track int;
    track_del bigint;
begin 
    check_id := ( select album_id from albums where ( album_id = del_id ));
    -- check if album id exists
    if check_id is null
        then raise exception 'Invalid album id';
    end if;
    -- loop through the tracks in the album to delete each single one
    for track in select song_id from song_album where album_id = del_id
    loop
        -- check if there is tracks in the album, if null then exit loop
        if track is null
            then exit;
        end if;
        track_del = public.delete_tracks(track);
    end loop;
    -- when all tracks have been deleted then delete the album row from the album table
    delete from albums where album_id = del_id;
    return 1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.edit_album_pricing(edit_album_id bigint, new_payout_threshold integer, new_payout_percentage integer, new_is_free boolean)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
    check_id bigint;
    track int;
    edit_track int;
begin
    -- first check if the album id exists
    check_id := ( select album_id from albums where album_id = edit_album_id );
    if check_id is null 
        then raise exception 'Invalid album id';
    end if;
    for track in select song_id from song_album where album_id = edit_album_id
    loop
        if track is null
            then raise exception 'there is no track in this album';
        end if;
        edit_track = public.edit_track_pricing ( 
            track,
            new_payout_threshold,
            new_payout_percentage,
            new_is_free 
        );
        end loop;
    return 1;
end;
$function$
;


