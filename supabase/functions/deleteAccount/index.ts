// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.


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
            const linksDelete = await getItemFromBuckets( supabase, userId );
            deleteStorageItem( supabase, userId, linksDelete );
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
    const { error: deleteError } = await supabase
        .from( 'users' )
        .delete()
        .eq( 'user_id', listenerId )
    if ( deleteError ) {
        console.log( 'supabase error:', deleteError );
        return new Response( JSON.stringify( { error: 'Error deleting data' } ),
        { status: 500, headers: { 'Content-type': 'application/json' } } );
    }
    console.log('Success account deleted')
    return 1;
}

async function getItemFromBuckets ( supabase, artistId ) {
    // retrieve an array of objects linke from the storage
    const { data: arrayLink, error: fetchError } = await supabase
        .from ( 'songs' )
        .select( 'song_file_path' )
        .eq( 'artist_id', artistId)
    if ( fetchError ){
        console.error( 'supabase error:', fetchError );
        return new Response( JSON.stringify( { error: 'Error fetching Links' } ),
        { status: 500, headers: { 'Content-type': 'application/json' } } );
    }
    return arrayLink
}

// delete the listener metadata from the DB
async function deleteStorageItem( supabase, artistId, linksToDelete ) {

    //todo
    //https://supabase.com/docs/reference/javascript/storage-from-remove
    // Loop through all the items with the artist_id and delete them
    let link;
    const testLink = "" // link to the file
    const { error: deleteError } = await supabase
        .storage
        .from('music')
        .remove([testLink])
    if ( deleteError){
                console.error( 'Delete error:', deleteError );
                return new Response( JSON.stringify({ error: 'error deleting'}),
                {status: 400, headers: { 'Content-type': 'application/json'} } );
            } 
    // loop to delete all files linked to the artist id
    // for ( link of linksToDelete ) {
    //     const { error: deleteError } = await supabase 
    //     .storage
    //     .from( 'music' )
    //     .remove([link.song_file_path])
    //     if ( deleteError ) {
    //         console.error( 'Delete error:', deleteError );
    //         return new Response( JSON.stringify({ error: 'error deleting'}),
    //         {status: 400, headers: { 'Content-type': 'application/json'} } );
    //     } 
    // }
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
        --data '{"user_id": "440716ff-b9ea-4931-a623-ab8427a8ffa9"}'
    */
// 67f93f97-47c2-4a89-86a4-d02a48349248