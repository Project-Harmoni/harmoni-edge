/**
* Functions to support listener library updates, including:
*   - checking if a library entry exists
*   - adding library entries
*   - deleting library entries
*/

/**
* Helper function that checks if a library entry exists already.
* Also performs basic input validation (throws error if input invalid).
*
* Input:
*   - lib_listener_id
*   - lib_song_id
*
* Output:
*   - boolean true or false
*/
create or replace function public.lib_entry_exists(
    lib_listener_id uuid,
    lib_song_id bigint
)
returns boolean as $$
begin
    if lib_listener_id is null
        then raise exception 'listener ID should not be NULL';
    end if;
    if lib_song_id is null
        then raise exception 'song ID should not be NULL';
    end if;
    if exists (
        select 1 from public.listener_song_library
        where song_id = lib_song_id
        and listener_id = lib_listener_id
    )
    then
        return true;
    end if;
    return false;
end;
$$ language plpgsql;

/**
* Function to add a single song to a listener's library.
*
* Input:
*   - lib_listener_id
*   - lib_song_id
*
* Output:
*   - returns 1 if added, 0 if it was already in the library
*/
create or replace function public.add_library_song(
    lib_listener_id uuid,
    lib_song_id bigint
) 
returns int as $$
declare
    added int;
begin
    added := 0;
    -- Check if library entry already exists. If not, add it
    if not lib_entry_exists(lib_listener_id, lib_song_id)
    then
        insert into public.listener_song_library
            (listener_id,song_id)
        values
            (lib_listener_id,lib_song_id);
        added = 1;
    end if;
    return added;
end;
$$ language plpgsql;

/**
* Function to delete a single song from a listener's library.
*
* Input:
*   - lib_listener_id
*   - lib_song_id
*
* Output:
*   - returns 1 if deleted, 0 if it wasn't in the library
*/
create or replace function public.delete_library_song(
    lib_listener_id uuid,
    lib_song_id bigint
) 
returns int as $$
declare
    deleted int;
begin
    deleted := 0;
    if lib_entry_exists(lib_listener_id, lib_song_id)
    then
        delete from listener_song_library
            where song_id = lib_song_id
            and listener_id = lib_listener_id;
        deleted = 1;
    end if;
    return deleted;
end;
$$ language plpgsql;


/**
* Function to add all songs from an album to the user's library.
*
* Input:
*   - lib_listener_id
*   - lib_album_id
*
* Output:
*   - Returns the count of songs added.
*/
create or replace function public.add_library_album(
    lib_listener_id uuid,
    lib_album_id bigint
)
returns int as $$
declare
    added int;
    track bigint;
begin
    added := 0;
    if lib_listener_id is null
        then raise exception 'listener ID should not be NULL';
    end if;
    if lib_album_id is null
        then raise exception 'album ID should not be NULL';
    end if;
    for track in select song_id from song_album where album_id = lib_album_id
    loop
        if track is null
            then exit;
        end if;
        added = added + add_library_song(lib_listener_id, track);
    end loop;
    return added;
end;
$$ language plpgsql;


/**
* Function to remove an entire album's songs from a library.
*
* Input:
*   - lib_listener_id
*   - lib_album_id
*
* Output:
*   - Returns the count of entries deleted.
*/
create or replace function public.delete_library_album(
    lib_listener_id uuid,
    lib_album_id bigint
)
returns int as $$
declare
    deleted int;
    track bigint;
begin
    deleted := 0;
    if lib_listener_id is null
        then raise exception 'listener ID should not be NULL';
    end if;
    if lib_album_id is null
        then raise exception 'album ID should not be NULL';
    end if;
    for track in select song_id from song_album where album_id = lib_album_id
    loop
        if track is null
            then exit;
        end if;
        deleted = deleted + delete_library_song(lib_listener_id, track);
    end loop;
    return deleted;
end;
$$ language plpgsql;