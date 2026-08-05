import Link from "next/link";
import type { ReactNode } from "react";

type NativeTopBarProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  rightSlot?: ReactNode;
  compact?: boolean;
};

export default function NativeTopBar({
  eyebrow,
  title,
  description,
  backHref,
  rightSlot,
  compact = false,
}: NativeTopBarProps) {
  return (
    <header
      className={`native-topbar ${
        compact ? "native-topbar-compact" : ""
      }`}
    >
      <div className="native-topbar-row">
        {backHref ? (
          <Link
            href={backHref}
            className="native-icon-button"
            aria-label="Terug"
          >
            ←
          </Link>
        ) : null}

        <div className="native-topbar-copy">
          {eyebrow ? (
            <p className="native-eyebrow">{eyebrow}</p>
          ) : null}

          <h1 className="native-page-title">{title}</h1>

          {description ? (
            <p className="native-page-description">
              {description}
            </p>
          ) : null}
        </div>

        {rightSlot ? (
          <div className="native-topbar-actions">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </header>
  );
}
