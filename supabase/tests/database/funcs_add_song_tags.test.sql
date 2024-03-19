-- Smoke test for adding song tags
BEGIN;
select plan(1);
select is(
    public.add_many_song_tags(1,array['a','b','c'],4),
    cast(3 as bigint),
    'returns count of tags processed'
);
select * from finish();
ROLLBACK