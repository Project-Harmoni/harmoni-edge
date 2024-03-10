import { createClient } from 'https://esm.sh/@supabase/supabase-js'

Deno.serve(async (_req) => {

  // Parse the URL and query parameters
  const url = new URL(_req.url);
  // Get the 'columns' query parameter, default to a specific column if not provided
  const columns = url.searchParams.get('columns') || 'song_name,album_name'; // Example default

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: _req.headers.get('Authorization')! } } }
    )

    const { data, error } = await supabase.from('songs').select(columns)

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

/* Run edge function query using curl --request GET 'http://localhost:54321/functions/v1/postgresTest?columns=song_name,album_name'
 --header "Authorization: Bearer ${SUPABASE_ANON_KEY}"
 columns can be any column in songs
*/

