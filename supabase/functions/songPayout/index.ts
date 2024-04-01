
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
            .select('listener_id, counter_streams, listener: listeners!inner(users!inner(private_key))')   
            .eq('song_id', songId)

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
        const { data: artistData, error: artistError } = await supabase
            .from('songs')
            .select('artist_id, artist: artists!inner(users!inner(public_key))')   
            .eq('song_id', songId)
        
        if (artistError) {
            console.error('Error fetching artist ID:', artistError);
            return new Response(JSON.stringify({ error: 'Error fetching artist data' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        
        if (!artistData) {
            return new Response(JSON.stringify({ message: 'No artist found for the specified song ID' }), 
            { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        
        processListenersData(supabase, songId, data, artistData)

        return new Response(JSON.stringify({ data, artistData }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Error in processing:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

}

async function processListenersData(supabase, songId, data, artistData) {

    // create instances of alchemy provider and token contract
    const alchemyEndpoint = Deno.env.get('ALCHEMY_URL')
    const alchemyProvider = new ethers.providers.JsonRpcProvider(alchemyEndpoint)
    const tokenContractAddress = Deno.env.get('TOKEN_CONTRACT_ADDRESS')
    const tokenAbi = ["function balanceOf(address owner) view returns (uint256)", "function transfer(address to, uint value) returns (bool)"]
    const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, alchemyProvider)

    const receiverWallet = artistData[0].artist.users.public_key

    for(let i=0; i < data.length; i++){
        const listener = data[i].listener_id
        // create sender wallet
        const privateKey = data[i].listener.users.private_key
        const transferWallet = new ethers.Wallet(privateKey, alchemyProvider)
        const contractWithSigner = tokenContract.connect(transferWallet)
        //send tokens to artist wallet
        const tokenAmount = data[i].counter_streams
        console.log(tokenAmount)
        const amountInWei = ethers.utils.parseUnits(tokenAmount.toString(), 18)

        try {
            const transaction = await contractWithSigner.transfer(receiverWallet, amountInWei);
            console.log('Transfer successful', transaction);
        } catch (transferError) {
            console.error('Transfer error:', transferError);
            return;  // Stop execution and handle the error appropriately
        }
        //set count_stream to 0
        const { data: streamData, error: countError } = await supabase
        .from('listener_song_stream')
        .update({ counter_streams: 0 })
        .eq('song_id', songId)
        .eq('listener_id', listener)
        if (countError) {
            console.error('Error resetting counter_streams:', countError);
        }
        console.log(`Successfully reset counter_streams: ${listener}`);
        // get current balance of listener tokens
        let {data: listenerData, error: listenerError} = await supabase
        .from('listeners')
        .select('tokens')
        .eq('listener_id', listener)
        .single()
        if (listenerError) {
            console.error('Operational error:', error);
            //throw new Error('Error subtracting tokens due to operational issue');
        }   
        const newTokens = listenerData.tokens - tokenAmount
        // update with new amount
        const {error: updateError} = await supabase
        .from('listeners')
        .update({tokens: newTokens})
        .eq('listener_id', listener)
        if (updateError) {
            console.error('Error updating tokens:', updateError);
            //throw new Error('Error updating tokens after subtraction');
        }
        console.log('Tokens increased successfully for userId:', artistData[0].artist_id);
        // get current balance of artist tokens
        let {data: artistsData, error: artistError} = await supabase
        .from('artists')
        .select('tokens')
        .eq('artist_id', artistData[0].artist_id)
        .single()
        if (artistError) {
            console.error('Operational error:', error);
            //throw new Error('Error subtracting tokens due to operational issue');
        }   
        const artistTokens = artistsData.tokens + tokenAmount
        // update with new amount
        const {error: artistUpdateError} = await supabase
        .from('artists')
        .update({tokens: artistTokens})
        .eq('artist_id', artistData[0].artist_id)
        if (artistUpdateError) {
            console.error('Error updating tokens:', updateError);
            //throw new Error('Error updating tokens after subtraction');
        }
    }

    
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