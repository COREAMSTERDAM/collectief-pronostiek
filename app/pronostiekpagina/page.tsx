import HubCard from "@/components/navigation/HubCard";
import HubHeader from "@/components/navigation/HubHeader";

export default function PronostiekPage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-5xl">
        <HubHeader
          eyebrow="Pronostiek"
          title="Maak je keuze"
          description="Voorspel wedstrijden, bekijk je eigen pronostieken of volg het klassement."
        />

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <HubCard
            href="/wedstrijden"
            icon="📅"
            eyebrow="Wedstrijden"
            title="Pronostiek invullen"
            description="Bekijk de wedstrijden en vul je voorspelling in vóór de aftrap."
            action="Open wedstrijden"
            accent="sky"
          />

          <HubCard
            href="/mijn-pronostieken"
            icon="📜"
            eyebrow="Historiek"
            title="Mijn pronostieken"
            description="Bekijk je ingediende voorspellingen en de behaalde punten."
            action="Bekijk mijn pronostieken"
            accent="white"
          />

          <HubCard
            href="/klassement"
            icon="🏆"
            eyebrow="Rangschikking"
            title="Pronostiekklassement"
            description="Bekijk wie aan de leiding staat en hoe je zelf presteert."
            action="Open klassement"
            accent="emerald"
          />
        </section>
      </div>
    </main>
  );
}
