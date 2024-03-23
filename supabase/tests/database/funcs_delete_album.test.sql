-- test for deleting albums from db
BEGIN;
select plan(1);
select is(
    public.delete_album(1),
    '1',
    'returns 1'
);

select * from finish();
ROLLBACK