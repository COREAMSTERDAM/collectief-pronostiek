import Link from "next/link";

export type NativeNavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

const defaultItems: NativeNavItem[] = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/community", label: "Community", icon: "◌" },
  { href: "/pronostiekpagina", label: "Pronostiek", icon: "⚽" },
  { href: "/club-card", label: "Club Card", icon: "▣" },
  { href: "/profielkeuze", label: "Profiel", icon: "○" },
];

type NativeBottomNavProps = {
  items?: NativeNavItem[];
  activeHref?: string;
};

export default function NativeBottomNav({
  items = defaultItems,
  activeHref,
}: NativeBottomNavProps) {
  return (
    <nav className="native-bottom-nav" aria-label="Hoofdnavigatie">
      <div className="native-bottom-nav-inner">
        {items.map((item) => {
          const active =
            activeHref === item.href ||
            (item.href !== "/" &&
              activeHref?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`native-nav-item ${
                active ? "native-nav-item-active" : ""
              }`}
            >
              <span className="native-nav-icon">
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="native-nav-badge">
                    {Math.min(item.badge, 99)}
                  </span>
                ) : null}
              </span>
              <span className="native-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
