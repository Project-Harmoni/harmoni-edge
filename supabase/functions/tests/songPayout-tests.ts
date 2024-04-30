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

  const testSongPayoutJackpot = async () => {
    var client = createClient(supabaseUrl, supabaseKey, options);

    // set artist_payout_percentage to 50 and payout threshold to 10

    // get balance of 
  }

  Deno.test("Client Creation Test", testClientCreation);