-- test for edit pricing of tracks
BEGIN;
select plan(4);
select is(
    public.edit_track_pricing(1, 10, 5, false),
    '1',
    'returns 1'
);
select is(
    public.bulk_edit_track_pricing(array[1, 2], 10, 5, false),
    '1',
    'returns 1'
);
select is(
    public.edit_album_pricing(1, 10, 5, false),
    '1',
    'returns 1'
);
select is(
    public.bulk_edit_album_pricing(array[1, 2], 10, 5, false),
    '1',
    'returns 1'
);
select * from finish()
ROLLBACK