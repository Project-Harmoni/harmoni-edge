    /**
     * Supabase Edge Function: Wallet Creator
     * This program implements an edge function for Supabase that generates a new Ethereum wallet
     * using ethers.js and associates it with a user in the database. It ensures that each user
     * has only one wallet associated with their account. The function is triggered via an HTTP POST request.
    */
    
    import { createClient } from 'https://esm.sh/@supabase/supabase-js'
    import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8'

    /**
     * Adds a wallet to the user in the database if they don't already have one.
     * 
     * @param {Request} request - The incoming HTTP request.
     * @returns {Promise<Response>} - A response indicating the outcome of the operation.
     */
    async function addWalletToUserIfNotExist(request) {
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


        const alchemyEndpoint = Deno.env.get('ALCHEMY_URL')
        const alchemyProvider = new ethers.providers.JsonRpcProvider(alchemyEndpoint)

        const tokenContractAddress = '0x9C2B9b81e036F9c745Ff3EA129689f655D0a50C5'

        const tokenAbi = ["function balanceOf(address owner) view returns (uint256)", "function transfer(address to, uint value) returns (bool)"]

        // contract instance
        const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, alchemyProvider)
        const transferWallet = new ethers.Wallet(Deno.env.get('MASTER_KEY'), alchemyProvider)
        const contractWithSigner = tokenContract.connect(transferWallet)


        const privateKey = ethers.utils.randomBytes(32)  // new wallet for user

        const url = new URL(request.url)
        const wallet = new ethers.Wallet(privateKey, alchemyProvider) 
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

            const isListener = await isUserListener(supabase, userId)
                try {
                    if (isListener){
                        console.log(`User with ID ${userId} is a listener.`)
                        // if user is a listener give them 20 bonus token
                        await transferTokens(contractWithSigner ,address, 20)
                        console.log("Transfering Matic...")
                        await transferMatic(alchemyProvider, transferWallet, address, '.1')
                        //update bonus tokens in the database
                        await supabase
                            const { data: userData, error: error } = await supabase
                            .from('listeners')
                            .update({ tokens: 20 })
                            .eq('listener_id', userId);
                        if (error) {
                                console.error('Operational error fetching user:', fetchError);
                                throw new Error('Error adding tokens due to operational issue');
                            }
                    }                        
                } catch (error) {
                    return new Response(JSON.stringify({error: 'Error adding free tokens'}), {status: 404})
                }
           
            await updateUserKeys(supabase, userId, privateKey, address)
            console.log('User keys updated successfully:')

            return new Response(JSON.stringify({address}), {status: 202, headers: {'Content-Type': 'application/json'}})

        }catch (error){
            console.error('Error:', error)
            return new Response(JSON.stringify({error: error.message}), {status: 500, headers: {'Content-Type': 'application/json'}})
        }    
    }

    /**
     * Fetches user data from the Supabase database.
     * 
     * @param supabase - The Supabase client instance.
     * @param {string} userId - The ID of the user to fetch.
     * @returns {Promise<any>} - The user data, if found.
     */
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

    /**
     * Updates the user's keys in the database.
     * 
     * @param supabase - The Supabase client instance.
     * @param {string} userId - The ID of the user whose keys are being updated.
     * @param {Uint8Array} privateKey - The private key to be stored.
     * @param {string} address - The public address to be stored.
     */
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

    /** 
     * Checks if a given user is a listener in the database.
     * 
     * @param supabase - The initialized Supabase client to interact with the database.
     * @param userId - The ID of the user to check.
     * @returns A promise that resolves to true if the user is a listener, false otherwise.
     */
    async function isUserListener(supabase, userId){
        
        const {data, error} = await supabase
            .from('users')
            .select('user_type')
            .eq('user_id', userId)
            .single()

        if (error){
            throw new Error('Error retrieving user_type')
        }

        const isListener = data['user_type'] === 'listener'

        return isListener
    }
    
    /** 
     * Transfers tokens from a contract to a specified address.
     * 
     * @param contractWithSigner - The contract instance with a signer attached, allowing for transactions.
     * @param toAddress - The address to send tokens to.
     * @param amount - The amount of tokens to transfer.
     * @returns A promise that resolves when the transaction is sent.
     */
    async function transferTokens(contractWithSigner, toAddress, amount) {
    
        const amountInWei = ethers.utils.parseUnits(amount.toString(), 18)
    
        try{
            const transaction = await contractWithSigner.transfer(toAddress, amountInWei)
    
            //await transaction.wait()
            console.log(`Tokens transfer initiated: ${amount} to ${toAddress}`)
            //TO DO: add tokens to user as available
    
        }catch(error) {
            throw new Error('Transaction failed');      
        }    
    }

    /** 
     * Transfers MATIC to a specified recipient address.
     * 
     * @param provider - The Ethereum provider to interact with the network.
     * @param transferWallet - The wallet from which MATIC will be transferred.
     * @param recipientAddress - The address to receive the MATIC.
     * @param amount - The amount of MATIC to transfer.
     * @returns A promise that resolves when the MATIC transfer is initiated.
     */
    async function transferMatic(provider, transferWallet, recipientAddress, amount){

        const matic = ethers.utils.parseEther(amount);
        const gasPrice = await provider.getGasPrice();
        const increasedGasPrice = gasPrice.mul(200).div(100);
        
        try{
            const transaction = {
                to: recipientAddress,
                value: matic,
                gasPrice: increasedGasPrice
            }

            const response = await transferWallet.sendTransaction(transaction)
            //const receipt = await response.wait()
            console.log(`MATIC transfer initiated`)
        }catch (error){
            console.error('MATIC transfer failed', error)
        }

    }


    // Starts the Deno server to handle incoming HTTP requests
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



