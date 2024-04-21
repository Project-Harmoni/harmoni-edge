// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.



console.log("Email edge function");

const RESEND_API_KEY = Deno.env.get( "RESEND_API_KEY" );
import { createClient } from 'https://esm.sh/@supabase/supabase-js';


async function getUserInfo ( supabase, userId ) {
    // fetch username and user id  
    const { data: userData, error: fetchError } = await supabase
        .from( 'users' )
        .select( 'user_name' )
        .eq( 'user_id', userId ) 
        if ( fetchError ){
            console.error( 'supabase error:', fetchError );
            return new Response( JSON.stringify( { error: 'Error fetching data' } ),
            { status: 500, headers: { 'Content-type': 'application/json' } } );
        }
    return userData
}

async function getSongInfo ( supabase, songId ) {
    // fetch song info
    const { data: songData, error: fetchError } = await supabase
        .from( 'songs' )
        .select( 'song_name' )
        .eq( 'song_id', songId )
        if ( fetchError ){
            console.error( 'supabase error:', fetchError );
            return new Response( JSON.stringify( { error: 'Error fetching data' } ),
            { status: 500, headers: { 'Content-type': 'application/json' } } );
        }
    return songData
}

// send the email to review the infringement
const sendEmail = async ( _request: Request ): Promise<Response> => {
    
    // parse the json sent from the client app
    let body
    try {
        body = await _request.json()
    } catch ( error ) {
        console.log( 'Error parsin json:', error )
        return new Response( JSON.stringify( { error: 'Bad Request' } ),
        {status: 400, headers: { 'Content-Type': 'application/json' } } )
    }

    // extract user_id and song_id to retrieve information
    const userId = body.user_id;
    const songId = body.song_id;

    //  method from Doc supabase to reach the DB
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: _request.headers.get('Authorization')! } } }
    )


    // address to send the email
    const email: string = ""
    
    // calling function to retrieve info
    const userInfo = await getUserInfo( supabase, userId );
    const songInfo = await getSongInfo( supabase, songId );

    // sending the email
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify( {
        from: 'onboarding@resend.dev',
        to: email,
        subject: `Potential song infringement: ${songInfo[0].song_name}`,
        html: `<div>
                <p>The user: <b>${userInfo[0].user_name}</b> reported the following track:
                <b>${songInfo[0].song_name}</b> to violate Copywrite Infrigement.</p>
               </div>`,
        }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
        'Content-Type': 'application/json',
        },
    })
}

// calling the deno server to run http request
Deno.serve(sendEmail)





/* To invoke locally:

curl --request POST 'http://localhost:54321/functions/v1/sendEmail' \
  --header "Authorization: Bearer "${SUPABASE_ANON_KEY}\
  --header "Content-Type: application/json" \
  --data '{ "song_id": 2, "user_id": "6f93aba5-275c-4088-98d3-e6928f6c4ca7" }'

  or whatever user_id you have store in the DB.
  IMPORTANT TO CHANGE THE EMAIL ADDRESS IN THE CODE
  
  4. deploy supabase functions deploy sendEmail --no-verify-jwt

*/
