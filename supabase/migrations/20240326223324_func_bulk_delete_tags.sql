/**
* This migration includes functions to bulk delete tags
* Ids of tag is provided as parameter then the corresponding DB rows are 
* updated with the new value
*/

-- helper function to check if tag id is valid
-- return 1 as success
create or replace function public.check_tag_id (
    param_tag_id bigint
) returns int
as $$
declare
    mytag_id bigint;
begin
    mytag_id := ( select tag_id from tags where ( tag_id = param_tag_id));
    -- check if tag exists before updating
    if mytag_id is null
        then raise exception 'Invalid tag id';
    end if;
    return 1;
end;
$$ language plpgsql;


/**
* Function to dlete tag by tag id
*
* Input:
*   - param_tag_id
*
* Output:
*   - return 1 as success
*/
create or replace function public.delete_tag (
    param_tag_id bigint
) returns int
as $$
declare
    mytag_id bigint;
begin
    mytag_id = public.check_tag_id(param_tag_id);
    delete from tags where tag_id = param_tag_id;
    return 1;
end;
$$ language plpgsql;


/**
* Function to bulk delete tags
* loop through the array of tag id to delete
*
* Input:
*   - param_tag_id
*
* Output:
*   - return 1 as success
*/
create or replace function public.bulk_delete_tag (
    param_tag_id bigint[]
) returns int
as $$
declare
    tag int;
    update_tag int;
begin
    -- delete the tag accordingly
    foreach tag in array param_tag_id
    loop
        update_tag = public.delete_tag(
            tag
        );
    end loop;
    return 1;
end;
$$ language plpgsql;