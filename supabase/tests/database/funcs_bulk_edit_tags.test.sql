-- test for edit tags name
BEGIN;
select plan(1);
select is(
    public.bulk_edit_tag( array[1,2], array['funky', 'rock'], array[2,3] ),
    '1',
    'returns 1'
);
select * from finish()
ROLLBACK