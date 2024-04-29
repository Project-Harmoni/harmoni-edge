/**
 * Test Suite Description:
 * This suite tests the integration of Supabase and Ethereum blockchain functionality
 * in a music streaming platform, focusing on user wallet interactions and token transactions.
 * 
 * Required Environment Variables:
 * - SUPABASE_URL: URL to your Supabase project for database interactions.
 * - SUPABASE_ANON_KEY: Anonymous key for accessing the Supabase project.
 * - ALCHEMY_URL: Endpoint URL for the Alchemy API to interact with the Ethereum blockchain.
 * - TOKEN_CONTRACT_ADDRESS: Smart contract address on the Ethereum blockchain for token management.
 * 
 * Each test verifies a critical functionality:
 * - Creating and querying from the Supabase client.
 * - Transactional operations like purchasing tokens and updating wallet balances.
 * - Consistency checks between on-chain and off-chain data.
 */

// Import required libraries and modules
import "https://deno.land/x/dotenv/load.ts"
import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8'

import {
  assert,
  assertExists,
  assertEquals,
} from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0'
import { delay } from 'https://deno.land/x/delay@v0.2.0/mod.ts'

// Set up the configuration for the Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
}

// Test for verifying that the Supabase client is correctly set up and can perform basic queries.
const testClientCreation = async () => {
    var client: SupabaseClient = createClient(supabaseUrl, supabaseKey, options)
  
    // Verify if the Supabase URL and key are provided
    if (!supabaseUrl) throw new Error('supabaseUrl is required.')
    if (!supabaseKey) throw new Error('supabaseKey is required.')
  
    // Test a simple query to the database
    const { data: table_data, error: table_error } = await client
      .from('users')
      .select('*')
      .limit(1)
    if (table_error) {
      throw new Error('Invalid Supabase client: ' + table_error.message)
    }
    assert(table_data, 'Data should be returned from the query.')
  }

