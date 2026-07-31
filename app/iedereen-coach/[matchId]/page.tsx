"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import FootballPitch from "@/components/coach/FootballPitch";
import FormationSelector from "@/components/coach/FormationSelector";
import MatchDeadline, {
  getMatchLineupDeadline,
} from "@/components/coach/MatchDeadline";
import MatchLineupActions from "@/components/coach/MatchLineupActions";
import PlayerSelectionModal from "@/components/coach/PlayerSelectionModal";
import {
  getActiveCoachPlayers,
  getActiveCoachTeams,
  getActiveFormations,
  getFormationPositions,
  type CoachPlayer,
  type CoachTeam,
  type Formation,
  type FormationPosition,
} from "@/src/lib/coach";
import {
  getCoachMatch,
  getMyMatchLineup,
  saveMatchLineup,
  submitMatchLineup,
  type CoachMatch,
  type MatchLineup,
} from "@/src/lib/coach-match-editor";

function createSignature(
  formationId: number | null,
  selectedPlayers: Record<number, CoachPlayer>,
) {
  const assignments = Object.entries(selectedPlayers)
    .map(([positionId, player]) => `${positionId}:${player.id}`)
    .sort()
    .join("|");

  return `${formationId ?? "none"}::${assignments}`;
}

function buildSelectedPlayers(
  lineup: MatchLineup,
  players: CoachPlayer[],
) {
  const playersById = new Map(
    players.map((player) => [player.id, player]),
  );
  const result: Record<number, CoachPlayer> = {};

  for (const assignment of lineup.player_assignments) {
    const player = playersById.get(assignment.player_id);

    if (player) {
      result[assignment.formation_position_id] = player;
    }
  }

  return result;
}

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MatchCoachEditorPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = Number(params.matchId);

  const [match, setMatch] = useState<CoachMatch | null>(null);
  const [team, setTeam] = useState<CoachTeam | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [players, setPlayers] = useState<CoachPlayer[]>([]);
  const [positions, setPositions] = useState<FormationPosition[]>([]);
  const [selectedFormationId, setSelectedFormationId] =
    useState<number | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<
    Record<number, CoachPlayer>
  >({});
  const [savedLineup, setSavedLineup] = useState<MatchLineup | null>(null);
  const [activePosition, setActivePosition] =
    useState<FormationPosition | null>(null);
  const [lastSavedSignature, setLastSavedSignature] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedFormation = useMemo(
    () =>
      formations.find(
        (formation) => formation.id === selectedFormationId,
      ) ?? null,
    [formations, selectedFormationId],
  );

  const selectedPlayerIds = useMemo(
    () => Object.values(selectedPlayers).map((player) => player.id),
    [selectedPlayers],
  );

  const currentPlayerId = activePosition
    ? selectedPlayers[activePosition.id]?.id ?? null
    : null;

  const currentSignature = useMemo(
    () => createSignature(selectedFormationId, selectedPlayers),
    [selectedFormationId, selectedPlayers],
  );

  const hasChanges = currentSignature !== lastSavedSignature;

  const deadline = match
    ? getMatchLineupDeadline(match.kickoff)
    : null;

  const isClosed = deadline !== null && now >= deadline;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isClosed) {
      setActivePosition(null);
    }
  }, [isClosed]);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const { data: userData, error: userError } =
          await (
            await import("@/src/lib/supabase")
          ).supabase.auth.getUser();

        if (userError || !userData.user) {
          window.location.href = "/login?reason=login-required";
          return;
        }

        if (!Number.isInteger(matchId) || matchId <= 0) {
          throw new Error("Ongeldige wedstrijd.");
        }

        const [matchResult, teamResult, formationResult, playerResult] =
          await Promise.all([
            getCoachMatch(matchId),
            getActiveCoachTeams(),
            getActiveFormations(),
            getActiveCoachPlayers(),
          ]);

        if (!mounted) return;

        if (!matchResult) {
          throw new Error("Deze wedstrijd werd niet gevonden.");
        }

        const activeTeam = teamResult[0] ?? null;

        if (!activeTeam) {
          throw new Error("Er is geen actief coachteam ingesteld.");
        }

        const existingLineup = await getMyMatchLineup(
          activeTeam.id,
          matchId,
        );

        if (!mounted) return;

        const formationId =
          existingLineup?.formation_id ??
          formationResult[0]?.id ??
          null;

        if (formationId === null) {
          throw new Error("Er is geen actieve formatie beschikbaar.");
        }

        const positionResult =
          await getFormationPositions(formationId);

        if (!mounted) return;

        const restoredPlayers = existingLineup
          ? buildSelectedPlayers(existingLineup, playerResult)
          : {};

        setMatch(matchResult);
        setTeam(activeTeam);
        setFormations(formationResult);
        setPlayers(playerResult);
        setSavedLineup(existingLineup);
        setSelectedFormationId(formationId);
        setPositions(positionResult);
        setSelectedPlayers(restoredPlayers);
        setLastSavedSignature(
          createSignature(formationId, restoredPlayers),
        );
        setNow(Date.now());
      } catch (error) {
        if (!mounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "De wedstrijdeditor kon niet worden geladen.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [matchId]);

  const closeModal = useCallback(() => {
    setActivePosition(null);
  }, []);

  async function handleFormationChange(formationId: number) {
    if (
      isClosed ||
      loadingPositions ||
      saving ||
      submitting ||
      formationId === selectedFormationId
    ) {
      return;
    }

    try {
      setLoadingPositions(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await getFormationPositions(formationId);

      setSelectedFormationId(formationId);
      setPositions(result);
      setSelectedPlayers({});
      setActivePosition(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De formatie kon niet worden geladen.",
      );
    } finally {
      setLoadingPositions(false);
    }
  }

  function handleSelectPlayer(player: CoachPlayer) {
    if (!activePosition || isClosed) return;

    setSelectedPlayers((current) => ({
      ...current,
      [activePosition.id]: player,
    }));
    setSuccessMessage("");
    setActivePosition(null);
  }

  function handleRemovePlayer() {
    if (!activePosition || isClosed) return;

    setSelectedPlayers((current) => {
      const updated = { ...current };
      delete updated[activePosition.id];
      return updated;
    });

    setSuccessMessage("");
    setActivePosition(null);
  }

  function getAssignments() {
    return Object.entries(selectedPlayers).map(
      ([formationPositionId, player]) => ({
        formationPositionId: Number(formationPositionId),
        playerId: player.id,
      }),
    );
  }

  async function saveConcept() {
    if (
      !team ||
      !match ||
      !selectedFormation ||
      isClosed ||
      saving ||
      submitting ||
      Object.keys(selectedPlayers).length === 0
    ) {
      return null;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const lineupId = await saveMatchLineup({
        teamId: team.id,
        matchId: match.id,
        formationId: selectedFormation.id,
        assignments: getAssignments(),
      });

      const updatedAt = new Date().toISOString();
      const complete =
        Object.keys(selectedPlayers).length ===
        selectedFormation.player_count;

      setSavedLineup({
        id: lineupId,
        team_id: team.id,
        match_id: match.id,
        formation_id: selectedFormation.id,
        is_complete: complete,
        created_at: savedLineup?.created_at ?? updatedAt,
        updated_at: updatedAt,
        deadline: new Date(
          getMatchLineupDeadline(match.kickoff),
        ).toISOString(),
        is_open: true,
        player_assignments: getAssignments().map((assignment) => ({
          formation_position_id:
            assignment.formationPositionId,
          player_id: assignment.playerId,
        })),
      });

      setLastSavedSignature(currentSignature);
      setSuccessMessage("✅ Je concept werd opgeslagen.");

      return lineupId;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Het concept kon niet worden opgeslagen.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitLineup() {
    if (
      !selectedFormation ||
      isClosed ||
      submitting ||
      saving ||
      Object.keys(selectedPlayers).length !==
        selectedFormation.player_count
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      let lineupId = savedLineup?.id ?? null;

      if (!lineupId || hasChanges) {
        lineupId = await saveConcept();
      }

      if (!lineupId) {
        return;
      }

      await submitMatchLineup(lineupId);

      setSuccessMessage(
        "✅ Je basiself werd definitief ingediend. Tot de deadline kun je nog wijzigingen maken en opnieuw indienen.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De basiself kon niet worden ingediend.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
            Wedstrijdeditor laden…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        {match && selectedFormation ? (
          <>
            <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-amber-300/[0.07] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
                Iederiejn Coach
              </p>

              <h1 className="mt-3 text-center text-2xl font-black sm:text-4xl">
                {match.home_team}
                <span className="mx-3 text-amber-200/60">VS</span>
                {match.away_team}
              </h1>

              <p className="mt-4 text-center text-sm font-bold capitalize text-white/55">
                {formatKickoff(match.kickoff)}
              </p>
            </header>

            <div className="mt-6">
              <MatchDeadline kickoff={match.kickoff} now={now} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <FormationSelector
                formations={formations}
                selectedFormationId={selectedFormationId}
                disabled={
                  isClosed ||
                  loadingPositions ||
                  saving ||
                  submitting
                }
                onChange={(formationId) => {
                  void handleFormationChange(formationId);
                }}
              />

              {loadingPositions ? (
                <div className="flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-white/50">
                  Veld laden…
                </div>
              ) : (
                <FootballPitch
                  formationName={selectedFormation.name}
                  positions={positions}
                  selectedPlayers={selectedPlayers}
                  disabled={isClosed}
                  onPositionClick={(position) => {
                    if (!isClosed) {
                      setActivePosition(position);
                    }
                  }}
                />
              )}
            </div>

            <div className="mt-6">
              <MatchLineupActions
                selectedCount={Object.keys(selectedPlayers).length}
                requiredCount={selectedFormation.player_count}
                isClosed={isClosed}
                isSaving={saving}
                isSubmitting={submitting}
                hasChanges={hasChanges}
                hasSavedLineup={savedLineup !== null}
                lastSavedAt={savedLineup?.updated_at ?? null}
                onSave={() => {
                  void saveConcept();
                }}
                onSubmit={() => {
                  void submitLineup();
                }}
              />
            </div>
          </>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/iedereen-coach"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black transition hover:bg-white/10"
          >
            ← Terug naar wedstrijden
          </Link>

          {match ? (
            <Link
              href={`/iedereen-coach/${match.id}/collectief`}
              className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black transition hover:bg-white/10"
            >
              Collectieve basiself
            </Link>
          ) : null}
        </div>
      </div>

      <PlayerSelectionModal
        isOpen={!isClosed && activePosition !== null}
        position={activePosition}
        players={players}
        selectedPlayerIds={selectedPlayerIds}
        currentPlayerId={currentPlayerId}
        onSelect={handleSelectPlayer}
        onRemove={handleRemovePlayer}
        onClose={closeModal}
      />
    </main>
  );
}
