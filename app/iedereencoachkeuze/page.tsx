import HubCard from "@/components/navigation/HubCard";
import HubHeader from "@/components/navigation/HubHeader";

export default function IedereenCoachKeuzePage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <HubHeader
          eyebrow="Iedereen Coach"
          title="Supporterscoach"
          description="Stel je basiself samen, beoordeel spelers en ontdek wat de community kiest."
        />

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <HubCard
            href="/iedereen-coach"
            icon="⚽"
            eyebrow="Opstelling"
            title="Elftal indienen"
            description="Kies een open wedstrijd en stel jouw ideale basiself samen."
            action="Stel je elftal samen"
            accent="amber"
          />

          <HubCard
            href="/iedereen-coach/beoordelen"
            icon="⭐"
            eyebrow="Na de wedstrijd"
            title="Spelers beoordelen"
            description="Geef actieve spelers een cijfer zolang de beoordelingsperiode open is."
            action="Open beoordelingen"
            accent="sky"
          />

          <HubCard
            href="/iedereen-coach/mijn-opstellingen"
            icon="📚"
            eyebrow="Persoonlijk archief"
            title="Mijn vorige opstellingen"
            description="Bekijk je eigen basiselftallen van gesloten wedstrijden."
            action="Bekijk mijn opstellingen"
            accent="white"
          />

          <HubCard
            href="/iedereen-coach/beoordelingen-archief"
            icon="🗂️"
            eyebrow="Resultaten"
            title="Archief spelersbeoordelingen"
            description="Bekijk per wedstrijd de definitieve gemiddelde spelersscores."
            action="Open beoordelingsarchief"
            accent="purple"
          />

          <HubCard
            href="/iedereen-coach/collectief"
            icon="👥"
            eyebrow="Community"
            title="Collectieve opstellingen"
            description="Ontdek de populairste spelers en formaties over alle wedstrijden."
            action="Bekijk collectieve keuzes"
            accent="emerald"
          />

          <HubCard
            href="/iedereen-coach/klassement"
            icon="📈"
            eyebrow="Coachpunten"
            title="Coachklassement"
            description="Bekijk welke supporters de meeste punten verzamelden met hun basiself."
            action="Open coachklassement"
            accent="amber"
          />

          <HubCard
            href="/iedereen-coach/spelershistoriek"
            icon="👤"
            eyebrow="Spelers"
            title="Puntenhistoriek spelers"
            description="Bekijk de gemiddelde beoordelingen van spelers over het seizoen."
            action="Open spelershistoriek"
            accent="sky"
          />

          <HubCard
            href="/iedereen-coach/analytics"
            icon="📊"
            eyebrow="Analyse"
            title="Community analytics"
            description="Bekijk formatietrends, populaire spelers en collectieve inzichten."
            action="Open analytics"
            accent="white"
          />
        </section>
      </div>
    </main>
  );
}