// Test for simulating a token purchase process for a listener, ensuring that token data is updated accordingly.
const testListenerPurchaseTokens = async () => {
    console.log("Test listener can purchase tokens")
    var client = createClient(supabaseUrl, supabaseKey, options);

    console.log("Select listener from database")

    const {data: listenerData, error: listenerError} = await client
        .from('listeners')
        .select('listener_id')
        .limit(1)
        .single()
        if(listenerError){
            console.log('error accessing listener')
        }

    const {data: tokenData, error: tokenError} = await client
        .from('listeners')
        .select('tokens')
        .eq('listener_id', listenerData.listener_id)
        .single()
        if(tokenError){
            console.log('error accessing tokens')
        }

        console.log("Tokens: ", tokenData.tokens)
        const newTokens = tokenData.tokens + 1
        
    console.log("Purchase one token")
    const { data: func_data, error: func_error } = await client.functions.invoke('purchaseTokens', {
      body: { userId: listenerData.listener_id, tokenQuantity: "1" }
    });

    // Check for errors from the function invocation
    if (func_error) {
        throw new Error('Invalid response: ' + func_error.message);
      }

    // Log the response from the function
    console.log(JSON.stringify(func_data.data, null, 2));

    console.log("Get new token value for listener")
    const {data: newTokenData, error: newTokenError} = await client
        .from('listeners')
        .select('tokens')
        .eq('listener_id', listenerData.listener_id)
        .single()
        if(tokenError){
            console.log('error accessing tokens')
        }
        console.log("New token value: ", newTokenData.tokens)
  
    // Assert that the function returned the expected result
    assertEquals(func_data.data, "Purchase processed");
    assertEquals(newTokenData.tokens, newTokens)
  }

  // Test for ensuring that artists can also purchase tokens and that their balances are updated correctly.
  const testArtistPurchaseTokens = async () => {
    console.log("Test artist can purchase tokens")
    var client = createClient(supabaseUrl, supabaseKey, options);

    console.log("Select Artist from database")

    const {data: artistData, error: artistError} = await client
        .from('artists')
        .select('artist_id')
        .limit(1)
        .single()
        if(artistError){
            console.log('error accessing listener')
        }

    const {data: tokenData, error: tokenError} = await client
        .from('artists')
        .select('tokens')
        .eq('artist_id', artistData.artist_id)
        .single()
        if(tokenError){
            console.log('error accessing tokens')
        }

        console.log("Tokens: ", tokenData.tokens)
        const newTokens = tokenData.tokens + 1
        
    console.log("Purchase one token")
    // Invoke the 'hello-world' function with a parameter
    const { data: func_data, error: func_error } = await client.functions.invoke('purchaseTokens', {
      body: { userId: artistData.artist_id, tokenQuantity: "1" }
    });

    // Check for errors from the function invocation
    if (func_error) {
        throw new Error('Invalid response: ' + func_error.message);
      }

    // Log the response from the function
    console.log(JSON.stringify(func_data.data, null, 2));

    console.log("Get new token value for listener")
    const {data: newTokenData, error: newTokenError} = await client
        .from('artists')
        .select('tokens')
        .eq('artist_id', artistData.artist_id)
        .single()
        if(tokenError){
            console.log('error accessing tokens')
        }
        console.log("New token value: ", newTokenData.tokens)
  
    // Assert that the function returned the expected result
    assertEquals(func_data.data, "Purchase processed");
    assertEquals(newTokenData.tokens, newTokens)
  }

  // Test to ensure that the token balances in the blockchain match the records in the database after a token transaction.
  const testDatabaseTokensMatchBlockchain = async () => {
    console.log("Test blockchain token balance matches database token balance after purchase")
    const alchemyUrl = Deno.env.get('ALCHEMY_URL')
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl)
    const tokenContractAddress = Deno.env.get('TOKEN_CONTRACT_ADDRESS')
    const tokenAbi = ["function balanceOf(address owner) view returns (uint256)"]
    const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, provider)

    var client = createClient(supabaseUrl, supabaseKey, options);

    console.log("Select listener from database")

    const {data: listenerData, error: listenerError} = await client
        .from('listeners')
        .select('listener_id')
        .limit(1)
        .single()
        if(listenerError){
            console.log('error accessing listener')
        }
    
    const {data: publicKeyData, error: publicKeyError} = await client
        .from('users')
        .select('public_key')
        .eq('user_id', listenerData.listener_id)
        .single()
   
    console.log("Purchase one token")
    // Invoke the 'hello-world' function with a parameter
    const { data: func_data, error: func_error } = await client.functions.invoke('purchaseTokens', {
      body: { userId: listenerData.listener_id, tokenQuantity: "1" }
    });

    // Check for errors from the function invocation
    if (func_error) {
        throw new Error('Invalid response: ' + func_error.message);
      }

    await new Promise(resolve => setTimeout(resolve, 10000));

    // Log the response from the function
    console.log(JSON.stringify(func_data.data, null, 2));

    console.log("Get new token value for listener")
    const {data: newTokenData, error: newTokenError} = await client
        .from('listeners')
        .select('tokens')
        .eq('listener_id', listenerData.listener_id)
        .single()
        if(newTokenError){
            console.log('error accessing tokens')
        }
        let newTokens = newTokenData.tokens
        console.log("New Tokens Balance: ", newTokens)

    const balance = await (tokenContract as any).balanceOf(publicKeyData.public_key);
    const balanceInTokens = ethers.utils.formatUnits(balance, 18)
    console.log("Blockchain token balance: ", balanceInTokens)
  
    // Assert that the function returned the expected result
    assertEquals(func_data.data, "Purchase processed");
    assertEquals(parseFloat(newTokenData.tokens), parseFloat(balanceInTokens))
  }

  Deno.test("Client Creation Test", testClientCreation);
  Deno.test("Listener Purchase Token Test", testListenerPurchaseTokens);
  Deno.test("Artist Purchase Token Test", testArtistPurchaseTokens);
  Deno.test("Database token value matches Blockchain total value after token purchase", testDatabaseTokensMatchBlockchain);

