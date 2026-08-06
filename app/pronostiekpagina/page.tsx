import NativeButton from "@/components/native/NativeButton";
import NativeCard from "@/components/native/NativeCard";
import NativeListRow from "@/components/native/NativeListRow";
import NativeTopBar from "@/components/native/NativeTopBar";

export default function PronostiekPage() {
  return (
    <div className="native-screen native-module-screen native-pronostiek-screen">
      <NativeTopBar
        eyebrow="Pronostiek"
        title="Maak je keuze"
        description="Alles voor je voorspellingen op één plek."
        backHref="/"
        compact
      />

      <NativeCard
        className="native-primary-card native-module-hero"
        elevated
      >
        <div className="native-primary-card-copy">
          <p className="native-eyebrow">
            Volgende actie
          </p>

          <h2 className="native-primary-title">
            Pronostiek invullen
          </h2>

          <p className="native-primary-description">
            Bekijk de komende wedstrijden en dien je voorspelling tijdig in.
          </p>
        </div>

        <NativeButton
          href="/wedstrijden"
          fullWidth
          icon={<span aria-hidden="true">⚽</span>}
        >
          Open wedstrijden
          <span aria-hidden="true">›</span>
        </NativeButton>
      </NativeCard>

      <section className="native-module-section">
        <p className="native-section-title">
          Mijn pronostiek
        </p>

        <NativeCard className="native-list-card native-module-list">
          <NativeListRow
            href="/mijn-pronostieken"
            icon="📜"
            title="Mijn pronostieken"
            subtitle="Bekijk je voorspellingen en behaalde punten."
          />

          <NativeListRow
            href="/klassement"
            icon="🏆"
            title="Klassement"
            subtitle="Bekijk je positie en de algemene rangschikking."
          />
        </NativeCard>
      </section>

      <section className="native-pronostiek-shortcuts">
        <NativeButton
          href="/"
          variant="secondary"
          fullWidth
        >
          Naar home
        </NativeButton>

        <NativeButton
          href="/meldingen"
          variant="ghost"
          fullWidth
        >
          Meldingen
        </NativeButton>
      </section>
    </div>
  );
}
