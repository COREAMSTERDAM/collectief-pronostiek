export type MembershipRoute = {
  key: string;
  title: string;
  description: string;
  patterns: string[];
};

export const MEMBERSHIP_ROUTES: MembershipRoute[] = [
  {
    key: "home",
    title: "Home",
    description: "Dashboard en algemene startpagina.",
    patterns: ["/"],
  },
  {
    key: "pronostiek",
    title: "Pronostiek",
    description: "Pronostieken en historiek.",
    patterns: ["/pronostiekpagina", "/wedstrijden", "/pronostiekhistoriek"],
  },
  {
    key: "klassement",
    title: "Klassement",
    description: "Algemene rangschikking.",
    patterns: ["/klassement"],
  },
  {
    key: "community",
    title: "Community",
    description: "Communitykanalen en gesprekken.",
    patterns: ["/community", "/community/*"],
  },
  {
    key: "iedereen-coach",
    title: "Iedereen Coach",
    description: "Opstellingen, beoordelingen en coachanalytics.",
    patterns: ["/iedereencoachkeuze", "/iedereen-coach", "/iedereen-coach/*"],
  },
  {
    key: "motm",
    title: "Man van de wedstrijd",
    description: "Stemmen en resultaten.",
    patterns: ["/motmpagina", "/motmpagina/*"],
  },
];

export const MEMBERSHIP_BYPASS_PREFIXES = [
  "/login",
  "/registreren",
  "/wachtwoord-vergeten",
  "/wachtwoord-resetten",
  "/admin",
  "/api",
  "/profielkeuze",
  "/app-uiterlijk",
];

function matches(pattern: string, pathname: string) {
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return pathname === pattern;
}

export function routeKeyForPath(pathname: string) {
  return MEMBERSHIP_ROUTES.find((route) =>
    route.patterns.some((pattern) => matches(pattern, pathname)),
  )?.key ?? null;
}

export function isMembershipBypassPath(pathname: string) {
  return MEMBERSHIP_BYPASS_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );
}
