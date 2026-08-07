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
import PlayerSelectionModal, {
  type PlayerSelectionTarget,
} from "@/components/coach/PlayerSelectionModal";
import SubstituteBench from "@/components/coach/SubstituteBench";
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

type ActiveSelection =
  | { kind: "starter"; position: FormationPosition }
  | { kind: "substitute"; benchOrder: number }
  | null;

function createSignature(
  formationId: number | null,
  starters: Record<number, CoachPlayer>,
  substitutes: Record<number, CoachPlayer>,
) {
  const starterSignature = Object.entries(starters)
    .map(([positionId, player]) => `S${positionId}:${player.id}`)
    .sort()
    .join("|");

  const substituteSignature = Object.entries(substitutes)
    .map(([benchOrder, player]) => `B${benchOrder}:${player.id}`)
    .sort()
    .join("|");

  return `${formationId ?? "none"}::${starterSignature}::${substituteSignature}`;
}

function restoreLineup(
  lineup: MatchLineup,
  players: CoachPlayer[],
) {
  const playersById = new Map(
    players.map((player) => [player.id, player]),
  );

  const starters: Record<number, CoachPlayer> = {};
  const substitutes: Record<number, CoachPlayer> = {};

  for (const assignment of lineup.player_assignments) {
    const player = playersById.get(assignment.player_id);
    if (!player) continue;

    if (
      assignment.selection_type === "starter" &&
      assignment.formation_position_id !== null
    ) {
      starters[assignment.formation_position_id] = player;
    }

    if (
      assignment.selection_type === "substitute" &&
      assignment.bench_order !== null
    ) {
      substitutes[assignment.bench_order] = player;
    }
  }

  return { starters, substitutes };
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
  const [selectedStarters, setSelectedStarters] = useState<
    Record<number, CoachPlayer>
  >({});
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<
    Record<number, CoachPlayer>
  >({});
  const [savedLineup, setSavedLineup] = useState<MatchLineup | null>(null);
  const [activeSelection, setActiveSelection] =
    useState<ActiveSelection>(null);
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
    () => [
      ...Object.values(selectedStarters).map((player) => player.id),
      ...Object.values(selectedSubstitutes).map((player) => player.id),
    ],
    [selectedStarters, selectedSubstitutes],
  );

  const currentPlayerId = useMemo(() => {
    if (activeSelection?.kind === "starter") {
      return selectedStarters[activeSelection.position.id]?.id ?? null;
    }

    if (activeSelection?.kind === "substitute") {
      return selectedSubstitutes[activeSelection.benchOrder]?.id ?? null;
    }

    return null;
  }, [activeSelection, selectedStarters, selectedSubstitutes]);

  const modalTarget: PlayerSelectionTarget | null = useMemo(() => {
    if (activeSelection?.kind === "starter") {
      return {
        code: activeSelection.position.position_code,
        label: activeSelection.position.position_label,
        kind: "starter",
      };
    }

    if (activeSelection?.kind === "substitute") {
      return {
        code: `BANK ${activeSelection.benchOrder}`,
        label: `Bankzitter ${activeSelection.benchOrder}`,
        kind: "substitute",
      };
    }

    return null;
  }, [activeSelection]);

  const currentSignature = useMemo(
    () =>
      createSignature(
        selectedFormationId,
        selectedStarters,
        selectedSubstitutes,
      ),
    [selectedFormationId, selectedStarters, selectedSubstitutes],
  );

  const hasChanges = currentSignature !== lastSavedSignature;
  const starterCount = Object.keys(selectedStarters).length;
  const substituteCount = Object.keys(selectedSubstitutes).length;

  const deadline = match
    ? getMatchLineupDeadline(match.kickoff)
    : null;

  const isClosed = deadline !== null && now >= deadline;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isClosed) setActiveSelection(null);
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

        const restored = existingLineup
          ? restoreLineup(existingLineup, playerResult)
          : { starters: {}, substitutes: {} };

        setMatch(matchResult);
        setTeam(activeTeam);
        setFormations(formationResult);
        setPlayers(playerResult);
        setSavedLineup(existingLineup);
        setSelectedFormationId(formationId);
        setPositions(positionResult);
        setSelectedStarters(restored.starters);
        setSelectedSubstitutes(restored.substitutes);
        setLastSavedSignature(
          createSignature(
            formationId,
            restored.starters,
            restored.substitutes,
          ),
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
        if (mounted) setLoading(false);
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [matchId]);

  const closeModal = useCallback(() => {
    setActiveSelection(null);
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
      setSelectedStarters({});
      // De bank blijft behouden bij een formatiewissel.
      setActiveSelection(null);
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
    if (!activeSelection || isClosed) return;

    if (activeSelection.kind === "starter") {
      setSelectedStarters((current) => ({
        ...current,
        [activeSelection.position.id]: player,
      }));
    } else {
      setSelectedSubstitutes((current) => ({
        ...current,
        [activeSelection.benchOrder]: player,
      }));
    }

    setSuccessMessage("");
    setActiveSelection(null);
  }

  function handleRemovePlayer() {
    if (!activeSelection || isClosed) return;

    if (activeSelection.kind === "starter") {
      setSelectedStarters((current) => {
        const updated = { ...current };
        delete updated[activeSelection.position.id];
        return updated;
      });
    } else {
      setSelectedSubstitutes((current) => {
        const updated = { ...current };
        delete updated[activeSelection.benchOrder];
        return updated;
      });
    }

    setSuccessMessage("");
    setActiveSelection(null);
  }

  function getStarterAssignments() {
    return Object.entries(selectedStarters).map(
      ([formationPositionId, player]) => ({
        formationPositionId: Number(formationPositionId),
        playerId: player.id,
      }),
    );
  }

  function getSubstituteAssignments() {
    return Object.entries(selectedSubstitutes).map(
      ([benchOrder, player]) => ({
        benchOrder: Number(benchOrder),
        playerId: player.id,
      }),
    );
  }

  async function saveConcept() {
    const totalCount = starterCount + substituteCount;

    if (
      !team ||
      !match ||
      !selectedFormation ||
      isClosed ||
      saving ||
      submitting ||
      totalCount === 0
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
        starterAssignments: getStarterAssignments(),
        substituteAssignments: getSubstituteAssignments(),
      });

      const updatedAt = new Date().toISOString();
      const complete =
        starterCount === selectedFormation.player_count &&
        substituteCount === 5;

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
        player_assignments: [
          ...getStarterAssignments().map((assignment) => ({
            selection_type: "starter" as const,
            formation_position_id:
              assignment.formationPositionId,
            bench_order: null,
            player_id: assignment.playerId,
          })),
          ...getSubstituteAssignments().map((assignment) => ({
            selection_type: "substitute" as const,
            formation_position_id: null,
            bench_order: assignment.benchOrder,
            player_id: assignment.playerId,
          })),
        ],
      });

      setLastSavedSignature(currentSignature);
      setSuccessMessage("✅ Je selectie werd als concept opgeslagen.");

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
      starterCount !== selectedFormation.player_count ||
      substituteCount !== 5
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

      if (!lineupId) return;

      await submitMatchLineup(lineupId);

      setSuccessMessage(
        "✅ Je selectie van 11 basisspelers en 5 bankzitters werd definitief ingediend. Tot de deadline kun je nog wijzigen en opnieuw indienen.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De selectie kon niet worden ingediend.",
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
            <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-emerald-300/[0.07] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
                Iedereen Coach
              </p>

              <h1 className="mt-3 text-center text-2xl font-black sm:text-4xl">
                {match.home_team}
                <span className="mx-3 text-emerald-200/60">VS</span>
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
                  selectedPlayers={selectedStarters}
                  disabled={isClosed}
                  onPositionClick={(position) => {
                    if (!isClosed) {
                      setActiveSelection({
                        kind: "starter",
                        position,
                      });
                    }
                  }}
                />
              )}
            </div>

            <SubstituteBench
              selectedPlayers={selectedSubstitutes}
              disabled={isClosed}
              onSlotClick={(benchOrder) => {
                if (!isClosed) {
                  setActiveSelection({
                    kind: "substitute",
                    benchOrder,
                  });
                }
              }}
            />

            <div className="mt-6">
              <MatchLineupActions
                starterCount={starterCount}
                requiredStarterCount={selectedFormation.player_count}
                substituteCount={substituteCount}
                requiredSubstituteCount={5}
                isClosed={isClosed}
                isSaving={saving}
                isSubmitting={submitting}
                hasChanges={hasChanges}
                hasSavedLineup={savedLineup !== null}
                lastSavedAt={savedLineup?.updated_at ?? null}
                onSave={() => void saveConcept()}
                onSubmit={() => void submitLineup()}
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
              Collectieve selectie
            </Link>
          ) : null}
        </div>
      </div>

      <PlayerSelectionModal
        isOpen={!isClosed && activeSelection !== null}
        target={modalTarget}
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
