-- test for edit tracks name
BEGIN;
select plan(2);
select is(
    public.edit_track( 1, 'new' ),
    '1',
    'returns 1'
);
select is(
    public.edit_track( 2, 'old' ),
    '1',
    'returns 1'
);
select * from finish()
ROLLBACK