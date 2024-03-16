    import { createClient } from 'https://esm.sh/@supabase/supabase-js'
    import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8';

    
    async function addWalletToUserIfNotExist(request) {

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

        const userId = body.userId
        console.log("UserId = ", userId)
        if (!userId){
            return new Response(JSON.stringify({error: 'Missing userId'}), {status: 400, headers: {'Content-Type': 'application/json'}})
        }


        const alchemyEndpoint = Deno.env.get('ALCHEMY_URL')
        console.log("Alchemy URL: ", Deno.env.get('ALCHEMY_URL'))
        const alchemyProvider = new ethers.providers.JsonRpcProvider(alchemyEndpoint)

        const privateKey = ethers.utils.randomBytes(32)
        console.log("Private Key: ", ethers.utils.hexlify(privateKey))  // remove in production

        const url = new URL(request.url)
        const wallet = new ethers.Wallet(privateKey, alchemyProvider) // remove in production
        const address = wallet.address

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: request.headers.get('Authorization')! } } }
        )

        try {
            const userData = await fetchUser(supabase, userId)
            if (!userData){
                console.log('No user found or user already has a wallet')
                return new Response(JSON.stringify({error: 'No user found or user already has a wallet'}), {status: 404})
            }
            
            await updateUserKeys(supabase, userId, privateKey, address)
            console.log('User keys updated successfully:')

            return new Response(JSON.stringify({address}), {status: 202, headers: {'Content-Type': 'application/json'}})

        }catch (error){
            console.error('Error:', error)
            return new Response(JSON.stringify({error: error.message}), {status: 500, headers: {'Content-Type': 'application/json'}})
        }    
    }

    async function fetchUser(supabase, userId){
        
        const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('private_key, public_key')
        .eq('user_id', userId)
        .is('private_key', null)
        .is('public_key', null)
        .maybeSingle()

        if (fetchError) {
            console.error('Operational error fetching user:', fetchError);
            throw new Error('Error fetching user data due to operational issue');
        }
        return userData
    }

    async function updateUserKeys(supabase, userId, privateKey, address) {

        const {error: updateError} = await supabase
            .from('users')
            .update({
                private_key: ethers.utils.hexlify(privateKey),
                public_key: address
            })
            .eq('user_id', userId)

        if (updateError) {
                throw new Error('Error updating user keys')
        }   
    }


    Deno.serve(async (request) =>{

        return addWalletToUserIfNotExist(request)
        
    })


    /* To invoke locally:

    1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
    2. Make an HTTP request:

    curl --request POST 'http://localhost:54321/functions/v1/cryptoWalletCreator' \
    --header 'Authorization: Bearer '${SUPABASE_ANON_KEY} \
    --header 'Content-Type: application/json' \
    --data '{ "userId": "'${USER_ID}'" }'

    (note, you can set SUPABASE_ANON_KEY via 
    export SUPABASE_ANONK_KEY=(copy-paste appropriate value here)
    in your terminal window.)

    */



