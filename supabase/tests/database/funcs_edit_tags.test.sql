-- test for edit tags name
BEGIN;
select plan(2);
select is(
    public.edit_tag( 1, 'funky', 2 ),
    '1',
    'returns 1'
);
select is(
    public.edit_tag( 2, 'rock', 3 ),
    '1',
    'returns 1'
);
select * from finish()
ROLLBACK