    import { createClient } from 'https://esm.sh/@supabase/supabase-js'
    import {Web3} from 'https://esm.sh/web3'

    const web3 = new Web3()

    async function addWalletToUserIfNotExist(request) {

        const url = new URL(request.url)
        const userId = url.searchParams.get('userId') 
        const wallet = web3.eth.accounts.create()
        const privateKey = wallet.privateKey
        const publicKey = wallet.address

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
            
            await updateUserKeys(supabase, userId, privateKey, publicKey)
            console.log('User keys updated successfully:')

            return new Response(JSON.stringify({privateKey, publicKey}), {status: 202, headers: {'Content-Type': 'application/json'}})

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

    async function updateUserKeys(supabase, userId, privateKey, publicKey) {

        const {error: updateError} = await supabase
            .from('users')
            .update({
                private_key: privateKey,
                public_key: publicKey
            })
            .eq('user_id', userId)

        if (updateError) {
                throw new Error('Error updating user keys')
        }   
    }


    Deno.serve(async (request) =>{

        return addWalletToUserIfNotExist(request)
        
    })



