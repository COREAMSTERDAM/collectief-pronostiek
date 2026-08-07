import HubCard from "@/components/navigation/HubCard";
import HubHeader from "@/components/navigation/HubHeader";

export default function ProfielKeuzePage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-5xl">
        <HubHeader
          eyebrow="Mijn account"
          title="Profiel en prestaties"
          description="Bekijk je persoonlijke gegevens en je resultaten binnen de app."
        />

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <HubCard
            href="/profiel"
            icon="👤"
            eyebrow="Profiel"
            title="Mijn profiel"
            description="Bekijk je profiel, avatar, statistieken en prestaties."
            action="Open mijn profiel"
            accent="white"
          />

          <HubCard
            href="/mijn-pronostieken"
            icon="📜"
            eyebrow="Pronostiek"
            title="Mijn voorspellingen"
            description="Bekijk alle pronostieken die je eerder hebt ingediend."
            action="Bekijk voorspellingen"
            accent="emerald"
          />

          <HubCard
            href="/iedereen-coach/mijn-opstellingen"
            icon="⚽"
            eyebrow="Iedereen Coach"
            title="Mijn opstellingen"
            description="Bekijk je eerdere basiselftallen per wedstrijd."
            action="Bekijk opstellingen"
            accent="emerald"
          />

          <HubCard
            href="/klassement"
            icon="🏆"
            eyebrow="Rangschikking"
            title="Mijn positie"
            description="Bekijk je huidige plaats in het pronostiekklassement."
            action="Open klassement"
            accent="emerald"
          />
        </section>
      </div>
    </main>
  );
}
