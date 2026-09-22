/**
 * Compatibility shim.
 *
 * Older deployments of this project contained a browser-based Voetbal Vlaanderen
 * importer in this path. The current implementation reads card statistics from
 * the official Eendracht Aalst-Lede club site instead and no longer depends on
 * Chromium or Puppeteer.
 *
 * Keeping this file prevents stale deployments / incremental copies from building
 * the obsolete implementation.
 */
export {
  fetchFootballCardsFromSource,
  getCachedFootballCards,
  rememberFootballCardsError,
  syncFootballCards,
} from "@/src/lib/clubsite-cards";

export type { FootballCardRecord } from "@/src/lib/clubsite-cards";
