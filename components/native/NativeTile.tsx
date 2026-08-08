import Image from "next/image";
import Link from "next/link";

type NativeTileProps = {
  href: string;
  title: string;
  image?: string;
  icon?: string;
  badge?: string;
  subtitle?: string;
  disabled?: boolean;
};

export default function NativeTile({
  href,
  title,
  image,
  icon,
  badge,
  subtitle,
  disabled = false,
}: NativeTileProps) {
  const content = (
    <>
      <div className="native-tile-icon-wrap">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="96px"
            className="native-tile-image object-contain p-1.5"
          />
        ) : (
          <span
            className="native-tile-fallback-icon"
            aria-hidden="true"
          >
            {icon ?? "•"}
          </span>
        )}

        {badge ? (
          <span className="native-tile-badge">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="native-tile-copy">
        <p className="native-tile-title">
          {title}
        </p>

        {subtitle ? (
          <p className="native-tile-subtitle">
            {subtitle}
          </p>
        ) : null}
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className="native-tile native-tile-disabled">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="native-tile"
    >
      {content}
    </Link>
  );
}