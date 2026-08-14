import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconName =
  | "chevron-left"
  | "chevron-right"
  | "clipboard"
  | "copy"
  | "file"
  | "format"
  | "header-collapse"
  | "header-expand";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
}

function ButtonIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    "chevron-left": <path d="m15 18-6-6 6-6" />,
    "chevron-right": <path d="m9 18 6-6-6-6" />,
    clipboard: (
      <>
        <rect width="14" height="15" x="5" y="5" rx="2" />
        <path d="M9 5V3h6v2M9 10h6M9 14h6" />
      </>
    ),
    copy: (
      <>
        <rect width="13" height="13" x="8" y="8" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M9 13h6M9 17h6" />
      </>
    ),
    format: (
      <>
        <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" />
        <path d="m8 15 4-7 4 7M9.5 12.5h5" />
      </>
    ),
    "header-collapse": (
      <>
        <path d="M4 5h16M7 9h10" />
        <path d="m8 17 4-4 4 4" />
      </>
    ),
    "header-expand": (
      <>
        <path d="M4 5h16M7 9h10" />
        <path d="m8 13 4 4 4-4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="button-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function IconButton({ icon, label, className = "", ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <ButtonIcon name={icon} />
    </button>
  );
}
