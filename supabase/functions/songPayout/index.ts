
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8';


async function payoutAsong(request) {
    
    // Only allow POST requests for this operation
    if(request.method !== 'POST'){
        return new Response(JSON.stringify({error: 'Method not allowed'}), {status: 405, headers: {'Content-Type': 'application/json'}})
    }

    let body
    try{
        // Parse the JSON body of the request
        body = await request.json()
    } catch(error){
        console.error('Error parsing request body: ', error)
        return new Response(JSON.stringify({error: 'Bad Request'}), {status: 400, headers: {'Content-Type': 'application/json'}})
    }

    const songId = body.songId
    if (!songId){
        return new Response(JSON.stringify({error: 'Missing songId'}), {status: 400, headers: {'Content-Type': 'application/json'}})
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: request.headers.get('Authorization')! } } }
    )

    // get listeners and total song count for a song
    try {
        const { data, error } = await supabase
            .from('listener_song_stream')
            .select('listener_id,counter_streams, listener: listeners!inner(users!inner(public_key))')
            //.select('listener_id, counter_streams')
            .eq('song_id', songId);

        if (error) {
            console.error('Supabase error:', error);
            return new Response(JSON.stringify({ error: 'Error fetching data' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        if (!data || data.length === 0) {
            return new Response(JSON.stringify({ message: 'No records found for the specified song ID' }), 
            { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        // get artist id for song



        //processListenersData(data)
        return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Error in processing:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

}

async function processListenersData(data, artist_address) {
    for (const record of data) {
        console.log(`Listener ID: ${record.listener_id}, Count: ${record.counter_streams}`);
    }
}

async function getArtistPublicKey(supabase, artistId) {
    const { data, error } = await supabase
        .from('artists')
        .select('public_key')
        .eq('artist_id', artistId)
        .single();

    if (error) {
        console.error('Error fetching artist public key:', error);
        return null;
    }

    return data ? data.public_key : null;
}


// Starts the Deno server to handle incoming HTTP requests
Deno.serve(async (request) =>{

   return payoutAsong(request)
    
    
})

/* To invoke locally:

    1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
    2. Make an HTTP request:

    curl --request POST 'http://localhost:54321/functions/v1/songPayout' \
    --header 'Authorization: Bearer '${SUPABASE_ANON_KEY} \
    --header 'Content-Type: application/json' \
    --data '{ "songId": "'${SONG_ID}'" }'

    (note, you can set SUPABASE_ANON_KEY via 
    export SUPABASE_ANONK_KEY=(copy-paste appropriate value here)
    in your terminal window.)

    */