import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8'

async function purchaseTokens(request) {

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

    const userId = body.userId
    if (!userId){
        return new Response(JSON.stringify({error: 'Missing userId'}), {status: 400, headers: {'Content-Type': 'application/json'}})
    }

    const tokenQuantity = body.tokenQuantity
    if (!tokenQuantity){
        return new Response(JSON.stringify({error: 'Missing tokenQuantity'}), {status: 400, headers: {'Content-Type': 'application/json'}})
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: request.headers.get('Authorization')! } } }
    )

    try {
        const { data, error } = await supabase
            .from('users')
            .select('public_key')   
            .eq('user_id', userId)

        if (error) {
            console.error('Supabase error:', error);
            return new Response(JSON.stringify({ error: 'Error fetching data' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        if (!data || data.length === 0) {
            return new Response(JSON.stringify({ message: 'No records found for the specified user ID' }), 
            { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const { data: listenerData, error: listenerError } = await supabase
            .from('listeners')
            .select('tokens')   
            .eq('listener_id', userId)

        if (listenerError) {
            console.error('Supabase error:', listenerError);
            return new Response(JSON.stringify({ error: 'Error fetching listener data' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        if (!listenerData || listenerData.length === 0) {
            return new Response(JSON.stringify({ message: 'No records found for the specified song ID' }), 
            { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const newTokens = listenerData[0].tokens + parseInt(tokenQuantity)

        const {error: updateError} = await supabase
            .from('listeners')
            .update({tokens: newTokens})
            .eq("listener_id", userId)
        
        if (updateError){
            console.error('Supabase error:', updateError);
            return new Response(JSON.stringify({ updateError: 'Error updating listener data' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        try{
            await transferTokens(data[0].public_key, tokenQuantity)        
        }catch(error){
            return new Response(JSON.stringify({ updateError: 'Error  transfering tokens' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ data, listenerData}), { status: 200, headers: { 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error('Error in processing:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    
}

async function transferTokens(public_key, tokenQuantity) {
    console.log("Public key: ", public_key)
    console.log("Tokens: ")
    const alchemyEndpoint = Deno.env.get('ALCHEMY_URL')
    const alchemyProvider = new ethers.providers.JsonRpcProvider(alchemyEndpoint)
    const tokenContractAddress = Deno.env.get('TOKEN_CONTRACT_ADDRESS')
    const tokenAbi = ["function balanceOf(address owner) view returns (uint256)", "function transfer(address to, uint value) returns (bool)"]
    const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, alchemyProvider)

    const receiverWallet = public_key

    const transferWallet = new ethers.Wallet(Deno.env.get("MASTER_KEY"), alchemyProvider)
    const contractWithSigner = tokenContract.connect(transferWallet)
    const amountInWei = ethers.utils.parseUnits(tokenQuantity.toString(), 18)

    try {
        const transaction = await contractWithSigner.transfer(receiverWallet, amountInWei);
        console.log('Transfer successful', transaction);
    } catch (transferError) {
        console.error('Transfer error:', transferError);
        throw new Error("Failed to transfer tokens")  // Stop execution and handle the error appropriately
    }
}

Deno.serve(async (request) =>{

    return purchaseTokens(request)
     
     
 })

 /* curl --request POST 'http://localhost:54321/functions/v1/purchaseTokens' \
    --header 'Authorization: Bearer '${SUPABASE_ANON_KEY} \
    --header 'Content-Type: application/json' \
    --data '{ "userId": "'${USER_ID}'", "tokenQuantity": "'${TOKENS}'" }'
    */