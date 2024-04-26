import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8'

/**
 * The `playSong` function is designed to manage song playback requests in a music streaming platform.
 * It integrates with the Supabase database for user and song data management, and leverages the Ethereum blockchain
 * via ethers.js for token-based transactions. This function ensures that each song play is authenticated,
 * the appropriate tokens are transferred between user wallets, and all relevant data is updated in the database.
 * It handles errors robustly and ensures that only valid POST requests are processed. This function is intended
 * to run in a Deno environment, utilizing environment variables for secure and dynamic configuration.
 *
 * Usage:
 * - Validates HTTP request method and content.
 * - Parses and checks request body for necessary parameters.
 * - Establishes connections to blockchain and database services.
 * - Verifies user balances and permissions.
 * - Conducts token transfers and updates user balances.
 * - Logs song play data and updates streaming statistics.
 *
 * This function is triggered by HTTP POST requests made to the Deno server it runs on.
 */

/**
 * Handles the logic for playing a song which involves validating user and song data,
 * processing payments, and updating stream counts. This function operates within a Deno environment
 * and utilizes both the Supabase database and the Ethereum blockchain via ethers.js.
 * It ensures the song play is properly logged, the artist is compensated, and the user's
 * token balance is updated.
 * 
 * @param {Request} request - The HTTP request object that includes method, headers, and body.
 * @returns {Promise<Response>} - A promise that resolves to an HTTP response object.
 */
