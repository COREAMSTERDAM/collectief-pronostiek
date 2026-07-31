"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FootballPitch from "@/components/coach/FootballPitch";
import FormationSelector from "@/components/coach/FormationSelector";
import PlayerSelectionModal from "@/components/coach/PlayerSelectionModal";
import {
  getActiveCoachPlayers,
  getActiveFormations,
  getFormationPositions,
  type CoachPlayer,
  type Formation,
  type FormationPosition,
} from "@/src/lib/coach";

export default function IedereenBondscoachPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedFormationId, setSelectedFormationId] = useState<number | null>(
    null,
  );
  const [positions, setPositions] = useState<FormationPosition[]>([]);
  const [players, setPlayers] = useState<CoachPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<
    Record<number, CoachPlayer>
  >({});
  const [activePosition, setActivePosition] =
    useState<FormationPosition | null>(null);
  const [isLoadingFormations, setIsLoadingFormations] = useState(true);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoadingFormations(true);
        setErrorMessage(null);

        const [formationResult, playerResult] = await Promise.all([
          getActiveFormations(),
          getActiveCoachPlayers(),
        ]);

        if (!isMounted) {
          return;
        }

        setFormations(formationResult);
        setPlayers(playerResult);

        if (formationResult.length > 0) {
          setSelectedFormationId(formationResult[0].id);
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

        if (isMounted) {
          setPositions(result);
          setSelectedPlayers({});
          setActivePosition(null);
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
  }, [selectedFormationId]);

  const closePlayerModal = useCallback(() => {
    setActivePosition(null);
  }, []);

  function handleSelectPlayer(player: CoachPlayer) {
    if (!activePosition) {
      return;
    }

    setSelectedPlayers((current) => ({
      ...current,
      [activePosition.id]: player,
    }));
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
    setActivePosition(null);
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
              Klik op een positie en wijs een actieve speler toe aan jouw ideale
              basiself. In deze sprint blijft de keuze tijdelijk in de browser.
            </p>
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

        {isLoadingFormations ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-12 text-center text-sm font-semibold text-white/55">
            Formaties en spelers laden…
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <FormationSelector
              formations={formations}
              selectedFormationId={selectedFormationId}
              disabled={isLoadingPositions}
              onChange={setSelectedFormationId}
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
