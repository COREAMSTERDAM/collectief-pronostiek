import Link from "next/link";

type HubCardProps = {
  href: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  accent?: "amber" | "sky" | "purple" | "emerald" | "rose" | "white";
};

const accents = {
  amber: {
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    hover: "hover:border-amber-300/30",
  },
  sky: {
    badge: "border-sky-400/30 bg-sky-500/10 text-sky-200",
    hover: "hover:border-sky-300/30",
  },
  purple: {
    badge: "border-purple-400/30 bg-purple-500/10 text-purple-200",
    hover: "hover:border-purple-300/30",
  },
  emerald: {
    badge: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    hover: "hover:border-emerald-300/30",
  },
  rose: {
    badge: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    hover: "hover:border-rose-300/30",
  },
  white: {
    badge: "border-white/15 bg-white/5 text-white/65",
    hover: "hover:border-white/25",
  },
};

export default function HubCard({
  href,
  icon,
  eyebrow,
  title,
  description,
  action,
  accent = "white",
}: HubCardProps) {
  const style = accents[accent];

  return (
    <Link
      href={href}
      className={`ucl-card group block h-full transition duration-200 hover:-translate-y-1 ${style.hover}`}
    >
      <div className="flex h-full flex-col">
        <div>
          <span
            className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.15em] ${style.badge}`}
          >
            {icon} {eyebrow}
          </span>

          <h2 className="mt-5 text-2xl font-black text-white">{title}</h2>

          <p className="mt-2 font-semibold leading-6 text-white/55">
            {description}
          </p>
        </div>

        <div className="mt-auto pt-5">
          <div className="ucl-button-secondary !mt-0">
            {action}
            <span className="ml-2 transition group-hover:translate-x-1">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
