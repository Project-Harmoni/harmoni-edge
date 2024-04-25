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
$$ language plpgsql;

/**
* Function to bulk delete tracks
* loop through the array of track id to update
*
* Input:
*   - array of id tracks
*
* Output:
*   - return 1 as success
*/
create or replace function public.bulk_delete_tracks (
    tracks_id bigint[]
) returns int
as $$
declare
    track int;
    delete_track int;
begin
    -- update the pricing accordingly
    foreach track in array tracks_id
    loop
        delete_track = public.delete_tracks(
            track
        );
    end loop;
    return 1;
end;
$$ language plpgsql;

/**
* Function to bulk delete albums
* loop through the array of albums id to update
*
* Input:
*   - array of id albums
*
* Output:
*   - return 1 as success
*/
create or replace function public.bulk_delete_albums (
    albums_id bigint[]
) returns int
as $$
declare
    album int;
    delete_album int;
begin
    -- update the pricing accordingly
    foreach album in array albums_id
    loop
        delete_album = public.delete_album(
            album
        );
    end loop;
    return 1;
end;
$$ language plpgsql;