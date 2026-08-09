import NativeButton from "@/components/native/NativeButton";
import NativeCard from "@/components/native/NativeCard";
import NativeListRow from "@/components/native/NativeListRow";
import NativeTopBar from "@/components/native/NativeTopBar";

export default function IedereenCoachKeuzePage() {
  return (
    <div className="native-screen native-module-screen native-coach-screen">
      <NativeTopBar
        eyebrow="Iedereen Coach"
        title="Supporterscoach"
        description="Stel je elftal samen, beoordeel spelers en volg de community."
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
            Elftal indienen
          </h2>

          <p className="native-primary-description">
            Kies een open wedstrijd en stel jouw ideale basiself samen.
          </p>
        </div>

        <NativeButton
          href="/iedereen-coach"
          fullWidth
          icon={<span aria-hidden="true">⚽</span>}
        >
          Stel je elftal samen
          <span aria-hidden="true">›</span>
        </NativeButton>
      </NativeCard>

      <section className="native-module-section">
        <p className="native-section-title">
          Mijn coachspel
        </p>

        <NativeCard className="native-list-card native-module-list">
          <NativeListRow
            href="/iedereen-coach/beoordelen"
            icon="⭐"
            title="Spelers beoordelen"
            subtitle="Geef spelers een cijfer na de wedstrijd."
          />

          <NativeListRow
            href="/iedereen-coach/mijn-opstellingen"
            icon="📚"
            title="Mijn opstellingen"
            subtitle="Bekijk je eerder ingediende elftallen."
          />

          <NativeListRow
            href="/iedereen-coach/klassement"
            icon="📈"
            title="Coachklassement"
            subtitle="Bekijk je positie en de algemene rangschikking."
          />
        </NativeCard>
      </section>

      <section className="native-module-section">
        <p className="native-section-title">
          Community & analyse
        </p>

        <NativeCard className="native-list-card native-module-list">
          <NativeListRow
  href="/motmpagina"
  icon="⭐"
  title="Man van de wedstrijd"
  subtitle="Stem op jouw man van de match en bekijk de uitslagen."
/>

          <NativeListRow
            href="/iedereen-coach/collectief"
            icon="👥"
            title="Collectieve opstellingen"
            subtitle="Bekijk populaire spelers en formaties."
          />

          <NativeListRow
            href="/iedereen-coach/beoordelingen-archief"
            icon="🗂️"
            title="Beoordelingsarchief"
            subtitle="Bekijk definitieve gemiddelde spelersscores."
          />

          <NativeListRow
            href="/iedereen-coach/spelershistoriek"
            icon="👤"
            title="Spelershistoriek"
            subtitle="Volg beoordelingen over het seizoen."
          />

          <NativeListRow
            href="/iedereen-coach/analytics"
            icon="📊"
            title="Community analytics"
            subtitle="Ontdek trends en collectieve inzichten."
          />
        </NativeCard>
      </section>

      <section className="native-coach-shortcuts">
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
