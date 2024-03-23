-- test for deleting tracks from db
BEGIN;
select plan(1);
select is(
    public.delete_tracks(1),
    '1',
    'returns 1'
);

select * from finish();
ROLLBACK