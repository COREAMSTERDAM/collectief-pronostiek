import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chromium bevat eigen binaries die op Vercel op hun originele plek in
  // node_modules moeten blijven. Bundelen/verplaatsen breekt executablePath().
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // Neem de Chromium binaries expliciet mee in de serverless functions die
  // de Voetbal Vlaanderen-pagina renderen.
  outputFileTracingIncludes: {
    "/api/admin/football-cards": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/cron/football-cards": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
};

export default nextConfig;
