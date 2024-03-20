-- test for edit pricing of tracks
BEGIN;
select plan(1);
select is(
    public.edit_track_pricing(1, 10, 5, false),
    '1',
    'returns 1'
);
select * from finish()
ROLLBACK