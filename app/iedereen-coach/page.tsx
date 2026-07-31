"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FootballPitch from "@/components/coach/FootballPitch";
import FormationSelector from "@/components/coach/FormationSelector";
import PlayerSelectionModal from "@/components/coach/PlayerSelectionModal";
import SaveLineupPanel from "@/components/coach/SaveLineupPanel";
import {
  getActiveCoachPlayers,
  getActiveCoachTeams,
  getActiveFormations,
  getFormationPositions,
  getSavedUserLineup,
  saveUserLineup,
  submitSavedUserLineup,
  type CoachPlayer,
  type CoachTeam,
  type Formation,
  type FormationPosition,
  type SavedLineup,
} from "@/src/lib/coach";

function createLineupSignature(
  formationId: number | null,
  selectedPlayers: Record<number, CoachPlayer>,
) {
  const assignments = Object.entries(selectedPlayers)
    .map(([positionId, player]) => `${positionId}:${player.id}`)
    .sort()
    .join("|");

  return `${formationId ?? "none"}::${assignments}`;
}

export default function IedereenBondscoachPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [teams, setTeams] = useState<CoachTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<CoachTeam | null>(null);
  const [selectedFormationId, setSelectedFormationId] = useState<number | null>(
    null,
  );
  const [positions, setPositions] = useState<FormationPosition[]>([]);
  const [players, setPlayers] = useState<CoachPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<
    Record<number, CoachPlayer>
  >({});
  const [savedLineup, setSavedLineup] = useState<SavedLineup | null>(null);
  const [pendingSavedLineup, setPendingSavedLineup] =
    useState<SavedLineup | null>(null);
  const [lastSavedSignature, setLastSavedSignature] = useState("");
  const [activePosition, setActivePosition] =
    useState<FormationPosition | null>(null);
  const [isLoadingFormations, setIsLoadingFormations] = useState(true);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedFormation = useMemo(
    () =>
      formations.find((formation) => formation.id === selectedFormationId) ??
      null,
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
    () => createLineupSignature(selectedFormationId, selectedPlayers),
    [selectedFormationId, selectedPlayers],
  );

  const hasChanges = currentSignature !== lastSavedSignature;

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoadingFormations(true);
        setErrorMessage(null);

        const [formationResult, playerResult, teamResult] = await Promise.all([
          getActiveFormations(),
          getActiveCoachPlayers(),
          getActiveCoachTeams(),
        ]);

        if (!isMounted) {
          return;
        }

        setFormations(formationResult);
        setPlayers(playerResult);
        setTeams(teamResult);

        const firstTeam = teamResult[0] ?? null;
        setSelectedTeam(firstTeam);

        if (!firstTeam) {
          setErrorMessage(
            "Er is geen actief team ingesteld voor Iedereen Bondscoach.",
          );
          return;
        }

        const existingLineup = await getSavedUserLineup(firstTeam.id);

        if (!isMounted) {
          return;
        }

        setSavedLineup(existingLineup);
        setPendingSavedLineup(existingLineup);

        const initialFormationId =
          existingLineup?.formation_id ?? formationResult[0]?.id ?? null;

        setSelectedFormationId(initialFormationId);

        if (!existingLineup && initialFormationId !== null) {
          setLastSavedSignature(
            createLineupSignature(initialFormationId, {}),
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "De gegevens konden niet worden geladen.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingFormations(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedFormationId === null) {
      setPositions([]);
      return;
    }

    const formationId = selectedFormationId;
    let isMounted = true;

    async function loadPositions() {
      try {
        setIsLoadingPositions(true);
        setErrorMessage(null);

        const result = await getFormationPositions(formationId);

        if (!isMounted) {
          return;
        }

        setPositions(result);
        setActivePosition(null);

        if (
          pendingSavedLineup &&
          pendingSavedLineup.formation_id === formationId
        ) {
          const loadedSelections: Record<number, CoachPlayer> = {};

          for (const assignment of pendingSavedLineup.playerAssignments) {
            const player = players.find(
              (item) => item.id === assignment.player_id,
            );

            if (player) {
              loadedSelections[assignment.formation_position_id] = player;
            }
          }

          setSelectedPlayers(loadedSelections);
          setLastSavedSignature(
            createLineupSignature(formationId, loadedSelections),
          );
          setPendingSavedLineup(null);
        } else {
          setSelectedPlayers({});
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPositions([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "De posities konden niet worden geladen.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingPositions(false);
        }
      }
    }

    void loadPositions();

    return () => {
      isMounted = false;
    };
  }, [pendingSavedLineup, players, selectedFormationId]);

  const closePlayerModal = useCallback(() => {
    setActivePosition(null);
  }, []);

  function handleFormationChange(formationId: number) {
    setSuccessMessage(null);
    setErrorMessage(null);
    setPendingSavedLineup(null);
    setSelectedPlayers({});
    setSelectedFormationId(formationId);
  }

  function handleSelectPlayer(player: CoachPlayer) {
    if (!activePosition) {
      return;
    }

    setSelectedPlayers((current) => ({
      ...current,
      [activePosition.id]: player,
    }));
    setSuccessMessage(null);
    setActivePosition(null);
  }

  function handleRemovePlayer() {
    if (!activePosition) {
      return;
    }

    setSelectedPlayers((current) => {
      const updated = { ...current };
      delete updated[activePosition.id];
      return updated;
    });
    setSuccessMessage(null);
    setActivePosition(null);
  }

  async function handleSaveLineup() {
    if (
      !selectedTeam ||
      !selectedFormation ||
      isSaving ||
      Object.keys(selectedPlayers).length === 0
    ) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const assignments = Object.entries(selectedPlayers).map(
        ([formationPositionId, player]) => ({
          formationPositionId: Number(formationPositionId),
          playerId: player.id,
        }),
      );

      const lineupId = await saveUserLineup({
        teamId: selectedTeam.id,
        formationId: selectedFormation.id,
        assignments,
      });

      const isComplete =
        assignments.length === selectedFormation.player_count;

      if (isComplete) {
        await submitSavedUserLineup(lineupId);
      }

      const savedAt = new Date().toISOString();

      setSavedLineup({
        id: lineupId,
        team_id: selectedTeam.id,
        formation_id: selectedFormation.id,
        is_complete: isComplete,
        updated_at: savedAt,
        playerAssignments: assignments.map((assignment) => ({
          formation_position_id: assignment.formationPositionId,
          player_id: assignment.playerId,
        })),
      });
      setLastSavedSignature(currentSignature);

      setSuccessMessage(
        isComplete
          ? "✅ Je volledige basiself werd opgeslagen en als nieuwe inzending geregistreerd."
          : "✅ Je voorlopige opstelling werd opgeslagen. Je kunt later verder werken.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De opstelling kon niet worden opgeslagen.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-amber-300/[0.07] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200/70">
              Collectief Pronostiek
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Iedereen Bondscoach
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Stel jouw ideale basiself samen en bewaar je keuze. Volledige
              opstellingen worden als historische inzending opgeslagen voor
              de latere collectieve analyses.
            </p>

            {selectedTeam ? (
              <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-white/35">
                Team: {selectedTeam.name}
              </p>
            ) : null}
          </div>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100"
          >
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100"
          >
            {successMessage}
          </div>
        ) : null}

        {isLoadingFormations ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-12 text-center text-sm font-semibold text-white/55">
            Formaties, spelers en je opgeslagen opstelling laden…
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <FormationSelector
                formations={formations}
                selectedFormationId={selectedFormationId}
                disabled={isLoadingPositions || isSaving}
                onChange={handleFormationChange}
              />

              {selectedFormation && !isLoadingPositions ? (
                positions.length > 0 ? (
                  <FootballPitch
                    formationName={selectedFormation.name}
                    positions={positions}
                    selectedPlayers={selectedPlayers}
                    onPositionClick={setActivePosition}
                  />
                ) : (
                  <div className="flex min-h-72 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-center text-sm text-white/50">
                    Voor deze formatie zijn nog geen posities ingesteld.
                  </div>
                )
              ) : (
                <div className="flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm font-semibold text-white/55">
                  Veld laden…
                </div>
              )}
            </div>

            {selectedFormation ? (
              <SaveLineupPanel
                selectedCount={Object.keys(selectedPlayers).length}
                requiredCount={selectedFormation.player_count}
                isSaving={isSaving}
                hasChanges={hasChanges}
                lastSavedAt={savedLineup?.updated_at ?? null}
                onSave={() => {
                  void handleSaveLineup();
                }}
              />
            ) : null}
          </>
        )}
      </div>

      <PlayerSelectionModal
        isOpen={activePosition !== null}
        position={activePosition}
        players={players}
        selectedPlayerIds={selectedPlayerIds}
        currentPlayerId={currentPlayerId}
        onSelect={handleSelectPlayer}
        onRemove={handleRemovePlayer}
        onClose={closePlayerModal}
      />
    </main>
  );
}
