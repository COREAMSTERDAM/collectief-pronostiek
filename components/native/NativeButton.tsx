import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type SharedProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
};

type NativeButtonProps =
  | (SharedProps & {
      href: string;
      onClick?: never;
      type?: never;
      disabled?: never;
    })
  | (SharedProps &
      ButtonHTMLAttributes<HTMLButtonElement> & {
        href?: never;
      });

export default function NativeButton(
  props: NativeButtonProps,
) {
  const {
    children,
    variant = "primary",
    fullWidth = false,
    icon,
    className = "",
  } = props;

  const classes = [
    "native-button",
    `native-button-${variant}`,
    fullWidth ? "native-button-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {icon ? (
          <span className="native-button-icon">
            {icon}
          </span>
        ) : null}
        <span>{children}</span>
      </Link>
    );
  }

  const {
    type = "button",
    ...buttonProps
  } = props as SharedProps &
    ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
    >
      {icon ? (
        <span className="native-button-icon">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
