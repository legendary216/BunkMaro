import 'expo-sqlite/localStorage/install'; // This activates the memory
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual keys from the Supabase Dashboard
const supabaseUrl = "https://qpihzloevskinrbskghe.supabase.co";
const supabasePublishableKey = "sb_publishable_fp7P0U3BR3x6KJahtv0BYA_ySrsb5cK";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage, // Uses the SQLite 'memory' we installed
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile apps
  },
});