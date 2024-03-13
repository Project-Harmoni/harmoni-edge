import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import {Web3} from 'https://esm.sh/web3'

// create wallet for a new user if no wallet exists
Deno.serve(async (_req) =>{

// Parse the URL and query parameters
const web3 = new Web3()
const url = new URL(_req.url)

const userId = url.searchParams.get('userId') 
const wallet = web3.eth.accounts.create()
const privateKey = wallet.privateKey
const publicKey = wallet.address


// check if user exists
// check if user has a wallet 
// if no wallet exists create a new wallet
// update user's private and public keys in the database
async function addWalletToNewUser(userId, privateKey, publicKey) {

    try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: _req.headers.get('Authorization')! } } }
        )

    const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('private_key, public_key')
        .eq('user_id', userId)
        .is('private_key', null)
        .is('public_key', null)
        .single()

    if (fetchError){
        console.error("Error fetching user: ", fetchError)
        return
    }

    if (!userData){
        console.error("Error fetching user:", fetchError)
        return
    }

    //Add wallets to user
    const {data: updateData, error: updateError} = await supabase
        .from('users')
        .update({
            private_key: privateKey,
            public_key: publicKey
         })
        .eq('user_id', userId)

    if (updateError) {
        console.error('Error updating user keys: ', updateError)
        return
    }

    console.log('User keys updated successfully:', updateData);

    
    } catch (err) {
     // return new Response(String(err?.message ?? err), { status: 500 })
    }
    
}

    addWalletToNewUser(userId, privateKey, publicKey)

    return new Response(JSON.stringify({ wallet }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    
})

// mine new tokens and add the equivalent of 20 free tokens to a wallet


