import HubCard from "@/components/navigation/HubCard";
import HubHeader from "@/components/navigation/HubHeader";

export default function AdminKeuzePage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <HubHeader
          eyebrow="Admin"
          title="Beheer de applicatie"
          description="Kies welke gegevens of spelmodule je wilt beheren."
        />

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <HubCard
            href="/admin/gebruikers"
            icon="👥"
            eyebrow="Gebruikers"
            title="Gebruikersbeheer"
            description="Wijzig namen en e-mailadressen en verstuur wachtwoord-resetmails."
            action="Open gebruikersbeheer"
            accent="emerald"
          />

          <HubCard
            href="/admin"
            icon="⚽"
            eyebrow="Pronostiek"
            title="Wedstrijden en scores"
            description="Beheer wedstrijden, uitslagen, pronostieken en klassementgegevens."
            action="Open Pronostiek admin"
            accent="emerald"
          />

          <HubCard
            href="/admin/spelers"
            icon="⭐"
            eyebrow="Man van de Wedstrijd"
            title="Spelersbeheer"
            description="Beheer spelers en gegevens voor Man van de Wedstrijd."
            action="Open spelersbeheer"
            accent="emerald"
          />

          <HubCard
            href="/admin/coach-wedstrijden"
            icon="🧠"
            eyebrow="Iedereen Coach"
            title="Coachwedstrijden"
            description="Beheer actieve spelers, deadlines en finaliseer beoordelingen."
            action="Open Iedereen Coach admin"
            accent="emerald"
          />
          <HubCard
  href="/admin/community"
  icon="💬"
  eyebrow="Community"
  title="Communitybeheer"
  description="Beheer rollen, categorieën, kanalen en toegangsrechten."
  action="Open Community Admin"
  accent="emerald"
/>


          <HubCard
  href="/admin/feedback"
  icon="💬"
  eyebrow="Supporters"
  title="Feedback van supporters"
  description="Bekijk feedback, bugs, verbeterpunten en voorstellen voor nieuwe uitbreidingen."
  action="Open feedback"
  accent="rose"
/>
          <HubCard
            href="/admin/onderhoud"
            icon="🛠️"
            eyebrow="Systeem"
            title="Onderhoudsmodus"
            description="Zet de app tijdelijk in onderhoud en beheer wie toegang behoudt."
            action="Open onderhoudsbeheer"
            accent="emerald"
          />

        </section>
      </div>
    </main>
  );
}
