import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8'


async function playSong(request) {

  const alchemyEndpoint = Deno.env.get('ALCHEMY_URL')
  const alchemyProvider = new ethers.providers.JsonRpcProvider(alchemyEndpoint)
  const tokenContractAddress = Deno.env.get('TOKEN_CONTRACT_ADDRESS')
  const tokenAbi = ["function balanceOf(address owner) view returns (uint256)", "function transfer(address to, uint value) returns (bool)"]
  const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, alchemyProvider)
  const masterWallet = new ethers.Wallet(Deno.env.get('MASTER_KEY'), alchemyProvider)
  
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
      return new Response(JSON.stringify({error: 'Missing sonId'}), {status: 400, headers: {'Content-Type': 'application/json'}})
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

  // check listener balance and throw error if too low and create listener wallet if not
  const {data: listenerData, error: listenerError} = await supabase
  .from('listeners')
  .select('tokens, listener: users!inner(private_key)')
  .eq('listener_id', userId)
  .single()

  if (listenerData.tokens < 1){
    return new Response(JSON.stringify({ error: 'Insufficient balance' }), 
      { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  const listenerWallet = new ethers.Wallet(listenerData.listener.private_key, alchemyProvider)
  const contractWithSigner = tokenContract.connect(listenerWallet)
  

  const { data, error } = await supabase
  .from('songs')
  .select('stream_count, is_free, artist_id, artist_payout_percentage, payout_threshold')   
  .eq('song_id', songId)

  if (error) {
    console.error('Supabase error:', error);
    return new Response(JSON.stringify({ error: 'Error fetching song data' }), 
    { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  let {data: artistTransferData, error: artistTransferError} = await supabase
          .from('artists')
          .select('tokens, total_artist_streams, artist: users!inner(public_key)')
          .eq('artist_id', data[0].artist_id)
          .single()

  // create artist wallet
  const artistWallet = artistTransferData.artist.public_key
  console.log("Artist wallet: ", artistWallet)



  if (!data || data.length === 0) {
      return new Response(JSON.stringify({ message: 'No records found for the specified song ID' }), 
      { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  if(!data[0].is_free){
    const songFee = 1
    let transferTokens = songFee

    // increase artist tokens
    let artistTokens = artistTransferData.tokens + songFee
    
    //if < 10,000, transfer bonus token from master wallet
    if(artistTransferData.total_artist_streams <= 10000){
      artistTokens += songFee
      transferTokens += songFee
    }

    // transfer .05 tokens to masterWallet from listener wallet
    const masterWalletTokens = 0.05
    let amountInWei = ethers.utils.parseUnits(masterWalletTokens.toString(), 18)

    try {
        const wallet = '0x7a81233d84790Fb2BA8c5BF597eD5DCab46D842a'
        const transaction = await contractWithSigner.transfer(wallet, amountInWei)
        //const receipt = await transaction.wait()
        console.log('Transfer successful', transaction)
    } catch (transferError) {
        console.error('Transfer error:', transferError)
        //throw new Error("Failed to transfer tokens")  // Stop execution and handle the error appropriately
    }
    // Transfer song fee to artist
    let listenerTokens = songFee - masterWalletTokens
    artistTokens = artistTokens - masterWalletTokens
    transferTokens = transferTokens - listenerTokens - masterWalletTokens
    console.log("Transfer Tokens ", transferTokens)
    console.log("Listener Tokens ", listenerTokens)
    amountInWei = ethers.utils.parseUnits(listenerTokens.toString(), 18)

    try {
        console.log("ArtistWallet: ", artistWallet)
        const transaction = await contractWithSigner.transfer(artistWallet, amountInWei);
        console.log('Transfer successful', transaction);
    } catch (transferError) {
        console.error('Transfer error:', transferError);
        //throw new Error("Failed to transfer tokens")  // Stop execution and handle the error appropriately
    }

    if(transferTokens > 0){
      amountInWei = ethers.utils.parseUnits(transferTokens.toString(), 18)
      const masterWithSigner = tokenContract.connect(masterWallet)
      try {
        const transaction = await masterWithSigner.transfer(artistWallet, amountInWei);
        console.log('Transfer successful', transaction);
      } catch (transferError) {
        console.error('Transfer error:', transferError);
        //throw new Error("Failed to transfer tokens")  // Stop execution and handle the error appropriately
      }
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
    
  
  
    //TO DO: transfer tokens from listener to artist wallet

    // decrease listener tokens
    let {data: listenerData, error: listenerError} = await supabase
          .from('listeners')
          .select('tokens')
          .eq('listener_id', userId)
          .single()
    console.log(listenerData)

    const newTokens = listenerData.tokens - 1

    // update with new amount
    const {error: updateError} = await supabase
    .from('listeners')
    .update({tokens: newTokens})
    .eq('listener_id', userId)

 
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


    const newSongStream = streamData.counter_streams + 1

    const {error: streamError} = await supabase
    .from('listener_song_stream')
    .update({counter_streams: newSongStream})
    .eq('listener_id', userId)

    // TO DO: check for payout if song not free

    console.log("Payout function called!")
    const functionName = 'songPayout'; 

    try {
    const { data, error } = await supabase.functions.invoke(functionName, {
        body: {songId: "1"}
        
    });

    if (error) {
        console.error('Error invoking function:', error);
    }

    console.log('Function response:', data);

    } catch (error) {
    console.error('Exception when calling function:', error);
    }
    return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  
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