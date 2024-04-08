import { createClient } from 'https://esm.sh/@supabase/supabase-js'

//TO DO: CHECK SONG STREAM COUNT IF PAYOUT HIT

//TO DO: IF PAYOUT HIT TRIGGER PAYOUT FUNTION

//TO DO: Transfer token to artist wallet

//TO DO: Deduct token from customer wallet

//TO DO: Increase artist amount by 1 token on database



async function playSong(request) {
  
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
      return new Response(JSON.stringify({error: 'Missing songId'}), {status: 400, headers: {'Content-Type': 'application/json'}})
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: request.headers.get('Authorization')! } } }
  )

  const { data, error } = await supabase
  .from('songs')
  .select('stream_count, is_free')   
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

if(!data[0].is_free){

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
  .eq('song_id', songId)


}
  

  return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  
}

Deno.serve(async (request) =>{

  return playSong(request)
   

    // const functionName = 'songPayout'; 

    // try {
    // const { data, error } = await supabase.functions.invoke(functionName, {
    //     body: {songId: "1"}
    // });

    // if (error) {
    //     console.error('Error invoking function:', error);
    //     return;
    // }

    // console.log('Function response:', data);

    // return new Response(
    //   JSON.stringify(data),
    //   { headers: { "Content-Type": "application/json" } },

    // )
    // } catch (error) {
    // console.error('Exception when calling function:', error);
    // }
    
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