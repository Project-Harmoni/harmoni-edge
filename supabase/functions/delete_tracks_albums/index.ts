/**
 * A first draft at an edge function to remove tracks and albums
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js'


Deno.serve(async (_req) => {

  // Parse the URL and query parameters
  const url = new URL(_req.url);
  //get the song_id column
  const song_id = url.searchParams.get('song_id'); 
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: _req.headers.get('Authorization')! } } }
    )
    console.log("this song id: ",song_id)
    const { data, error } = await supabase
    .from('songs')
    .delete()
    .eq('song_id', song_id)
    
    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 })
  }
})

/* Run edge function for test environment query using 
curl --request GET ${SUPABASE_URL}'/functions/v1/delete_tracks_albums?columns=song_id' \
--header "Authorization: Bearer ${SUPABASE_ANON_KEY}"
 columns can be any column in songs

 to run edge locally:
 curl --request GET 'http://localhost:54321/functions/v1/delete_tracks_albums?columns=song_id' \
--header "Authorization: Bearer ${SUPABASE_ANON_KEY}"

 curl --request GET 'http://localhost:54321/functions/v1/delete_tracks_albums?song_id=1' \
--header "Authorization: Bearer ${SUPABASE_ANON_KEY}"
*/

