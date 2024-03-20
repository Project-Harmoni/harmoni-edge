/**
* This migrations includes 2 separate functions to delete tracks
* and albums from the DB
* The id of a song or an album is giving as a parameter
* After health checks the query to delete the song row is executed
*/

create or replace function public.delete_tracks (
    del_id bigint
) returns bigint
as $$
declare
    check_id bigint;
begin
    check_id := ( select song_id from songs where ( song_id = del_id ));
    -- check if id exists
    if check_id is null
        then raise exception 'Invalid song id';
    end if;
    -- to do add delete statement for storage file in music bucket
    -- delete from storage.music ....
    delete from songs where song_id = check_id;
    return 1;
end;
$$ language plpgsql;


/** 
* function to delete the whole album from the db after upload
* Calling delete_tracks(id) to delete each track 
* then delete the album row from the table 
*
* Input:
*   album_id = id of the album the artist wants to delete
*
* Output:
*   1 when success
*/
create or replace function public.delete_album (
    del_id bigint
) returns bigint
as $$
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
    for track in select song_id from songs where album_id = del_id
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
$$ language plpgsql;