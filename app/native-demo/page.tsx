import AppShell from "@/components/native/AppShell";
import NativeButton from "@/components/native/NativeButton";
import NativeCard from "@/components/native/NativeCard";
import NativeListRow from "@/components/native/NativeListRow";
import NativeSectionHeader from "@/components/native/NativeSectionHeader";
import NativeTile from "@/components/native/NativeTile";
import NativeTopBar from "@/components/native/NativeTopBar";

export default function NativeDemoPage() {
  return (
    <AppShell activeHref="/">
      <NativeTopBar
        eyebrow="Collectief Wit en Zwet"
        title="Native UI"
        description="Voorbeeld van de nieuwe mobiele appstijl."
        rightSlot={
          <NativeButton
            href="/profiel"
            variant="secondary"
          >
            Profiel
          </NativeButton>
        }
      />

      <NativeSectionHeader
        eyebrow="Snel starten"
        title="Jouw modules"
      />

      <section className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4">
        <NativeTile
          href="/pronostiekpagina"
          icon="⚽"
          title="Pronostiek"
        />

        <NativeTile
          href="/iedereencoachkeuze"
          icon="🧠"
          title="Coach"
        />

        <NativeTile
          href="/motmpagina"
          icon="⭐"
          title="MOTM"
        />

        <NativeTile
          href="/community"
          icon="💬"
          title="Community"
          badge="Nieuw"
        />

        <NativeTile
          href="/klassement"
          icon="🏆"
          title="Ranking"
        />

        <NativeTile
          href="/profiel"
          icon="👤"
          title="Profiel"
        />
      </section>

      <NativeSectionHeader
        eyebrow="Vandaag"
        title="Actueel"
      />

      <NativeCard elevated>
        <NativeListRow
          href="/community"
          icon="💬"
          title="Community"
          subtitle="3 nieuwe berichten"
          trailing={
            <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-black">
              3
            </span>
          }
        />

        <NativeListRow
          href="/iedereencoachkeuze"
          icon="🧠"
          title="Iedereen Coach"
          subtitle="Nieuwe wedstrijd beschikbaar"
        />

        <NativeListRow
          href="/club-card"
          icon="💳"
          title="Club Card"
          subtitle="Bekijk saldo en laad op"
        />
      </NativeCard>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <NativeButton
          href="/community"
          fullWidth
          icon="💬"
        >
          Open community
        </NativeButton>

        <NativeButton
          href="/feedback"
          variant="secondary"
          fullWidth
          icon="✎"
        >
          Feedback
        </NativeButton>
      </div>
    </AppShell>
  );
}