async function playSong(request) {

  // Establishes a connection to the Ethereum blockchain using an Alchemy API endpoint.
  const alchemyEndpoint = Deno.env.get('ALCHEMY_URL')
  const alchemyProvider = new ethers.providers.JsonRpcProvider(alchemyEndpoint)

  // Retrieves the token contract address and ABI from environment variables.
  const tokenContractAddress = Deno.env.get('TOKEN_CONTRACT_ADDRESS')
  const tokenAbi = ["function balanceOf(address owner) view returns (uint256)", 
  "function transfer(address to, uint value) returns (bool)"]
  const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, alchemyProvider)
  const masterWallet = new ethers.Wallet(Deno.env.get('MASTER_KEY'), alchemyProvider)
  
  // Only allow POST requests for this operation
  if(request.method !== 'POST'){
    return new Response(JSON.stringify({error: 'Method not allowed'}), {status: 405, headers: {'Content-Type': 'application/json'}})
  }

  let body
  try{
      body = await request.json()
  } catch(error){
      console.error('Error parsing request body: ', error)
      return new Response(JSON.stringify({error: 'Bad Request'}), {status: 400, headers: {'Content-Type': 'application/json'}})
  }

  const songId = body.songId
  if (!songId){
      return new Response(JSON.stringify({error: 'Missing songId'}), {status: 400, headers: {'Content-Type': 'application/json'}})
  }

  const userId = body.userId
  if (!userId){
      return new Response(JSON.stringify({error: 'Missing userId'}), {status: 400, headers: {'Content-Type': 'application/json'}})
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: request.headers.get('Authorization')! } } }
  )

  // Retrieves the user type to determine whether the user is a listener or an artist.
  const {data: userTypeData, error: userTypeError} = await supabase
  .from('users')
  .select('user_type')
  .eq('user_id', userId)
  .single()

  let table
  let userType
  if(userTypeData.user_type.toLowerCase() === "listener"){
    table = "listeners"
    userType = "listener_id"
  }else{
    table = "artists"
    userType = "artist_id"
  }

  // Fetches listener or artist data to check the token balance and manage wallet interactions.
  const {data: listenerData, error: listenerError} = await supabase
  .from(table)
  .select('tokens, listener: users!inner(private_key), table: users!inner(user_type)')
  .eq(userType, userId)
  .single()

  if (listenerError) {
    console.error('Supabase error:', listenerError);
    return new Response(JSON.stringify({ error: 'Error fetching listener data' }), 
    { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  if (listenerData.tokens < 1){
    return new Response(JSON.stringify({ error: 'Insufficient balance' }), 
      { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Creates a wallet instance for the listener using their private key and the blockchain provider.
  const listenerWallet = new ethers.Wallet(listenerData.listener.private_key, alchemyProvider)
  const contractWithSigner = tokenContract.connect(listenerWallet)
  
  // Fetches song details to manage stream counts and token transfers if the song is not free.
  const { data, error } = await supabase
  .from('songs')
  .select('stream_count, is_free, artist_id, artist_payout_percentage, payout_threshold')   
  .eq('song_id', songId)

  if (error) {
    console.error('Supabase error:', error);
    return new Response(JSON.stringify({ error: 'Error fetching song data' }), 
    { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  if (!data || data.length === 0) {
    return new Response(JSON.stringify({ message: 'No records found for the specified song ID' }), 
    { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  let {data: artistTransferData, error: artistTransferError} = await supabase
          .from('artists')
          .select('tokens, total_artist_streams, artist: users!inner(public_key)')
          .eq('artist_id', data[0].artist_id)
          .single()
  
  if (artistTransferError) {
    console.error('Supabase error:', artistTransferError);
    return new Response(JSON.stringify({ error: 'Error fetching artistTransfer data' }), 
    { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  if(!data[0].is_free){
    // Calculate the fee to transfer from the listener to the artist and the master wallet.
    let bonusWei = ethers.utils.parseUnits('0', 18);
    const artistWallet = artistTransferData.artist.public_key
    const songFee = ethers.utils.parseUnits('1', 18)
    let transferTokens = songFee

    // increase artist tokens
    let artistTokens = artistTransferData.tokens + 1
    
    artistTokens -= 0.05

    if (artistTransferData.total_artist_streams <= 10000 && userType === "listener_id") {
      bonusWei = songFee
    }

    // transfer .05 tokens to masterWallet from listener wallet
    try {
        const masterWalletFractionWei = ethers.utils.parseUnits('0.05', 18)
        const wallet = '0x7a81233d84790Fb2BA8c5BF597eD5DCab46D842a'
        const transaction = await contractWithSigner.transfer(wallet, masterWalletFractionWei)
        console.log('Partial Transfer successful', transaction)

        let balanceWei = transferTokens.sub(masterWalletFractionWei)

        await contractWithSigner.transfer(artistWallet, balanceWei)
        console.log("Transfer from listener wallet to artist wallet successful")

        if(bonusWei.gt(0)){
          artistTokens += 1
          const bonusWei = ethers.utils.parseUnits('1', 18)
          const masterWithSigner = contractWithSigner.connect(masterWallet)
          await masterWithSigner.transfer(artistWallet, bonusWei)
          console.log("Bonus transfer from master to artist wallet successful")
        }
    } catch (error) {
        console.error('Transfer error:', error)
    }
   
    // update with new amount 
    const {error: updateArtistError} = await supabase
      .from('artists')
      .update({tokens: artistTokens})
      .eq('artist_id', data[0].artist_id)

    console.log("Transferred tokens to artist")

    // increment artist total song streams
    artistTransferData.total_artist_streams += 1
    
      const {error: updateArtistStream} = await supabase
      .from('artists')
      .update({total_artist_streams: artistTransferData.total_artist_streams})
      .eq('artist_id', data[0].artist_id)
      console.log("Updated artist streams")
    
    // decrease listener tokens
    console.log("Table: ",table)
    let {data: listenerDataUpdate, error: listenerErrorUpdate} = await supabase
          .from(table)
          .select('tokens')
          .eq(userType, userId)
          .single()
    console.log(listenerDataUpdate)

    const newTokens = listenerDataUpdate.tokens - 1

    // update with new amount
    const {error: updateError} = await supabase
    .from(table)
    .update({tokens: newTokens})
    .eq(userType, userId)
  }

  // increment song count
  let {data: songData, error: songError} = await supabase
        .from('songs')
        .select('stream_count')
        .eq('song_id', songId)
        .single()

  const newSongCount = songData.stream_count + 1

  const {error: songUpdateError} = await supabase
  .from('songs')
  .update({stream_count: newSongCount})
  .eq('song_id', songId)

  // increment listener streams
  const { data: streamData, error: countError } = await supabase
        .from('listener_song_stream')
        .select('counter_streams')
        .eq('song_id', songId)
        .eq('listener_id', userId)
        .single()

  // add a new listener stream if none exists
  if (!streamData || streamData.length === 0) {
    const {data: streamData, error: streamDataError} = await supabase
        .from('listener_song_stream')
        .insert([
          { listener_id: userId, song_id: songId, counter_streams: 1 }
      ]);
  }else{

    const newSongStream = streamData.counter_streams + 1

    const {error: streamError} = await supabase
    .from('listener_song_stream')
    .update({counter_streams: newSongStream})
    .eq('song_id', songId)
    .eq('listener_id', userId)
  }

    console.log("Payout function called!")
    const functionName = 'songPayout'; 

    try {
    const { data, error } = await supabase.functions.invoke(functionName, {
        body: {songId: songId}
        
    });

    if (error) {
        console.error('Error invoking function:', error);
    }

    console.log('Function response:', data);

    } catch (error) {
    console.error('Exception when calling function:', error);
    }
    return new Response(JSON.stringify({ data: "Song Payment Processed" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  
}

Deno.serve(async (request) =>{

  return playSong(request)
   
 })

 /* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

curl --request POST 'http://localhost:54321/functions/v1/playASong' \
    --header 'Authorization: Bearer '${SUPABASE_ANON_KEY} \
    --header 'Content-Type: application/json' \
    --data '{ "songId": "'${SONG_ID}'", "userId": "'${USER_ID}'" }'

(note, you can set SUPABASE_ANON_KEY via 
  export SUPABASE_ANONK_KEY=(copy-paste appropriate value here)
  in your terminal window.)
*/