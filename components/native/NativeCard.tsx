import type { ReactNode } from "react";

type NativeCardProps = {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  interactive?: boolean;
};

export default function NativeCard({
  children,
  className = "",
  elevated = false,
  interactive = false,
}: NativeCardProps) {
  return (
    <section
      className={[
        "native-card",
        elevated ? "native-card-elevated" : "",
        interactive ? "native-card-interactive" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}
