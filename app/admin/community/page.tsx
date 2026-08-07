import HubCard from "@/components/navigation/HubCard";
import HubHeader from "@/components/navigation/HubHeader";

export default function CommunityAdminPage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <HubHeader
          eyebrow="Community Admin"
          title="Beheer de community"
          description="Beheer rollen, categorieën, kanalen en hun toegangsrechten."
        />

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <HubCard
            href="/admin/community/rollen"
            icon="🎭"
            eyebrow="Rollen"
            title="Rollen beheren"
            description="Voeg rollen toe, wijzig hun naam, kleur, icoon en status."
            action="Open rollenbeheer"
            accent="emerald"
          />

          <HubCard
            href="/admin/community/structuur"
            icon="🧱"
            eyebrow="Structuur"
            title="Categorieën en kanalen"
            description="Bekijk en beheer de Discord-achtige communitystructuur."
            action="Open structuur"
            accent="emerald"
          />

          <HubCard
            href="/admin/community/rechten"
            icon="🔐"
            eyebrow="Rechten"
            title="Rollenmatrix"
            description="Bepaal per categorie welke rol mag lezen, schrijven of beheren."
            action="Open rechtenmatrix"
            accent="emerald"
          />

          <HubCard
            href="/community"
            icon="💬"
            eyebrow="Voorbeeld"
            title="Community bekijken"
            description="Bekijk de community zoals een ingelogde gebruiker."
            action="Open community"
            accent="emerald"
          />
          <HubCard
  href="/admin/community/gebruikersrollen"
  icon="👥"
  eyebrow="Gebruikers"
  title="Gebruikersrollen"
  description="Ken één of meerdere communityrollen toe aan gebruikers."
  action="Open gebruikersrollen"
  accent="emerald"
/>

<HubCard
  href="/admin/community/kanaalrechten"
  icon="🔏"
  eyebrow="Kanalen"
  title="Kanaalrechten"
  description="Laat kanalen rechten overnemen of stel eigen uitzonderingen in."
  action="Open kanaalrechten"
  accent="emerald"
/>
        </section>
      </div>
    </main>
  );
}
