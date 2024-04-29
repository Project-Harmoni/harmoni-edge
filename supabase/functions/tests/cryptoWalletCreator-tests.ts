// Import required libraries and modules
import "https://deno.land/x/dotenv/load.ts"
import { ethers } from 'https://cdn.skypack.dev/ethers@5.6.8'

import {
  assert,
  assertExists,
  assertEquals,
  assertThrows
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



// Test the creation and functionality of the Supabase client
const testClientCreation = async () => {
    const client = createClient(supabaseUrl, supabaseKey, options)
  
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

  // Test that a new wallet and private key are created for a listener 
  // At least one listener must exist in the local database and their id must be
  // in the .env for this test environment
  const testListenerWalletCreation = async () => {

    var client = createClient(supabaseUrl, supabaseKey, options);
    const userId = Deno.env.get('LISTENER_ID')
    console.log("Test new wallet for listener is created")
    
    const { error } = await client
        .from('users')
        .update({ private_key: null, public_key: null })
        .eq('user_id', userId)
        if (error) {
            throw new Error('Unable to update client keys: ' + error.message)
          }

    const { data: func_data, error: func_error } = await client.functions.invoke('cryptoWalletCreator', {
    body: { userId: userId }
    }); 
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    const {data: walletData, error: errorData} = await client
          .from('users')
          .select('public_key, private_key')
          .eq('user_id', userId)
          .single()
          if (errorData) {
            throw new Error('Unable to retrieve publicKey: ' + errorData.message)
          }
    
    assert(walletData.public_key !== null, 'Public key should not be null.');
    assert(walletData.public_key, 'Data should be returned from the query.');
    assert(walletData.private_key !== null, 'Private key should not be null.');
    assert(walletData.private_key, 'Data should be returned from the query.');
    
  }

  const testListenerBonusTokens = async () => {
    var client = createClient(supabaseUrl, supabaseKey, options)
    const userId = Deno.env.get('LISTENER_ID')
    console.log("Test Listener received bonus 25 tokens and 0.25 Matic for gas")
    const alchemyUrl = Deno.env.get('ALCHEMY_URL')
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl)
    const tokenContractAddress = Deno.env.get('TOKEN_CONTRACT_ADDRESS')
    const tokenAbi = ["function balanceOf(address owner) view returns (uint256)"]
    const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, provider)

    const {data, error} = await client
      .from('users')
      .select('public_key')
      .eq('user_id', userId)
      .single()
    
    const balance = await (tokenContract as any).balanceOf(data.public_key)
    const balanceInTokens = ethers.utils.formatUnits(balance, 18)
    console.log("Blockchain token balance: ", balanceInTokens)

    const {data: tokenData, error: tokenError } = await client
      .from('listeners')
      .select('tokens')
      .eq('listener_id', userId)
      .single()

    const databaseTokens = tokenData.tokens
    console.log("Database Tokens: ", databaseTokens)

    const maticBalance = await provider.getBalance(data.public_key)
    const balanceInMatic = ethers.utils.formatEther(maticBalance)
    console.log("Listener Matic balance: ", balanceInMatic)

    assertEquals(parseFloat(balanceInTokens), 25.0, "Blockchain token balance equals 25")
    assertEquals(parseFloat(databaseTokens), 25.0, "Database token balance equals 25")
    assertEquals(parseFloat(balanceInMatic), 0.025)
    
  }

  const testArtistWalletCreation = async () => {

    var client = createClient(supabaseUrl, supabaseKey, options);
    const userId = Deno.env.get('ARTIST_ID')
    console.log("Test new wallet for artist is created")
    
    const { error } = await client
        .from('users')
        .update({ private_key: null, public_key: null })
        .eq('user_id', userId)
        if (error) {
            throw new Error('Unable to update client keys: ' + error.message)
          }

    const { data: func_data, error: func_error } = await client.functions.invoke('cryptoWalletCreator', {
    body: { userId: userId }
    }); 

    await new Promise(resolve => setTimeout(resolve, 10000));
    

    const {data: walletData, error: errorData} = await client
          .from('users')
          .select('public_key, private_key')
          .eq('user_id', userId)
          .single()
          if (errorData) {
            throw new Error('Unable to retrieve publicKey: ' + errorData.message)
          }
    
    assert(walletData.public_key !== null, 'Public key should not be null.');
    assert(walletData.public_key, 'Data should be returned from the query.');
    assert(walletData.private_key !== null, 'Private key should not be null.');
    assert(walletData.private_key, 'Data should be returned from the query.');
    
  }

  const testArtistBonusTokens = async () => {
    var client = createClient(supabaseUrl, supabaseKey, options)
    const userId = Deno.env.get('ARTIST_ID')
    console.log("Test artist received no bonus tokens and 0.25 Matic for gas")
    const alchemyUrl = Deno.env.get('ALCHEMY_URL')
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl)
    const tokenContractAddress = Deno.env.get('TOKEN_CONTRACT_ADDRESS')
    const tokenAbi = ["function balanceOf(address owner) view returns (uint256)"]
    const tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, provider)

    const {data, error} = await client
      .from('users')
      .select('public_key')
      .eq('user_id', userId)
      .single()
    
    const balance = await (tokenContract as any).balanceOf(data.public_key)
    const balanceInTokens = ethers.utils.formatUnits(balance, 18)
    console.log("Blockchain token balance: ", balanceInTokens)

    const {data: tokenData, error: tokenError } = await client
      .from('artists')
      .select('tokens')
      .eq('artist_id', userId)
      .single()

    const databaseTokens = tokenData.tokens
    console.log("Database Tokens: ", databaseTokens)

    const maticBalance = await provider.getBalance(data.public_key)
    const balanceInMatic = ethers.utils.formatEther(maticBalance)
    console.log("Artist Matic balance: ", balanceInMatic)

    assertEquals(parseFloat(balanceInTokens), 0.0, "Blockchain token balance equals 25")
    assertEquals(parseFloat(databaseTokens), 0.0, "Database token balance equals 25")
    assertEquals(parseFloat(balanceInMatic), 0.025)
    
  }

  const testWalletOnlyCreatedOnce = async() => {
    var client = createClient(supabaseUrl, supabaseKey, options)
    const userId = Deno.env.get('ARTIST_ID')
    console.log("Test that a status 404 error is returned is user already has a wallet")

    try {
      const { data: func_data, error: func_error } = await client.functions.invoke('cryptoWalletCreator', {
          body: { userId: userId }
      });

      if (func_error) {
          if(func_error.context.body) await func_error.context.body.cancel()
          throw new Error(func_error.context.status);        
      }

      assertEquals(func_data, "Expected Value", "The data should contain the expected value.");
      
    } catch (error) {
        console.error("Status: ", error);
        const statusCode = parseInt(error.message, 10);
        assertEquals(statusCode, 404, "Expected error status 404 for users with an existing wallet");
    }
  }

  Deno.test("Client Creation Test", testClientCreation)
  Deno.test("Listener Test Wallet Creation", testListenerWalletCreation)
  Deno.test("Test Listener Receives Bonus Tokens and .025 Matic For Gas Fees", testListenerBonusTokens )
  Deno.test("Artist Test Wallet Creation", testArtistWalletCreation)
  Deno.test("Test Artist Receives No Bonus Tokens and .025 Matic For Gas Fees", testArtistBonusTokens )
  Deno.test("Test that a wallet is only created once if a user already has one", testWalletOnlyCreatedOnce)