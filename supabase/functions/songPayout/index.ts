
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8'

/**
 * Edge Function: Song Payout Processor
 * 
 * This edge function, designed to run in a Deno environment, handles the distribution of tokens to listeners of a song based on predefined streaming thresholds.
 * It is triggered by POST requests that include a songId. The function first validates the request method and songId, then queries the database to fetch
 * streaming data for the specified song. If the song's streaming count meets or exceeds the payout threshold, the function proceeds to calculate and distribute
 * tokens to the listeners according to their individual streaming counts and the artist's payout percentage. It updates the database to reset stream counts and
 * adjust token balances for both listeners and the artist. This function ensures that payouts are made correctly and efficiently, leveraging the Supabase client for database interactions
 * and ethers.js for blockchain interactions.
 * 
 * Usage:
 * - The function is meant to be deployed as an edge function within a Deno runtime.
 * - It listens for incoming HTTP POST requests, expecting a JSON body with a `songId`.
 * - Proper authentication and environmental variables must be configured, including Supabase and Alchemy credentials.
 * 
 */

/**
 * Handles song payout logic based on streaming count thresholds. This function processes a POST request containing a songId and, if the streaming threshold is met,
 * distributes tokens to listeners according to their stream count and the artist's payout percentage.
 * 
 * @param {Request} request - The incoming HTTP request that should only be a POST request. The request body must include a songId.
 * @returns {Promise<Response>} A JSON-formatted HTTP response indicating the status of the operation, including error messages if applicable.
 */
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

    const { data: songData, error: songError } = await supabase
            .from('songs')
            .select('stream_count, payout_threshold')   
            .eq('song_id', songId)

    if (songError) {
        console.error('Supabase error:', error);
        return new Response(JSON.stringify({ error: 'Error fetching song stream count' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!songData || songData.length === 0) {
        return new Response(JSON.stringify({ message: 'No records found for the specified song ID' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (songData[0].stream_count >= songData[0].payout_threshold){
        // get listeners and total song count for a song
        try {
            const { data, error } = await supabase
                .from('listener_song_stream')
                .select('listener_id, counter_streams, listener: users!inner(public_key)')   
                .eq('song_id', songId)

            if (error) {
                console.error('Supabase error:', error);
                return new Response(JSON.stringify({ error: 'Error fetching data' }), 
                { status: 500, headers: { 'Content-Type': 'application/json' } });
            }

            if (!data || data.length === 0) {
                return new Response(JSON.stringify({ message: 'No records found for the specified listener stream song ID' }), 
                { status: 404, headers: { 'Content-Type': 'application/json' } });
            }
            // get artist id for song
            const { data: artistData, error: artistError } = await supabase
                .from('songs')
                .select('artist_id, payout_type, artist: artists!inner(users!inner(private_key)), artist_payout_percentage')   
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
            console.log("Process data: ", artistData)
            processListenersData(supabase, songId, data, artistData, songData)

            // set song counter to 0
            const {error: songCountUpdateError} = await supabase
            .from('songs')
            .update({stream_count: 0})
            .eq('song_id', songId)
            if (songCountUpdateError) {
                console.error('Error updating tokens:', updateError);
            }

            return new Response(JSON.stringify({ data: 'Song payout completed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (error) {
            console.error('Error in processing:', error);
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }else{
        return new Response(JSON.stringify({ data: 'Payout threshold not met' }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
}

/**
 * Processes data for each listener of a song, transferring tokens from an artist's wallet to listeners based on stream counts.
 * Each listener's stream count is reset to zero after processing. Updates the listener and artist token balances in the database.
 * 
 * @param {any} supabase - The initialized Supabase client instance used to interact with the database.
 * @param {string} songId - The unique identifier of the song being processed.
 * @param {any[]} data - The array of listener data objects containing stream counts and public keys for token transfer.
 * @param {any} artistData - The artist's data including the private key for signing the transactions.
 */
async function processListenersData(supabase, songId, data, artistData, songData) {

    // create instances of alchemy provider and token contract
    const alchemyEndpoint = Deno.env.get('ALCHEMY_URL')
    const alchemyProvider = new ethers.providers.JsonRpcProvider(alchemyEndpoint)
    const tokenContractAddress = Deno.env.get('TOKEN_CONTRACT_ADDRESS')
    const tokenAbi = ["function balanceOf(address owner) view returns (uint256)", "function transfer(address to, uint value) returns (bool)"]
    const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, alchemyProvider)

    // create sender wallet for artist
    const privateKey = artistData[0].artist.users.private_key
    const transferWallet = new ethers.Wallet(privateKey, alchemyProvider)
    const contractWithSigner = tokenContract.connect(transferWallet)
    var table
    var id

    if (artistData[0].payout_type.toLowerCase() === 'jackpot'){
        console.log("This is a jackpot")
        const randomIndex = Math.floor(Math.random() * data.length)
        const jackpotWinner = data[randomIndex].listener_id
        console.log("Winner: ", jackpotWinner)
        const jackpotPublicKey = data[randomIndex].listener.public_key
        const jackpot = songData[0].stream_count * (artistData[0].artist_payout_percentage/100)
        console.log(jackpotPublicKey, jackpot)
        const jackpotWei = ethers.utils.parseUnits(jackpot.toString(), 18)
        
        try {
            const transaction = await contractWithSigner.transfer(jackpotPublicKey, jackpotWei);
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
        if (countError) {
            console.error('Error resetting counter_streams:', countError);
        }
        const {data: userData, error: userError} = await supabase
        .from('users')
        .select('user_type')
        .eq('user_id', jackpotWinner)
        .single()
        if (userError){
            console.error('Operational error:', userError)
        }
        
        if (userData.user_type.toLowerCase() === 'artist'){
            table = 'artists'
            id = 'artist_id'
        }else{
            table = 'listeners'
            id = 'listener_id'
        }

            // get current balance of listener tokens
            let {data: listenerData, error: listenerError} = await supabase
            .from(table)
            .select('tokens')
            .eq(id, jackpotWinner)
            .single()
            if (listenerError) {
                console.error('Operational error:', listenerError);
                //throw new Error('Error subtracting tokens due to operational issue');
            }   
            const newTokens = listenerData.tokens + jackpot
            // update with new amount
            const {error: updateError} = await supabase
            .from(table)
            .update({tokens: newTokens})
            .eq(id, jackpotWinner)
            if (updateError) {
                console.error('Error updating tokens:', updateError);
                //throw new Error('Error updating tokens after subtraction');
            }

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
            const artistTokens = artistsData.tokens - jackpot
            // update with new amount
            const {error: artistUpdateError} = await supabase
            .from('artists')
            .update({tokens: artistTokens})
            .eq('artist_id', artistData[0].artist_id)
            if (artistUpdateError) {
                console.error('Error updating tokens:', updateError);
                //throw new Error('Error updating tokens after subtraction');
            }
    }else{
    
        for(let i=0; i < data.length; i++){
            const listener = data[i].listener_id
            const {data: userData, error: userError} = await supabase
                .from('users')
                .select('user_type')
                .eq('user_id', listener)
                .single()
                if (userError){
                    console.error('Operational error:', userError)
                }
                
            if (userData.user_type.toLowerCase() === 'artist'){
                table = 'artists'
                id = 'artist_id'
            }else{
                table = 'listeners'
                id = 'listener_id'
            }
            // create receiver wallet
            const receiverWallet = data[i].listener.public_key
            
            //send tokens to listener wallet
            const tokenAmount = data[i].counter_streams * (artistData[0].artist_payout_percentage/100)
            const amountInWei = ethers.utils.parseUnits(tokenAmount.toString(), 18)

            try {
                const transaction = await contractWithSigner.transfer(receiverWallet, amountInWei);
                console.log('Transfer successful', transaction);
            } catch (transferError) {
                console.error('Transfer error:', transferError);
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
            .from(table)
            .select('tokens')
            .eq(id, listener)
            .single()
            if (listenerError) {
                console.error('Operational error:', error);
                //throw new Error('Error subtracting tokens due to operational issue');
            }   
            const newTokens = listenerData.tokens + tokenAmount
            // update with new amount
            const {error: updateError} = await supabase
            .from(table)
            .update({tokens: newTokens})
            .eq(id, listener)
            if (updateError) {
                console.error('Error updating tokens:', updateError);
                //throw new Error('Error updating tokens after subtraction');
            }
            console.log('Tokens increased successfully for userId:', listener);
            // get current balance of artist tokens
            let {data: artistsData, error: artistError} = await supabase
            .from('artists')
            .select('tokens')
            .eq('artist_id', artistData[0].artist_id)
            .single()
            if (artistError) {
                console.error('Operational error:', artistError);
                //throw new Error('Error subtracting tokens due to operational issue');
            }   
            const artistTokens = artistsData.tokens - tokenAmount
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