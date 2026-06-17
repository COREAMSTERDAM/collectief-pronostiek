import { createClient } from "@supabase/supabase-js";



const supabaseUrl =

  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdrmofnnbgkszpeusclp.supabase.co";



const supabaseAnonKey =

  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Lc7sogS0VXaOk6tXxtK_zA_3fS8P6qh";



export const supabase = createClient(supabaseUrl, supabaseAnonKey);