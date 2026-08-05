import Link from "next/link";

type NativeSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function NativeSectionHeader({
  eyebrow,
  title,
  actionHref,
  actionLabel = "Bekijk alles",
}: NativeSectionHeaderProps) {
  return (
    <div className="native-section-header">
      <div>
        {eyebrow ? (
          <p className="native-eyebrow">{eyebrow}</p>
        ) : null}

        <h2 className="native-section-title">
          {title}
        </h2>
      </div>

      {actionHref ? (
        <Link
          href={actionHref}
          className="native-section-action"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
