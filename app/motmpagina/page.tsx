import HubCard from "@/components/navigation/HubCard";
import HubHeader from "@/components/navigation/HubHeader";

export default function ManVanDeWedstrijdPage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-5xl">
        <HubHeader
          eyebrow="Man van de Wedstrijd"
          title="Maak je keuze"
          description="Stem op je uitblinker, bekijk de uitslagen en volg het seizoensklassement."
        />

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <HubCard
            href="/man-van-de-wedstrijd/stemmen"
            icon="🗳️"
            eyebrow="Stemmen"
            title="Breng je stem uit"
            description="Kies de 3 beste spelers van een wedstrijd zolang de stemming open is."
            action="Open stemmingen"
            accent="purple"
          />

          <HubCard
            href="/man-van-de-wedstrijd/uitslagen"
            icon="📊"
            eyebrow="Historiek"
            title="Uitslagen per wedstrijd"
            description="Bekijk eerdere winnaars en de verdeling van de stemmen."
            action="Bekijk uitslagen"
            accent="sky"
          />

          <HubCard
            href="/speler-van-het-seizoen"
            icon="🏆"
            eyebrow="Seizoen"
            title="Speler van het seizoen"
            description="Volg welke speler over het hele seizoen de meeste stemmen verzamelt."
            action="Open seizoensklassement"
            accent="amber"
          />
        </section>
      </div>
    </main>
  );
}
