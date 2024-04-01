// Example function (hello world).
// Only a default stub for reference, to be removed later.
//
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
console.log("Hello from Functions!")

Deno.serve(async (req) => {
  
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

curl --request POST 'http://localhost:54321/functions/v1/hello-world' \
  --header 'Authorization: Bearer '${SUPABASE_ANON_KEY} \
  --header 'Content-Type: application/json' \
  --data '{ "name":"Functions" }'

(note, you can set SUPABASE_ANON_KEY via 
  export SUPABASE_ANONK_KEY=(copy-paste appropriate value here)
  in your terminal window.)

*/
