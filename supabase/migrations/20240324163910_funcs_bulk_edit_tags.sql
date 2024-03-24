/**
* This migration includes functions to bulk edit tags
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
* Function to edit tag name and tag category id of a tag
*
* Input:
*   - param_tag_id
*   - param_tag_name
*   - param_tag_category_id
*
* Output:
*   - return 1 as success
*/
create or replace function public.edit_tag (
    param_tag_id bigint,
    param_tag_name text,
    param_tag_category_id bigint
) returns int
as $$
declare
    mytag_id bigint;
begin
    mytag_id = public.check_tag_id(param_tag_id);
    update tags set tag_name = param_tag_name, 
        tag_category_id = param_tag_category_id
        
    where tag_id = param_tag_id;
    return 1;
end;
$$ language plpgsql;


/**
* Function to bulk edit tags
* loop through the array of tag id to update
*
* Input:
*   - param_tag_id
*   - param_tag_name
*   - param_tag_category
*
* Output:
*   - return 1 as success
*/
create or replace function public.bulk_edit_tag (
    param_tag_id bigint[],
    param_tag_name text[],
    param_tag_category bigint[]
) returns int
as $$
declare
    tag int;
    update_tag int;
    count int;
begin
    -- update the tag accordingly
    count =1;
    foreach tag in array param_tag_id
    loop
        update_tag = public.edit_tag(
            tag,
            param_tag_name[count],
            param_tag_category[count]
        );
        count = count +1;
    end loop;
    return 1;
end;
$$ language plpgsql;