/** 
* This migration includes two functions to support
* tagging in song uploads:
*
*   - add_song_tag
*   - add_many_song_tags
*
* As well as two short convenience functions:
*
*   - get_tag_category_id
*   - get_song_id
*
* which get IDs from names. The latter are just used
* in the seeding script right now, but included here
* (for now) in case they prove useful later.
*/

/** 
 * Function that adds a tag to a song. Adds to or updates
 * both the tag table and the relation table of song tags
 * as appropriate.
 *
 * Input:
 *   tagged_song_id := ID of the song to be tagged
 *   new_tag_name := the tag name (e.g., 'happy' or 'funky')
 *   new_tag_category_id := ID of the tag's category (e.g., ID for 'genres' or 'moods')
 *
 * Output:
 *   new_tag_id := the bigint ID corresponding to the tag name
*/
create or replace function public.add_song_tag(
    tagged_song_id bigint,
    new_tag_name text,
    new_tag_category_id bigint
) returns bigint as $$
declare
    new_tag_id bigint;
begin
    -- Basic input validation
    if tagged_song_id is null
        then raise exception 'song ID should not be NULL';
    end if;
    if new_tag_name is null
        then raise exception 'new tag name should not be NULL';
    end if;
    if new_tag_category_id is null
        then raise exception 'new tag category should not be NULL';
    end if;

    -- Check that the ID for the song is valid (song exists).
    if not exists (
        select 1 from public.songs 
        where song_id = tagged_song_id
    )
        then raise exception 'song not found';
    end if;

    -- Check that the tag category exists.
    if not exists (
        select 1 from public.tag_category 
        where category_id = new_tag_category_id
    )
        then raise exception 'category does not exist';
    end if;

    -- Now see if the tag itself already exists, and if so, retrieve its ID.
    select tag_id into new_tag_id from public.tags
        where tag_name = new_tag_name 
        and tag_category_id = new_tag_category_id;
    -- If tag does not yet exist, add it to the tag table.
    if new_tag_id is null then
        insert into public.tags 
            (tag_name,tag_category_id)
        values
            (new_tag_name, new_tag_category_id)
        returning tag_id into new_tag_id;
    end if;

    -- Check that this song-tag association doesn't already exist.
    -- If it doesn't, add it to the tag table.
    if not exists (
        select 1 from public.song_tag
        where song_id = tagged_song_id 
        and tag_id = new_tag_id
    )
        then insert into public.song_tag
                (tag_id, song_id)
            values (new_tag_id, tagged_song_id);
    end if;
    return new_tag_id;
end;
$$ language plpgsql;

/**
 * Function that, given an array of tag names,
 * a category ID they all belong to, and a song ID they
 * should all be associated with, enters all new
 * tags and tag relationships into the database.
 *
 * Input:
 *   tagged_song_id = ID of song to tag
 *   new_tag_names = 1D array of text strings. Each string is a tag.
 *   new_tag_category_id = ID of the tag category
 *
 * Output:
 *   count of tags processed (bigint)
 */
create or replace function public.add_many_song_tags(
    tagged_song_id bigint,
    new_tag_names text[],
    new_tag_category_id bigint
) returns bigint as $$
declare
    tag_count bigint;
    tag_id bigint;
    tag text;
begin
    tag_count = 0;
    foreach tag in array new_tag_names loop
        tag_id = public.add_song_tag(tagged_song_id,tag,new_tag_category_id);
        tag_count = tag_count + 1;
    end loop;
    return tag_count;
end;
$$ language plpgsql;

-- convenience function: acquires a tag category's ID based on category name
create or replace function public.get_tag_category_id(
    tag_category_name text
)
returns bigint as $$
    declare
    id bigint;
begin
    select category_id into id from public.tag_category
    where category_name = tag_category_name;
    if id is null
        then raise exception 'category not found';
    end if;
    return id;
end;
$$ language plpgsql;

-- convenience function: acquires a song's ID based on song name
create or replace function public.get_song_id(
   requested_song_name text
)
returns bigint as $$
    declare
    id bigint;
begin
    select song_id into id from public.songs
    where song_name = requested_song_name;
    if id is null
        then raise exception 'song not found';
    end if;
    return id;
end;
$$ language plpgsql;
