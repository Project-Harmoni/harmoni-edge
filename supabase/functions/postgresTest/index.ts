/* just to query the user id to test edge functions */
/* can be tested locally as well as remotely on the test */
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

Deno.serve(async (_req) => {

  // Parse the URL and query parameters
  const url = new URL(_req.url);
  // Get the 'columns' query parameter, default to a specific column if not provided
  const columns = url.searchParams.get('columns') || 'user_id'; // Example default

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: _req.headers.get('Authorization')! } } }
    )

    const { data, error } = await supabase.from('users').select(columns)

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
curl --request GET ${SUPABASE_URL}'/functions/v1/postgresTest?columns=user_id' \
--header "Authorization: Bearer ${SUPABASE_ANON_KEY}"
 columns can be any column in songs

 to run edge locally:
 curl --request GET 'http://localhost:54321/functions/v1/postgresTest?columns=user_id' \
--header "Authorization: Bearer ${SUPABASE_ANON_KEY}"
*/

