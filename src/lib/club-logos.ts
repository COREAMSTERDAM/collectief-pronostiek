export type ClubVisual = {
  name: string;
  logo?: string;
  aliases?: string[];
};

const CLUBS: ClubVisual[] = [
  {
    name: "Eendracht Aalst-Lede",
    logo: "/clubs/eendracht-aalst-lede.png",
    aliases: [
      "Eendracht Aalst Lede",
      "KSC Eendracht Aalst-Lede",
      "Koninklijke Eendracht Aalst Lede",
      "Eendracht Aalst",
    ],
  },
  {
    name: "K.V.K. Ninove",
    logo: "/clubs/ksvoudenaarde.png",
    aliases: ["KVK Ninove", "K.V.K Ninove", "K.V.K. Ninove"],
  },
  {
    name: "KSV Oudenaarde",
    logo: "/clubs/kvk-ninove.png",
    aliases: ["KSV Oudenaarde"],
  },
];

function normalizeClubName(value: string) {
  return value
    .toLocaleLowerCase("nl-BE")
    .replace(/[.]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getClubVisual(teamName: string): ClubVisual {
  const needle = normalizeClubName(teamName);

  const match = CLUBS.find((club) => {
    const candidates = [club.name, ...(club.aliases ?? [])];
    return candidates.some((candidate) => normalizeClubName(candidate) === needle);
  });

  return match ?? { name: teamName };
}

export function getClubInitials(teamName: string) {
  const parts = teamName
    .replace(/[.]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !["van", "de", "der", "het"].includes(part.toLowerCase()));

  return parts.slice(0, 3).map((part) => part[0]?.toUpperCase()).join("") || "FC";
}
