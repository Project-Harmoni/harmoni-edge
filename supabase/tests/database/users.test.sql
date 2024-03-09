--example test; rudimentary for now, just checking that 
--tables exist. We can add to these later.
--To run, db tests, just call 'supabase test db' from 
--the harmoni-edge directory.
begin;
select plan(4);

SELECT has_column(
    'auth',
    'users',
    'id',
    'id column should exist'
);

SELECT has_table('users');
SELECT has_table('listeners');
SELECT has_table('artists');

select * from finish();
rollback;