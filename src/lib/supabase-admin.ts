import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Maakt de service-role client pas aan wanneer een API-route hem gebruikt.
 *
 * Daardoor faalt `next build` niet tijdens "Collecting page data" wanneer
 * SUPABASE_SERVICE_ROLE_KEY nog niet is ingesteld. De API-route geeft dan
 * een duidelijke runtimefout terug.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ontbreekt in de omgevingsvariabelen.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ontbreekt in de omgevingsvariabelen.",
    );
  }

  cachedAdminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  return cachedAdminClient;
}
