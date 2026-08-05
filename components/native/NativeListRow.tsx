import Link from "next/link";
import type { ReactNode } from "react";

type NativeListRowProps = {
  href?: string;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
};

export default function NativeListRow({
  href,
  icon,
  title,
  subtitle,
  trailing,
}: NativeListRowProps) {
  const content = (
    <>
      {icon ? (
        <div className="native-list-icon">{icon}</div>
      ) : null}

      <div className="native-list-copy">
        <p className="native-list-title">{title}</p>

        {subtitle ? (
          <p className="native-list-subtitle">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="native-list-trailing">
        {trailing ?? <span>›</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="native-list-row">
        {content}
      </Link>
    );
  }

  return <div className="native-list-row">{content}</div>;
}
