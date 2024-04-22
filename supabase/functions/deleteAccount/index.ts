// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

console.log("Hello from Functions!")

import { createClient } from 'https://esm.sh/@supabase/supabase-js'

async function deleteAccountUser( request: Request) {

    if ( request.method !== 'POST' ) {
        return new Response( JSON.stringify( { error: 'Method not supported' } ),
        { status: 405, headers: { 'Content-type': 'application/json' } } )
    }

    // parse json body to execute function
    let body
    try {
        body = await request.json()
    } catch ( error ) {
        console.log( 'Error parsin json:', error )
        return new Response( JSON.stringify( { error: 'Bad Request' } ),
        { status: 400, headers: { 'Content-Type': 'application/json' } } )
    }
    const userId = body.user_id;

    //  method from Doc supabase to reach the DB
    const supabase = createClient(
        Deno.env.get( 'SUPABASE_URL' ) ?? '',
        Deno.env.get( 'SUPABASE_ANON_KEY' ) ?? '',
        { global: { headers: { Authorization: request.headers.get( 'Authorization' )! } } }
    )
    try {
        const userType = await getUserType( supabase, userId );
        console.log(userType);
        if ( userType[0].user_type === 'listener') {
            console.log('going here')
            deleteMetaDataUser( supabase, userId )
        } else if ( userType[0].user_type === 'artist') {
            // todo
            deleteStorageItem( supabase, userId );
            deleteMetaDataUser( supabase, userId )
        } else {
            // todo throw error
        }
    } catch ( error ) {
        return new Response(JSON.stringify({ error: 'error while deleting'}), {status: 500})
    }
    return new Response(JSON.stringify({status: 200, headers: {'Content-type': 'application/json'}}))

}

// delete the listener metadata from the DB
async function deleteMetaDataUser( supabase, listenerId ) {

    console.log('here')
    const { data: listener, error: deleteError } = await supabase
        .from( 'users' )
        .delete()
        .eq( 'user_id', listenerId )
    if ( deleteError ) {
        console.log( 'supabase error:', deleteError );
        return new Response( JSON.stringify( { error: 'Error deleting data' } ),
        { status: 500, headers: { 'Content-type': 'application/json' } } );
    }
    console.log('here')
    return 1;
}

// delete the listener metadata from the DB
async function deleteStorageItem( supabase, artistId ) {

    //todo
    //https://supabase.com/docs/reference/javascript/storage-from-remove

    // Loop through all the items with the artist_id and delete them
    console.log('done')
    return 1;
}


async function getUserType ( supabase, userId ) {

    // fetch user info
    const { data: userData, error: fetchError } = await supabase
        .from( 'users' )
        .select( 'user_type' )
        .eq( 'user_id', userId )
        if ( fetchError ){
            console.error( 'supabase error:', fetchError );
            return new Response( JSON.stringify( { error: 'Error fetching data' } ),
            { status: 500, headers: { 'Content-type': 'application/json' } } );
        }
    return userData
}


Deno.serve( async (request) => {

    return deleteAccountUser(request);
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:
curl --request POST 'http://localhost:54321/functions/v1/deleteAccount' \
  --header "Authorization: Bearer "${SUPABASE_ANON_KEY}\
  --header "Content-Type: application/json" \
  --data '{"user_id": "6f93aba5-275c-4088-98d3-e6928f6c4ca7"}'

*/
