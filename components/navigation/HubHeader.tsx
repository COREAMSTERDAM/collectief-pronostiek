import Link from "next/link";

type HubHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

export default function HubHeader({
  eyebrow,
  title,
  description,
  backHref = "/",
  backLabel = "Terug naar dashboard",
}: HubHeaderProps) {
  return (
    <>
      <section className="ucl-card text-center">
        <img
          src="/logo.png"
          alt="Logo Collectief Wit en Zwet"
          className="ucl-logo"
        />

        <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
          {eyebrow}
        </p>

        <h1 className="ucl-title mt-3">{title}</h1>

        <p className="ucl-subtitle mx-auto max-w-2xl">{description}</p>
      </section>

      <div className="mt-6">
        <Link href={backHref} className="ucl-button-secondary">
          ← {backLabel}
        </Link>
      </div>
    </>
  );
}
