-- test for edit tags name
BEGIN;
select plan(1);
select is(
    public.bulk_delete_tag( array[1,2] ),
    '1',
    'returns 1'
);
select * from finish()
ROLLBACK