import { createClient } from 'https://esm.sh/@supabase/supabase-js'



//TO DO: IF SONG NOT FREE: REDUCE LISIENER BALANCE

// INCREMENT SONG COUNT

// INCREMENT LISTENER STREAM COUNT

//TO DO: CHECK SONG STREAM COUNT IF PAYOUT HIT

//TO DO: IF PAYOUT HIT TRIGGER PAYOUT FUNTION

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
  console.log("Data: ", data[0].stream_count)
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
    --data '{ "songId": "'${SONG_ID}'" }'

(note, you can set SUPABASE_ANON_KEY via 
  export SUPABASE_ANONK_KEY=(copy-paste appropriate value here)
  in your terminal window.)
*/